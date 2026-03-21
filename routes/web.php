<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\BranchController;
use App\Http\Controllers\CounterController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\TagController;
use App\Http\Controllers\FeedbackController;
use App\Http\Controllers\Client\CounterSetupController;
use App\Http\Controllers\Client\ServicerActivationController;

// ────────────────────────────────────────────────────────────────────────────
// PUBLIC PAGES (No authentication required)
// ────────────────────────────────────────────────────────────────────────────

Route::get('/', function () {
    return Inertia::render('landing-page');
})->name('home');

// ────────────────────────────────────────────────────────────────────────────
// COUNTER DEVICE PAGES (Servicer/Counter setup flow)
// ────────────────────────────────────────────────────────────────────────────

Route::prefix('counter')
    ->name('counter.')
    ->group(function () {
        // Step 1-3: Counter device setup (QR code scanning → counter selection → PIN)
        Route::get('/setup', [CounterSetupController::class, 'show'])->name('setup');

        // Idle screen: Waiting for servicer to login
        Route::get('/idle', [CounterSetupController::class, 'idle'])->name('idle');

        // Servicer login page (shows form for email/password or QR verification)
        Route::get('/activate', [ServicerActivationController::class, 'show'])->name('activate');
    });

// ────────────────────────────────────────────────────────────────────────────
// ADMIN DASHBOARD & PAGES
// ────────────────────────────────────────────────────────────────────────────

Route::prefix('admin')
    ->name('admin.')
    ->group(function () {
        Route::get('/dashboard', function () {
            return Inertia::render('admin/dashboard');
        })->name('dashboard');

        // Admin pages (views for managing entities)
        Route::get('/users', [UserController::class, 'index'])->name('users.index');
        Route::get('/tags', [TagController::class, 'index'])->name('tags.index');
        Route::get('/branches', [BranchController::class, 'index'])->name('branches.index');
        Route::get('/counters', [CounterController::class, 'index'])->name('counters.index');
        Route::get('/feedback', [FeedbackController::class, 'index'])->name('feedback.index');
    });

// ────────────────────────────────────────────────────────────────────────────
// AUTHENTICATED PAGES (Require login)
// ────────────────────────────────────────────────────────────────────────────

Route::middleware(['auth'])->group(function () {
    Route::get('/dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');
});

// ────────────────────────────────────────────────────────────────────────────
// ADMIN API ROUTES (CRUD operations)
// ────────────────────────────────────────────────────────────────────────────

Route::middleware(['auth'])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {

        // Tags CRUD
        Route::post('/tags', [TagController::class, 'store'])->name('tags.store');
        Route::put('/tags/{tag}', [TagController::class, 'update'])->name('tags.update');
        Route::patch('/tags/{tag}/toggle', [TagController::class, 'toggle'])->name('tags.toggle');
        Route::delete('/tags/{tag}', [TagController::class, 'destroy'])->name('tags.destroy');

        // Branches CRUD
        Route::post('/branches', [BranchController::class, 'store'])->name('branches.store');
        Route::put('/branches/{branch}', [BranchController::class, 'update'])->name('branches.update');
        Route::patch('/branches/{branch}/toggle', [BranchController::class, 'toggle'])->name('branches.toggle');
        Route::delete('/branches/{branch}', [BranchController::class, 'destroy'])->name('branches.destroy');

        // Counters CRUD
        Route::post('/counters', [CounterController::class, 'store'])->name('counters.store');
        Route::put('/counters/{counter}', [CounterController::class, 'update'])->name('counters.update');
        Route::patch('/counters/{counter}/toggle', [CounterController::class, 'toggle'])->name('counters.toggle');
        Route::patch('/counters/{counter}/force-end-session', [CounterController::class, 'forceEndSession'])->name('counters.force-end-session');
        Route::delete('/counters/{counter}', [CounterController::class, 'destroy'])->name('counters.destroy');

        // Users CRUD
        Route::post('/users', [UserController::class, 'store'])->name('users.store');
        Route::put('/users/{user}', [UserController::class, 'update'])->name('users.update');
        Route::patch('/users/{user}/toggle', [UserController::class, 'toggle'])->name('users.toggle');
        Route::post('/users/{user}/generate-qr-token', [UserController::class, 'generateQrToken'])->name('users.generate-qr');
        Route::post('/users/{user}/revoke-qr-token', [UserController::class, 'revokeQrToken'])->name('users.revoke-qr-token');
        Route::post('/users/{user}/reset-password', [UserController::class, 'resetPassword'])->name('users.reset-password');
        Route::delete('/users/{user}', [UserController::class, 'destroy'])->name('users.destroy');
    });

