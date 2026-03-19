<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Counter;
use App\Models\CounterSession;
use App\Models\ServicerQrToken;
use App\Models\Feedback;
use App\Models\Tag;
use App\Services\SentimentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

// ─────────────────────────────────────────────────────────────────────────────
// CounterSessionController
// Handles session polling and servicer logout from the counter device.
// ─────────────────────────────────────────────────────────────────────────────

class CounterSessionController extends Controller
{
    /**
     * GET /api/counter/session/status
     * Middleware: device.token
     *
     * Polled every 4 seconds by CounterIdle.tsx.
     * Returns whether there is currently an active servicer session on this counter.
     *
     * The counter device uses this to know when to switch from the idle screen
     * to the live feedback form.
     *
     * Response when idle:
     *   { active: false }
     *
     * Response when a servicer has activated:
     *   {
     *     active: true,
     *     session: {
     *       id: 1,
     *       servicer_name: "Sophea Chan",
     *       started_at: "2024-12-20T09:12:00.000Z"
     *     }
     *   }
     */
    public function status(Request $request)
    {

        Log::info($request->all());
        
        // /** @var Counter $counter */
        // $counter = $request->attributes->get('counter');

        // $session = $counter->sessions()
        //     ->whereNull('ended_at')
        //     ->with('servicer:id,name')
        //     ->latest('started_at')
        //     ->first();

        // if (! $session) {
        //     return response()->json(['active' => false]);
        // }

        // return response()->json([
        //     'active'  => true,
        //     'session' => [
        //         'id'           => $session->id,
        //         'servicer_name' => $session->servicer->name,
        //         'started_at'   => $session->started_at->toISOString(),
        //     ],
        // ]);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ServicerActivationController
// Handles the servicer QR scan flow on the servicer's phone.
// ─────────────────────────────────────────────────────────────────────────────

class ServicerActivationController extends Controller
{
    /**
     * GET /counter/activate
     *
     * Renders the ServicerActivation Inertia page (shown on servicer's phone).
     * The page reads the ?token= query param client-side and calls the API.
     */
    public function show(): InertiaResponse
    {
        return Inertia::render('Counter/Activate');
    }

    /**
     * GET /api/counter/activate?token={qr_token}
     *
     * Validates the QR token and returns the servicer + counter info.
     * Called by ServicerActivation.tsx on page load to show the confirm screen.
     *
     * The QR token URL format: /counter/activate?token=<64char_token>
     *
     * Possible responses:
     *   200 → { servicer: {...}, counter: {...} }  — show confirm screen
     *   404 → token not found or invalid
     *   403 → token expired or revoked
     *   409 → counter is currently occupied → includes idle_counters
     */
    public function validateToken(Request $request): JsonResponse
    {
        $token = $request->query('token');

        if (! $token) {
            return response()->json(['message' => 'Token is required.'], 422);
        }

        // Find the QR token and load the servicer
        $qrToken = ServicerQrToken::where('token', $token)
            ->with('servicer.branch')
            ->first();

        if (! $qrToken) {
            return response()->json(['message' => 'Invalid QR code.'], 404);
        }

        if (! $qrToken->isValid()) {
            return response()->json([
                'message' => 'This QR code has expired or been revoked. Please contact your manager.',
            ], 403);
        }

        // We don't know which counter yet — the URL just has the servicer's token.
        // The counter_id is sent separately in the POST /activate call.
        // For now, we return the servicer info so the page can show a welcome screen.
        // The counter info comes from the query string (?counter_id=X) if the
        // counter device passed it when opening the QR URL, or the servicer picks manually.

        $counterId = $request->query('counter_id');
        $counter   = null;

        if ($counterId) {
            $counter = Counter::with('branch')
                ->where('id', $counterId)
                ->where('is_active', true)
                ->first();
        }

        // Check if the target counter is occupied
        if ($counter && $counter->isOccupied()) {
            // Return occupied error + list of idle counters in the same branch
            $idleCounters = Counter::idle()
                ->active()
                ->where('branch_id', $qrToken->servicer->branch_id)
                ->where('id', '!=', $counter->id)
                ->select('id', 'name', 'description')
                ->get();

            return response()->json([
                'message'       => "{$counter->name} is currently occupied.",
                'idle_counters' => $idleCounters,
            ], 409);
        }

        // Mark QR token as used (updates last_used_at for audit)
        $qrToken->markAsUsed();

        return response()->json([
            'servicer' => [
                'id'   => $qrToken->servicer->id,
                'name' => $qrToken->servicer->name,
                'role' => $qrToken->servicer->role,
            ],
            'counter' => $counter ? [
                'id'          => $counter->id,
                'name'        => $counter->name,
                'branch_name' => $counter->branch->name,
                'branch_id'   => $counter->branch_id,
            ] : null,
        ]);
    }

    /**
     * POST /api/counter/activate
     *
     * Creates an active session linking the servicer to the counter.
     * Called when the servicer taps "Activate Counter" on their phone.
     *
     * Body: { token: string, counter_id: int }
     *
     * On success: the counter device polling /api/counter/session/status
     * will detect the new session within 4 seconds and switch to feedback mode.
     *
     * Response: { success: true, session_id: int }
     * Error 409: { message: "...", idle_counters: [...] }
     */
    public function activate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token'      => ['required', 'string'],
            'counter_id' => ['required', 'integer', 'exists:counters,id'],
        ]);

