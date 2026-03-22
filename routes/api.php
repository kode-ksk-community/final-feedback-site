<?php

use App\Http\Controllers\Client\Countersetupcontroller;
use App\Http\Controllers\Client\CounterSessionController;
use App\Http\Controllers\Client\CounterFeedbackController;
use App\Http\Controllers\Client\Serviceractivationcontroller;
use App\Http\Controllers\BranchController;
use App\Http\Controllers\CounterController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\TagController;
use App\Http\Controllers\FeedbackController;
use Illuminate\Support\Facades\Route;

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API ROUTES (no authentication required)
// ─────────────────────────────────────────────────────────────────────────────

// Counter Device Setup (Step 1-3 of counter login flow)
Route::get('/branches/{branch}/counters', [Countersetupcontroller::class, 'counters']);
Route::post('/counter/activate-device', [Countersetupcontroller::class, 'activateDevice']);

// Servicer Activation (scanning counter QR code)
// Needs 'web' middleware to access Laravel session and check session ownership
Route::middleware('web', 'throttle:5,1')->get('/counter/activate-info', [Serviceractivationcontroller::class, 'info'])
    ->name('counter.activate-info');

// Session activation requires session middleware for Laravel session cookies
// Uses smart rate limiting: only rate limits unauthenticated guests, not logged-in users
Route::middleware('web', \App\Http\Middleware\ThrottleAuthenticatedActivation::class)
    ->post('/counter/activate-session', [Serviceractivationcontroller::class, 'activateSession'])
    ->name('counter.activate-session');

// Session logout - authenticated users (no rate limit)
Route::middleware('web')->post('/counter/session/end', [Serviceractivationcontroller::class, 'endSession'])
    ->name('counter.session.end');

// ─────────────────────────────────────────────────────────────────────────────
// COUNTER DEVICE API (requires device token)
// ─────────────────────────────────────────────────────────────────────────────

