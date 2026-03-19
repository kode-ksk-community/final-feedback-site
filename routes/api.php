<?php

use App\Http\Controllers\Counter\CounterSetupController;
use App\Http\Controllers\Counter\CounterSessionController;
use App\Http\Controllers\Counter\CounterFeedbackController;
use App\Http\Controllers\Counter\ServicerActivationController;
use App\Http\Controllers\Servicer\ServicerController;
use App\Http\Controllers\Manager\ManagerController;
use App\Http\Controllers\Admin\BranchController;
use App\Http\Controllers\Admin\CounterController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\TagController;
use App\Http\Controllers\Admin\FeedbackController;
use App\Http\Controllers\Admin\SystemSettingController;
use App\Http\Controllers\Client\CounterSessionController as ClientCounterSessionController;
use App\Http\Controllers\Client\CounterSetupController as ClientCounterSetupController;
use App\Http\Controllers\Client\ServicerActivationController as ClientServicerActivationController;
use Illuminate\Support\Facades\Route;


Route::get('/branches/{branch}/counters', [ClientCounterSetupController::class, 'counters']);
Route::post('/counter/activate-device',   [ClientCounterSetupController::class, 'activateDevice']);
Route::get('/counter/session/status', [ClientCounterSessionController::class, 'status']);
Route::get('/counter/activate-info',    [ClientServicerActivationController::class, 'info']);
Route::post('/counter/activate-session', [ClientServicerActivationController::class, 'activateSession'])->middleware('web');
// /*
// |--------------------------------------------------------------------------
// | API Routes
// |--------------------------------------------------------------------------
// |
// | All routes here return JSON.
// | Prefix: /api  (set in bootstrap/app.php or RouteServiceProvider)
// |
// | Custom middleware used:
// |   device.token   → validates X-Counter-Token header against counters.device_token
// |   auth:sanctum   → standard Laravel Sanctum token auth for staff
// |   role:X         → checks authenticated user's role
// |
// */

// // ─── Counter Device Setup (no auth, no device token) ─────────────────────────

// /*
//  * GET /api/branches/{branch}/counters
//  * Used by CounterSetup.tsx Step 2 to load counters after branch selection.
//  */
// Route::get('/branches/{branch}/counters', [CounterSetupController::class, 'counters']);

// /*
//  * POST /api/counter/activate-device
//  * Verifies PIN and issues device_token.
//  * Body: { counter_id, pin }
//  */
// Route::post('/counter/activate-device', [CounterSetupController::class, 'activateDevice']);

// // ─── Counter Device (requires valid device_token header) ─────────────────────

// /*
//  * All routes in this group require the X-Counter-Token header.
//  * The DeviceTokenMiddleware validates it against counters.device_token
//  * and attaches the Counter model to the request as $request->counter.
//  */
// Route::middleware('device.token')->prefix('counter')->group(function () {

//     /*
//      * GET /api/counter/session/status
//      * Polled every 4s by CounterIdle.tsx to detect when a servicer activates.
//      * Response: {
//      *   active: bool,
//      *   session?: { id, servicer_name, started_at }
//      * }
//      */
//     Route::get('/session/status', [CounterSessionController::class, 'status']);

//     /*
//      * GET /api/counter/feedback-data
//      * Called by CounterFeedback.tsx on mount to load servicer + tags.
//      * Response: {
//      *   servicer: { id, name, avatar_url },
//      *   tags: Tag[]
//      * }
//      */
//     Route::get('/feedback-data', [CounterFeedbackController::class, 'data']);

//     /*
//      * POST /api/feedback
//      * Anonymous customer feedback submission.
//      * Body: { rating, tag_ids?, comment? }
//      * Response: { success: true, message: string }
//      */
//     Route::post('/submit-feedback', [CounterFeedbackController::class, 'store']);
// });

// // ─── Servicer QR Activation (no auth — token in query string) ────────────────

// /*
//  * GET /api/counter/activate?token={qr_token}
//  * Called by ServicerActivation.tsx on mount to validate the QR token.
//  * Response: {
//  *   servicer: { id, name },
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