        // Re-validate the QR token
        $qrToken = ServicerQrToken::where('token', $validated['token'])
            ->with('servicer')
            ->first();

        if (! $qrToken || ! $qrToken->isValid()) {
            return response()->json(['message' => 'Invalid or expired QR token.'], 403);
        }

        $counter = Counter::with('branch')
            ->findOrFail($validated['counter_id']);

        // Final occupancy check — someone else might have activated between the GET and POST
        if ($counter->isOccupied()) {
            $idleCounters = Counter::idle()
                ->active()
                ->where('branch_id', $qrToken->servicer->branch_id)
                ->where('id', '!=', $counter->id)
                ->select('id', 'name', 'description')
                ->get();

            return response()->json([
                'message'       => "{$counter->name} is currently occupied by another servicer.",
                'idle_counters' => $idleCounters,
            ], 409);
        }

        // Ensure servicer belongs to the same branch as the counter
        if ($qrToken->servicer->branch_id !== $counter->branch_id) {
            return response()->json([
                'message' => 'You cannot activate a counter in a different branch.',
            ], 403);
        }

        // Create the active session
        $session = CounterSession::create([
            'counter_id' => $counter->id,
            'user_id'    => $qrToken->servicer->id,
            'started_at' => now(),
            'device_ip'  => $request->ip(),
        ]);

        $qrToken->markAsUsed();

        return response()->json([
            'success'    => true,
            'session_id' => $session->id,
        ]);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CounterFeedbackController
// Serves the feedback page and handles anonymous customer submissions.
// ─────────────────────────────────────────────────────────────────────────────

class CounterFeedbackController extends Controller
{
    public function __construct(
        private readonly SentimentService $sentimentService
    ) {}

    /**
     * GET /counter/feedback
     *
     * Renders the CustomerFeedback Inertia page.
     * The page itself calls GET /api/counter/feedback-data on mount.
     */
    public function show(): InertiaResponse
    {
        return Inertia::render('Counter/Feedback');
    }

    /**
     * GET /api/counter/feedback-data
     * Middleware: device.token
     *
     * Returns the data needed to render the feedback form:
     * - The currently active servicer (from the active session)
     * - Available tags (global + branch-specific)
     *
     * If no active session exists, returns 404 so the frontend
     * can redirect back to the idle screen.
     */
    public function data(Request $request): JsonResponse
    {
        /** @var Counter $counter */
        $counter = $request->attributes->get('counter');

        // Get the active session
        $session = $counter->activeSession()->with('servicer:id,name,avatar')->first();

        if (! $session) {
            return response()->json([
                'message'  => 'No active session on this counter.',
                'redirect' => '/counter/idle',
            ], 404);
        }

        // Get tags: global (branch_id = null) + branch-specific
        $tags = Tag::active()
            ->availableForBranch($counter->branch_id)
            ->ordered()
            ->select('id', 'name', 'name_kh', 'color', 'icon', 'sentiment', 'sort_order')
            ->get();

        return response()->json([
            'servicer' => [
                'id'         => $session->servicer->id,
                'name'       => $session->servicer->name,
                'avatar_url' => $session->servicer->avatar_url,
            ],
            'tags'       => $tags,
            'session_id' => $session->id,
        ]);
    }

    /**
     * POST /api/counter/submit-feedback
     * Middleware: device.token
     *
     * Stores anonymous customer feedback.
     * No login required — identified by device_token only.
     *
     * Body: {
     *   rating:   int (1-5),
     *   tag_ids:  int[] (optional),
     *   comment:  string (optional, max 300 chars)
     * }
     *
     * Response: { success: true }
     */
    public function store(Request $request): JsonResponse
    {
        /** @var Counter $counter */
        $counter = $request->attributes->get('counter');

        // Ensure there's an active session to attach the feedback to
        $session = $counter->activeSession()->with('servicer')->first();

        if (! $session) {
            return response()->json([
                'message'  => 'No active session. Counter may have been deactivated.',
                'redirect' => '/counter/idle',
            ], 422);
        }

        $validated = $request->validate([
            'rating'    => ['required', 'integer', 'min:1', 'max:5'],
            'tag_ids'   => ['nullable', 'array', 'max:10'],
            'tag_ids.*' => ['integer', 'exists:tags,id'],
            'comment'   => ['nullable', 'string', 'max:300'],
        ]);

        // Create feedback record
        $feedback = Feedback::create([
            'counter_id'         => $counter->id,
            'counter_session_id' => $session->id,
            'servicer_id'        => $session->servicer->id,
            'branch_id'          => $counter->branch_id,
            'rating'             => $validated['rating'],
            'comment'            => $validated['comment'] ?? null,
            'submitted_ip'       => $request->ip(),
        ]);

        // Attach tags
        if (! empty($validated['tag_ids'])) {
            $feedback->tags()->attach($validated['tag_ids']);
        }

        // Calculate sentiment score (loads tags relation first for accuracy)
        $feedback->load('tags');
        $feedback->calculateSentiment();

        return response()->json(['success' => true]);
    }
}