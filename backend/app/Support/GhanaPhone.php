<?php

namespace App\Support;

class GhanaPhone
{
    public static function isValid(?string $raw): bool
    {
        return self::toWhatsApp($raw) !== null;
    }

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

    public static function display(?string $raw): ?string
    {
        $e164 = self::toWhatsApp($raw);

        return $e164 ? '0'.substr($e164, 3) : null;
    }

    public static function schoolAccount(): ?string
    {
        return self::toWhatsApp(config('services.whatsapp.from_number'));
    }

    public static function chatUrl(?string $raw, ?string $text = null): ?string
    {
        $e164 = self::toWhatsApp($raw);
        if (! $e164) {
            return null;
        }

        $url = 'https://wa.me/'.$e164;

        return ($text !== null && $text !== '') ? $url.'?text='.rawurlencode($text) : $url;
    }
}
