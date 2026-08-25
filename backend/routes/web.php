<?php

use App\Http\Controllers\SpaController;
use Illuminate\Support\Facades\Route;

Route::get('/', SpaController::class);
Route::get('/{any}', SpaController::class)->where('any', '^(?!api(?:/|$)|up$|sanctum(?:/|$)).*');
