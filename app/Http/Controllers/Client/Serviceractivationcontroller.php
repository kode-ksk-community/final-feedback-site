<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Counter;
use App\Models\CounterSession;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

/**
 * ServicerActivationController
 *
 * Handles the servicer login flow after scanning the COUNTER's QR code.
 *
 * ── New flow (counter QR) vs old flow (servicer QR) ──────────────────────────
 * OLD: Each servicer had a personal QR token → scanned to auto-activate
 * NEW: The counter displays its own QR → servicer scans → enters email/password
 *
 * The counter's QR encodes:
 *   /counter/activate?counter_token=<device_token>
 *
 * The device_token is already stored in the counter record (set during setup).
 * No servicer-specific tokens are needed anymore.
 *
 * Register in routes:
 *   // web.php
 *   Route::get('/counter/activate', [ServicerActivationController::class, 'show'])
 *        ->name('counter.activate');
 *
 *   // api.php — public, no auth needed
 *   Route::get('/counter/activate-info',     [ServicerActivationController::class, 'info']);
 *   Route::post('/counter/activate-session',  [ServicerActivationController::class, 'activateSession']);
 */
class Serviceractivationcontroller extends Controller
{
    /**
     * GET /counter/activate
     *
     * Renders the ServicerActivation.tsx Inertia page on the servicer's phone.
     * The page reads ?counter_token from the URL client-side and calls the API.
     */
    public function show(): InertiaResponse
    {
        return Inertia::render('client/counter/Activate');
    }

    /**
     * GET /api/counter/activate-info?counter_token=<token>
     *
     * Validates the counter token from the QR code and returns counter info.
     * Called by ServicerActivation.tsx on mount to show the confirm screen.
     *
     * Response 200:
     *   { counter: { id, name, branch_name, branch_id } }
     *
     * Response 404: counter not found / token invalid
     * Response 403: counter or branch is inactive
     * Response 409: counter is currently occupied
     *   { message, idle_counters: [{ id, name, description, device_token }] }
     *
     * Note: idle_counters includes device_token so the phone can redirect to
     *       a different counter's activation URL without going back to the counter.
     */
    public function info(Request $request): JsonResponse
    {
        $counterToken = $request->query('counter_token');

        Log::info($request->all());

        if (! $counterToken) {
            return response()->json(['message' => 'Counter token is required.'], 422);
        }

        // Find the counter by its device_token
        $counter = Counter::where('device_token', $counterToken)
            ->with('branch:id,name,is_active')
            ->first();

        if (! $counter) {
            return response()->json([
                'message' => 'Invalid QR code. This counter has not been set up or its QR has expired.',
            ], 404);
        }

        if (! $counter->is_active) {
            return response()->json([
                'message' => 'This counter is currently inactive. Please contact your manager.',
            ], 403);
        }

        if (! $counter->branch?->is_active) {
            return response()->json([
                'message' => 'This branch is currently inactive.',
            ], 403);
        }

        // Check if counter is already occupied
        if ($counter->isOccupied()) {
            // Return list of idle counters in the same branch so the servicer
            // can pick an available one without going back to the counter device
            $idleCounters = Counter::idle()
                ->active()
                ->where('branch_id', $counter->branch_id)
                ->where('id', '!=', $counter->id)
                ->whereNotNull('device_token') // only counters that have been set up
                ->select('id', 'name', 'description', 'device_token')
                ->get()
                ->map(fn($c) => [
                    'id'           => $c->id,
                    'name'         => $c->name,
                    'description'  => $c->description,
                    // Include device_token so the phone can build the activation URL
                    // for the chosen counter without returning to the counter device
                    'device_token' => $c->device_token,
                ]);

            return response()->json([
                'message'       => "{$counter->name} is currently occupied.",
                'idle_counters' => $idleCounters,
            ], 409);
        }

        return response()->json([
            'counter' => [
                'id'          => $counter->id,
                'name'        => $counter->name,
                'branch_name' => $counter->branch->name,
                'branch_id'   => $counter->branch_id,
            ],
        ]);
    }