// ────────────────────────────────────────────────────────────────────────────
// AUTHENTICATION ROUTES
// ────────────────────────────────────────────────────────────────────────────

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
// use App\Http\Controllers\Counter\CounterSetupController;
// use App\Http\Controllers\Counter\CounterFeedbackController;
// use App\Http\Controllers\Counter\ServicerActivationController;
// use App\Http\Controllers\Servicer\ServicerDashboardController;
// use App\Http\Controllers\Manager\ManagerDashboardController;
// use App\Http\Controllers\Admin\AdminDashboardController;
// use App\Http\Controllers\Admin\BranchController;
// use App\Http\Controllers\Admin\CounterController;
// use App\Http\Controllers\Admin\UserController;
// use App\Http\Controllers\Admin\TagController;
// use App\Http\Controllers\Admin\FeedbackController;
// use App\Http\Controllers\Admin\SystemSettingController;
// use Illuminate\Support\Facades\Route;

// /*
// |--------------------------------------------------------------------------
// | Web Routes
// |--------------------------------------------------------------------------
// |
// | All Inertia page routes live here.
// | API endpoints (JSON only) are in routes/api.php.
// |
// | Middleware groups:
// |   auth               → must be logged in
// |   role:servicer      → role === 'servicer'
// |   role:branch_manager → role === 'branch_manager'
// |   role:admin         → role === 'admin' OR 'super_admin'
// |   role:super_admin   → role === 'super_admin' only
// |
// | These middleware are registered in app/Http/Kernel.php (or bootstrap/app.php
// | in Laravel 12 without Kernel) using the RoleMiddleware class.
// |
// */

// // ─── Auth ─────────────────────────────────────────────────────────────────────

// Route::middleware('guest')->group(function () {
//     Route::get('/login',  [AuthController::class, 'showLogin'])->name('login');
//     Route::post('/login', [AuthController::class, 'login'])->name('login.post');
// });

// Route::post('/logout', [AuthController::class, 'logout'])
//     ->middleware('auth')
//     ->name('logout');

// // ─── Counter device (no login required — secured by device PIN) ───────────────

// /*
//  * These routes are intentionally public.
//  * Security is enforced at the counter level:
//  *   - /setup  → requires correct counter PIN
//  *   - /idle and /feedback → require valid device_token in X-Counter-Token header
//  *                           (validated in the DeviceTokenMiddleware on API calls)
//  */
// Route::prefix('counter')->name('counter.')->group(function () {
//     // Step 1–3: Device setup wizard
//     Route::get('/setup',    [CounterSetupController::class, 'show'])->name('setup');
//     Route::get('/idle',     [CounterSetupController::class, 'idle'])->name('idle');

//     // Feedback form shown to customers
//     Route::get('/feedback', [CounterFeedbackController::class, 'show'])->name('feedback');

//     // Servicer QR activation page (opens on servicer's phone)
//     Route::get('/activate', [ServicerActivationController::class, 'show'])->name('activate');
// });

// // ─── Servicer ─────────────────────────────────────────────────────────────────

// Route::middleware(['auth', 'role:servicer'])
//     ->prefix('servicer')
//     ->name('servicer.')
//     ->group(function () {
//         Route::get('/dashboard', [ServicerDashboardController::class, 'index'])
//             ->name('dashboard');
//     });

// // ─── Branch Manager ───────────────────────────────────────────────────────────

// Route::middleware(['auth', 'role:branch_manager'])
//     ->prefix('manager')
//     ->name('manager.')
//     ->group(function () {
//         Route::get('/dashboard', [ManagerDashboardController::class, 'index'])
//             ->name('dashboard');
//         Route::get('/feedback',  [FeedbackController::class, 'managerIndex'])
//             ->name('feedback');
//     });

// // ─── Admin ────────────────────────────────────────────────────────────────────

// Route::middleware(['auth', 'role:admin'])
//     ->prefix('admin')
//     ->name('admin.')
//     ->group(function () {
//         Route::get('/dashboard', [AdminDashboardController::class, 'index'])
//             ->name('dashboard');

//         // CRUD pages (Inertia renders)
//         Route::get('/branches', [BranchController::class, 'index'])->name('branches');
//         Route::get('/counters', [CounterController::class, 'index'])->name('counters');
//         Route::get('/users',    [UserController::class, 'index'])->name('users');
//         Route::get('/tags',     [TagController::class, 'index'])->name('tags');
//         Route::get('/feedback', [FeedbackController::class, 'adminIndex'])->name('feedback');

//         // System settings — Super Admin only
//         Route::get('/settings', [SystemSettingController::class, 'index'])
//             ->middleware('role:super_admin')
//             ->name('settings');
//     });

// // ─── Catch-all redirect ───────────────────────────────────────────────────────

// // Redirect authenticated users hitting "/" to their role-specific dashboard
// Route::get('/', function () {
//     if (!auth()->check()) {
//         return redirect()->route('login');
//     }
//     return match(auth()->user()->role) {
//         'super_admin'    => redirect()->route('admin.settings'),
//         'admin'          => redirect()->route('admin.dashboard'),
//         'branch_manager' => redirect()->route('manager.dashboard'),
//         'servicer'       => redirect()->route('servicer.dashboard'),
//         default          => redirect()->route('login'),
//     };
// });