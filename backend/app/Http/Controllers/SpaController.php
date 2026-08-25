<?php

namespace App\Http\Controllers;

use Illuminate\Contracts\View\View;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class SpaController extends Controller
{
    public function __invoke(): BinaryFileResponse|View
    {
        $spa = public_path('spa.html');

        if (is_file($spa)) {
            return response()->file($spa);
        }

        return view('welcome');
    }
}
