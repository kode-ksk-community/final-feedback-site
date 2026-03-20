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

Route::get('/', function () {
    return Inertia::render('landing-page');
})->name('home');
Route::get('/counter', function () {
    return Inertia::render('client/CounterSetup');
})->name('home');

Route::get('/waiting', function () {
    return Inertia::render('client/counter/Active');
});

Route::get('/feedback', function () {
    return Inertia::render('client/Customerfeedback');
});
Route::get('/servicer-activation', function () {
    return Inertia::render('client/Serviceractivation');
});



Route::get('/counter/setup', [CounterSetupController::class, 'show'])
    ->name('counter.setup');
Route::get('/counter/idle',  [CounterSetupController::class, 'idle'])
    ->name('counter.idle');

Route::get('/admin/dashboard', function () {
    return Inertia::render('admin/dashboard');
});

Route::post('/counter/activate-session', [ServicerActivationController::class, 'activateSession'])->middleware('web');

Route::get('counter/activate', [ServicerActivationController::class, 'show'])->name('activate');



Route::get('/admin/users', [UserController::class, 'index'])->name('admin.users.index');
Route::get('/admin/tags', [TagController::class, 'index'])->name('admin.tags.index');
Route::get('/admin/branches', [BranchController::class, 'index'])->name('admin.branches.index');
Route::get('/admin/counters', [CounterController::class, 'index'])->name('admin.counters.index');
Route::get('/admin/feedback', [FeedbackController::class, 'index'])->name('admin.feedback.index');

// Admin API routes for tags CRUD
Route::middleware(['auth'])->group(function () {
    Route::post('/admin/tags', [TagController::class, 'store'])->name('admin.tags.store');
    Route::put('/admin/tags/{tag}', [TagController::class, 'update'])->name('admin.tags.update');
    Route::patch('/admin/tags/{tag}/toggle', [TagController::class, 'toggle'])->name('admin.tags.toggle');
    Route::delete('/admin/tags/{tag}', [TagController::class, 'destroy'])->name('admin.tags.destroy');
});
Route::middleware(['auth'])->group(function () {
    Route::post('/admin/branches', [BranchController::class, 'store'])->name('admin.branches.store');
    Route::put('/admin/branches/{branch}', [BranchController::class, 'update'])->name('admin.branches.update');
    Route::patch('/admin/branches/{branch}/toggle', [BranchController::class, 'toggle'])->name('admin.branches.toggle');
    Route::delete('/admin/branches/{branch}', [BranchController::class, 'destroy'])->name('admin.branches.destroy');
});

// Admin API routes for counters CRUD
Route::middleware(['auth'])->group(function () {
    Route::post('/admin/counters', [CounterController::class, 'store'])->name('admin.counters.store');
    Route::put('/admin/counters/{counter}', [CounterController::class, 'update'])->name('admin.counters.update');
    Route::patch('/admin/counters/{counter}/toggle', [CounterController::class, 'toggle'])->name('admin.counters.toggle');
    Route::patch('/admin/counters/{counter}/force-end-session', [CounterController::class, 'forceEndSession'])->name('admin.counters.force-end-session');
    Route::delete('/admin/counters/{counter}', [CounterController::class, 'destroy'])->name('admin.counters.destroy');
});

// Admin API routes for users CRUD
Route::middleware(['auth'])->group(function () {
    Route::post('/admin/users', [UserController::class, 'store'])->name('admin.users.store');
    Route::put('/admin/users/{user}', [UserController::class, 'update'])->name('admin.users.update');
    Route::patch('/admin/users/{user}/toggle', [UserController::class, 'toggle'])->name('admin.users.toggle');
    Route::post('/admin/users/{user}/generate-qr-token', [UserController::class, 'generateQrToken'])->name('admin.users.generate-qr');
    Route::post('/admin/users/{user}/revoke-qr-token', [UserController::class, 'revokeQrToken'])->name('admin.users.revoke-qr-token');
    Route::post('/admin/users/{user}/reset-password', [UserController::class, 'resetPassword'])->name('admin.users.reset-password');
    Route::delete('/admin/users/{user}', [UserController::class, 'destroy'])->name('admin.users.destroy');
});

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');
});

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';


// <?php

// use App\Http\Controllers\Auth\AuthController;
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