    /**
     * POST /api/counter/activate-session
     *
     * Authenticates the servicer and creates an active session on the counter.
     *
     * Body:
     *   {
     *     "counter_token": "abc123...64chars",
     *     "email":         "sophea@company.com",
     *     "password":      "secret"
     *   }
     *
     * Validation rules:
     *   - email + password must match a User record with role=servicer
     *   - Servicer must belong to the SAME BRANCH as the counter
     *   - Servicer account must be active (is_active = true)
     *   - Counter must still be idle (race condition guard)
     *
     * Response 200: { success: true }
     *
     * Error responses:
     *   422 → wrong credentials or inactive account
     *   403 → servicer not assigned to this branch
     *   409 → counter became occupied between info check and login
     *         → includes idle_counters for redirect
     */
    /**
     * POST /api/counter/activate-session
     *
     * Smart auth-aware activation — two paths in one endpoint:
     *
     * PATH A — Servicer already has a Laravel session (previously logged in):
     *   Body: { counter_token }
     *   → No password needed — verifies role + branch match
     *   → Activates counter immediately
     *
     * PATH B — Servicer is a guest (first scan or session expired):
     *   Body: { counter_token, email, password }
     *   → Authenticates with credentials
     *   → Logs them into Laravel session (next scan = PATH A)
     *   → Activates counter
     *
     * Response 200:
     *   { success: true, servicer_name: string, already_logged_in: bool }
     *
     * Error responses:
     *   422 → wrong credentials, or guest missing email/password
     *   403 → wrong branch, wrong role, or inactive account
     *   409 → counter became occupied (race condition) + idle_counters list
     *   404 → counter token invalid
     */
    public function activateSession(Request $request): JsonResponse
    {
        Log::info('🔵 ActivateSession: Request received', [
            'ip' => $request->ip(),
            'data' => $request->only(['counter_token', 'email']),
        ]);

        $request->validate([
            'counter_token' => ['required', 'string'],
            'email'         => ['nullable', 'email'],
            'password'      => ['nullable', 'string'],
        ]);

        // ── Find the counter ────────────────────────────────────────────────
        $counter = Counter::where('device_token', $request->counter_token)
            ->where('is_active', true)
            ->with('branch')
            ->first();

        if (! $counter) {
            Log::warning('❌ Counter not found', [
                'token' => $request->counter_token,
            ]);

            return response()->json([
                'message' => 'Invalid or expired counter token.',
            ], 404);
        }

        Log::info('✅ Counter found', [
            'counter_id' => $counter->id,
            'counter_name' => $counter->name,
            'branch_id' => $counter->branch_id,
        ]);

        if (! $counter->branch?->is_active) {
            Log::warning('❌ Branch inactive', [
                'branch_id' => $counter->branch_id,
            ]);

            return response()->json([
                'message' => 'This branch is currently inactive.',
            ], 403);
        }

        // ── Resolve servicer ───────────────────────────────────────────────
        $alreadyLoggedIn = false;
        $servicer        = null;

        if (auth()->check()) {
            Log::info('🟢 PATH A: Already logged in');

            $authUser = auth()->user();

            Log::info('User info', [
                'user_id' => $authUser->id,
                'role' => $authUser->role,
                'branch_id' => $authUser->branch_id,
            ]);

            if ($authUser->role !== 'servicer') {
                Log::warning('❌ Invalid role', ['role' => $authUser->role]);

                return response()->json([
                    'message' => 'Only servicers can activate counters.',
                ], 403);
            }

            if (! $authUser->is_active) {
                Log::warning('❌ Inactive user', ['user_id' => $authUser->id]);

                return response()->json([
                    'message' => 'Your account is inactive.',
                ], 403);
            }

            if ($authUser->branch_id !== $counter->branch_id) {
                Log::warning('❌ Branch mismatch', [
                    'user_branch' => $authUser->branch_id,
                    'counter_branch' => $counter->branch_id,
                ]);

                return response()->json([
                    'message' => "You are assigned to a different branch.",
                ], 403);
            }

            $servicer        = $authUser;
            $alreadyLoggedIn = true;
        } else {
            Log::info('🟡 PATH B: Guest login');

            if (! $request->filled('email') || ! $request->filled('password')) {
                Log::warning('❌ Missing credentials');

                return response()->json([
                    'message'        => 'Please enter your credentials.',
                    'requires_login' => true,
                ], 422);
            }

            $candidate = User::where('email', $request->email)
                ->where('role', 'servicer') // ✅ FIXED
                ->where('is_active', true)
                ->first();

            $invalidMsg = 'Invalid email or password.';

            if (! $candidate) {
                Log::warning('❌ User not found', [
                    'email' => $request->email,
                ]);

                return response()->json(['message' => $invalidMsg], 422);
            }

            if (! Hash::check($request->password, $candidate->password)) {
                Log::warning('❌ Wrong password', [
                    'email' => $request->email,
                ]);

                return response()->json(['message' => $invalidMsg], 422);
            }

            if ($candidate->branch_id !== $counter->branch_id) {
                Log::warning('❌ Branch mismatch (guest)', [
                    'user_branch' => $candidate->branch_id,
                    'counter_branch' => $counter->branch_id,
                ]);

                return response()->json([
                    'message' => "Your account is not assigned to {$counter->branch->name}.",
                ], 403);
            }

            Log::info('✅ Login success', [
                'user_id' => $candidate->id,
            ]);

            // ✅ SESSION WORKS NOW (web middleware)
            auth()->login($candidate, true);
            $request->session()->regenerate();

            Log::info('🧠 Session regenerated', [
                'has_session' => $request->hasSession(),
            ]);

            $servicer = $candidate;
        }

        // ── Race condition guard ────────────────────────────────────────────
        if ($counter->isOccupied()) {
            Log::warning('❌ Counter already occupied', [
                'counter_id' => $counter->id,
            ]);

            return response()->json([
                'message'       => "{$counter->name} was just taken.",
                'idle_counters' => $this->getIdleCounters($counter),
            ], 409);
        }

        // ── Create session ──────────────────────────────────────────────────
        $session = CounterSession::create([
            'counter_id' => $counter->id,
            'user_id'    => $servicer->id,
            'started_at' => now(),
            'device_ip'  => $request->ip(),
        ]);

        Log::info('🎉 Counter session created', [
            'session_id' => $session->id,
            'counter_id' => $counter->id,
            'user_id' => $servicer->id,
        ]);

        return response()->json([
            'success'           => true,
            'servicer_name'     => $servicer->name,
            'already_logged_in' => $alreadyLoggedIn,
        ]);
    }

    /**
     * Returns idle counters in the same branch for 409 busy responses.
     * Includes device_token so the phone can build the correct activation URL.
     */
    private function getIdleCounters(Counter $counter): \Illuminate\Support\Collection
    {
        return Counter::idle()
            ->active()
            ->where('branch_id', $counter->branch_id)
            ->where('id', '!=', $counter->id)
            ->whereNotNull('device_token')
            ->select('id', 'name', 'description', 'device_token')
            ->get()
            ->map(fn($c) => [
                'id'           => $c->id,
                'name'         => $c->name,
                'description'  => $c->description,
                'device_token' => $c->device_token,
            ]);
    }
}
