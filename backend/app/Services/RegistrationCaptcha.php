<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class RegistrationCaptcha
{
    public const TTL_SECONDS = 300;

    public function issue(): array
    {
        $code = $this->code();
        $id = (string) Str::uuid();
        Cache::put($this->key($id), strtolower($code), self::TTL_SECONDS);

        return [
            'id' => $id,
            'svg' => $this->svg($code),
            'expires_in' => self::TTL_SECONDS,
        ];
    }

    public function put(string $code): string
    {
        $id = (string) Str::uuid();
        Cache::put($this->key($id), strtolower($code), self::TTL_SECONDS);

        return $id;
    }

    public function verify(?string $id, ?string $answer): bool
    {
        if (! $id || $answer === null || $answer === '') {
            return false;
        }

        $expected = Cache::pull($this->key($id));
        if (! is_string($expected) || $expected === '') {
            return false;
        }

        return hash_equals($expected, strtolower(trim($answer)));
    }

    protected function key(string $id): string
    {
        return 'register-captcha:'.$id;
    }

    protected function code(): string
    {
        $alphabet = 'ACDEFGHJKMNPQRTUVWXYZ2346789';
        $code = '';
        for ($i = 0; $i < 5; $i++) {
            $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
        }

        return $code;
    }

    protected function svg(string $code): string
    {
        $chars = str_split($code);
        $glyphs = '';
        foreach ($chars as $index => $char) {
            $x = 22 + ($index * 28);
            $y = random_int(28, 38);
            $rotate = random_int(-18, 18);
            $glyphs .= sprintf(
                '<text x="%d" y="%d" transform="rotate(%d %d %d)" font-family="Georgia, serif" font-size="26" font-weight="700" fill="%s">%s</text>',
                $x,
                $y,
                $rotate,
                $x,
                $y,
                $index % 2 === 0 ? '#064e3b' : '#b45309',
                htmlspecialchars($char, ENT_XML1),
            );
        }

        $noise = '';
        for ($i = 0; $i < 6; $i++) {
            $noise .= sprintf(
                '<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="%s" stroke-width="1" opacity="0.45"/>',
                random_int(4, 40),
                random_int(6, 50),
                random_int(120, 176),
                random_int(6, 50),
                $i % 2 === 0 ? '#047857' : '#d97706',
            );
        }

        return '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="56" viewBox="0 0 180 56" role="img" aria-label="CAPTCHA">'
            .'<rect width="180" height="56" rx="10" fill="#f4f1ea"/>'
            .'<rect x="1" y="1" width="178" height="54" rx="9" fill="none" stroke="#d6d3d1"/>'
            .$noise
            .$glyphs
            .'</svg>';
    }
}
