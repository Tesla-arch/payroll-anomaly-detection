<?php

namespace App\Support;

class GhanaPhone
{
    public static function toWhatsApp(?string $raw): ?string
    {
        $digits = preg_replace('/\D+/', '', (string) $raw) ?? '';
        if ($digits === '') {
            return null;
        }

        if (str_starts_with($digits, '00')) {
            $digits = substr($digits, 2);
        }

        if (str_starts_with($digits, '233')) {
            return strlen($digits) === 12 ? $digits : null;
        }

        if (str_starts_with($digits, '0')) {
            $digits = substr($digits, 1);
        }

        return strlen($digits) === 9 ? '233'.$digits : null;
    }
}
