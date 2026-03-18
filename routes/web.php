<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('client/CounterSetup');
    // return Inertia::render('welcome');
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
    return Inertia::render('admin/Managerdashboard');
});

Route::get('/admin/users', function () {
    return Inertia::render('admin/users');
});
Route::get('/admin/tags', function () {
    return Inertia::render('admin/tags');
});
Route::get('/admin/branches', function () {
    return Inertia::render('admin/branches');
});
Route::get('/admin/counters', function () {
    return Inertia::render('admin/counters');
});

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
