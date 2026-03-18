<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\BranchController;
use App\Http\Controllers\CounterController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\TagController;

Route::get('/', function () {
    return Inertia::render('landing-page');
})->name('home');
Route::get('/counter', function () {
    return Inertia::render('client/CounterSetup');
})->name('home');

Route::get('/waiting', function () {
    return Inertia::render('client/Idle');
});

Route::get('/feedback', function () {
    return Inertia::render('client/Customerfeedback');
});
Route::get('/servicer-activation', function () {
    return Inertia::render('client/Serviceractivation');
});





Route::get('/admin/dashboard', function () {
    return Inertia::render('admin/dashboard');
});
Route::get('/admin/users', [UserController::class, 'index'])->name('admin.users.index');
Route::get('/admin/tags', [TagController::class, 'index'])->name('admin.tags.index');
Route::get('/admin/branches', [BranchController::class, 'index'])->name('admin.branches.index');
Route::get('/admin/counters', [CounterController::class, 'index'])->name('admin.counters.index');

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