Route::middleware('device.token')->prefix('counter')->group(function () {
    // Session polling (called every 4 seconds by counter idle screen)
    Route::get('/session/status', [CounterSessionController::class, 'status']);

    // Feedback data and submission
    Route::get('/feedback-data', [FeedbackController::class, 'data']);
    Route::post('/feedback', [FeedbackController::class, 'store']);
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTICATED API ROUTES (staff only)
// ─────────────────────────────────────────────────────────────────────────────

Route::middleware('auth:sanctum,web')->group(function () {
    // Feedback analytics and reporting
    Route::get('/feedback/analytics', [FeedbackController::class, 'analytics']);
    Route::get('/feedback/top-tags', [FeedbackController::class, 'topTags']);
    Route::get('/feedback/servicer-performance', [FeedbackController::class, 'servicerPerformance']);
    Route::get('/feedback/counter-performance', [FeedbackController::class, 'counterPerformance']);
    Route::get('/feedback/trends', [FeedbackController::class, 'trends']);
    Route::get('/feedback', [FeedbackController::class, 'index']);
    Route::delete('/feedback/{feedback}', [FeedbackController::class, 'destroy']);

    // Admin dashboard stats endpoint (for dynamic dashboard)
    Route::middleware('role:admin')->get('/admin/stats', [\App\Http\Controllers\AdminDashboardController::class, 'stats']);

    // Servicer Dashboard API Routes - allows both session and token auth
    Route::middleware('can:access_servicer_page')->prefix('servicer')->group(function () {
        Route::get('/active-session', [\App\Http\Controllers\ServicerDashboardController::class, 'getActiveSession']);
        Route::post('/terminate-session/{session}', [\App\Http\Controllers\ServicerDashboardController::class, 'terminateSession']);
    });
});
//  *   counter:  { id, name, branch_name, branch_id }
//  * }
//  * Errors: 404 (invalid token), 403 (token expired/revoked), 409 (counter busy)
//  */
// Route::get('/counter/activate', [ServicerActivationController::class, 'validateToken']);

// /*
//  * POST /api/counter/activate
//  * Creates an active session on the counter for this servicer.
//  * Body: { token, counter_id }
//  * Response: { success: true, session_id: int }
//  * Errors: 409 (counter still busy) → includes idle_counters in response
//  */
// Route::post('/counter/activate', [ServicerActivationController::class, 'activate']);

// // ─── Authenticated Staff Routes (Sanctum) ────────────────────────────────────

// Route::middleware('auth:sanctum')->group(function () {

//     // ── Servicer ──────────────────────────────────────────────────────────────

//     Route::middleware('role:servicer')->prefix('servicer')->group(function () {

//         /*
//          * POST /api/servicer/logout-counter
//          * Ends the servicer's active counter session.
//          * Body: { reason: 'logout'|'terminate' }
//          */
//         Route::post('/logout-counter', [ServicerController::class, 'logoutCounter']);

//         /*
//          * GET /api/servicer/feedback
//          * Returns this servicer's own feedback records (paginated).
//          * Query: ?page=1&per_page=20&range=today|week|month
//          */
//         Route::get('/feedback', [ServicerController::class, 'feedback']);

//         /*
//          * GET /api/servicer/qr-token
//          * Returns the servicer's active QR token URL for display.
//          * Response: { token_url: string, qr_image_url: string }
//          */
//         Route::get('/qr-token', [ServicerController::class, 'qrToken']);
//     });

//     // ── Branch Manager ────────────────────────────────────────────────────────

//     Route::middleware('role:branch_manager')->prefix('manager')->group(function () {

//         /*
//          * GET /api/manager/stats
//          * Dashboard metrics for the manager's branch.
//          * Query: ?range=today|week|month|year&from=&to=
//          * Response: { total, avg_rating, growth, rating_dist, servicers, tags, feed }
//          */
//         Route::get('/stats', [ManagerController::class, 'stats']);

//         /*
//          * GET /api/manager/feedback
//          * Paginated feedback list with filters.
//          * Query: ?range&counter_id&servicer_id&rating&tag_ids[]&page&per_page
//          * Response: { data: FeedbackRow[], meta: PaginationMeta }
//          */
//         Route::get('/feedback', [ManagerController::class, 'feedback']);

//         /*
//          * GET /api/manager/export
//          * Download feedback as PDF/Excel/CSV.
//          * Query: ?format=pdf|excel|csv&range&...filters
//          */
//         Route::get('/export', [ManagerController::class, 'export']);

//         // Servicer CRUD (managers manage their own branch's servicers)
//         Route::apiResource('servicers', ManagerController::class . '@servicers')
//             ->only(['index', 'store', 'update', 'destroy']);

//         // Individual servicer routes
//         Route::prefix('servicers/{user}')->group(function () {
//             Route::patch('/toggle',      [ManagerController::class, 'toggleServicer']);
//             Route::post('/generate-qr',  [ManagerController::class, 'generateQr']);
//             Route::post('/reset-password', [ManagerController::class, 'resetPassword']);
//         });
//     });

//     // ── Admin ─────────────────────────────────────────────────────────────────

//     Route::middleware('role:admin')->prefix('admin')->group(function () {

//         // Dashboard stats
//         Route::get('/stats', [AdminDashboardController::class, 'stats']);

//         // Branches
//         Route::apiResource('branches', BranchController::class);
//         Route::patch('/branches/{branch}/toggle', [BranchController::class, 'toggle']);

//         // Counters
//         Route::apiResource('counters', CounterController::class);
//         Route::patch('/counters/{counter}/toggle',      [CounterController::class, 'toggle']);
//         Route::post('/counters/{counter}/force-end',    [CounterController::class, 'forceEndSession']);
//         Route::post('/counters/{counter}/regenerate-pin', [CounterController::class, 'regeneratePin']);

//         // Users
//         Route::apiResource('users', UserController::class);
//         Route::patch('/users/{user}/toggle',        [UserController::class, 'toggle']);
//         Route::post('/users/{user}/generate-qr',    [UserController::class, 'generateQr']);
//         Route::post('/users/{user}/reset-password', [UserController::class, 'resetPassword']);

//         // Tags
//         Route::apiResource('tags', TagController::class);
//         Route::patch('/tags/{tag}/toggle', [TagController::class, 'toggle']);

//         // Feedback (admin can see all branches)
//         Route::get('/feedback', [FeedbackController::class, 'adminList']);
//         Route::get('/export',   [FeedbackController::class, 'export']);

//         // System settings — Super Admin only
//         Route::middleware('role:super_admin')->group(function () {
//             Route::get('/settings',  [SystemSettingController::class, 'all']);
//             Route::post('/settings', [SystemSettingController::class, 'update']);
//             Route::post('/settings/upload-image', [SystemSettingController::class, 'uploadImage']);
//         });
//     });
// });