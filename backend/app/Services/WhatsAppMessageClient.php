<?php

namespace App\Services;

use App\Support\GhanaPhone;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class WhatsAppMessageClient
{
    public function send(string $to, string $body): void
    {
        if ($this->usesCloud()) {
            $this->sendCloud($to, $body);

            return;
        }

        Log::channel('whatsapp')->info('whatsapp.message', [
            'from' => GhanaPhone::schoolAccount(),
            'from_display' => GhanaPhone::display(config('services.whatsapp.from_number')),
            'to' => $to,
            'body' => $body,
        ]);
    }

    public function usesCloud(): bool
    {
        return config('services.whatsapp.driver') === 'cloud'
            && filled(config('services.whatsapp.token'))
            && filled(config('services.whatsapp.phone_number_id'));
    }

    protected function sendCloud(string $to, string $body): void
    {
        $version = trim((string) config('services.whatsapp.version', 'v21.0'), '/');
        $phoneId = config('services.whatsapp.phone_number_id');
        $url = "https://graph.facebook.com/{$version}/{$phoneId}/messages";

        $response = Http::withToken((string) config('services.whatsapp.token'))
            ->timeout(15)
            ->acceptJson()
            ->asJson()
            ->post($url, [
                'messaging_product' => 'whatsapp',
                'to' => $to,
                'type' => 'text',
                'text' => [
                    'preview_url' => false,
                    'body' => $body,
                ],
            ]);

        if ($response->failed()) {
            $detail = $response->json('error.message') ?: $response->body();

            throw new RuntimeException(substr(trim((string) $detail), 0, 240) ?: 'WhatsApp Cloud API rejected the message.');
        }
    }
}
