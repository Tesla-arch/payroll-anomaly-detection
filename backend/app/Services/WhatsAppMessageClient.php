<?php

namespace App\Services;

use App\Support\GhanaPhone;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class WhatsAppMessageClient
{
    protected ?bool $greenAuthorized = null;

    public function send(string $to, string $body): void
    {
        match ($this->driver()) {
            'cloud' => $this->sendCloud($to, $body),
            'green_api' => $this->sendGreenApi($to, $body),
            default => $this->sendLog($to, $body),
        };
    }

    public function driver(): string
    {
        $driver = strtolower(trim((string) config('services.whatsapp.driver', 'log')));

        return in_array($driver, ['log', 'cloud', 'green_api'], true) ? $driver : 'log';
    }

    public function isLive(): bool
    {
        return match ($this->driver()) {
            'cloud' => filled(config('services.whatsapp.token')) && filled(config('services.whatsapp.phone_number_id')),
            'green_api' => filled(config('services.whatsapp.green_api_instance')) && filled(config('services.whatsapp.green_api_token')),
            default => false,
        };
    }

    /**
     * @return array{driver: string, live: bool, from: ?string}
     */
    public function status(): array
    {
        return [
            'driver' => $this->driver(),
            'live' => $this->isLive(),
            'from' => GhanaPhone::display(config('services.whatsapp.from_number')),
        ];
    }

    protected function sendLog(string $to, string $body): void
    {
        Log::channel('whatsapp')->info('whatsapp.message', [
            'from' => GhanaPhone::schoolAccount(),
            'from_display' => GhanaPhone::display(config('services.whatsapp.from_number')),
            'to' => $to,
            'body' => $body,
        ]);
    }

    protected function sendCloud(string $to, string $body): void
    {
        $token = trim((string) config('services.whatsapp.token'));
        $phoneId = trim((string) config('services.whatsapp.phone_number_id'));

        if ($token === '' || $phoneId === '') {
            throw new RuntimeException('WhatsApp Cloud is not configured. Add WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID.');
        }

        $version = trim((string) config('services.whatsapp.version', 'v21.0'), '/');
        $url = "https://graph.facebook.com/{$version}/{$phoneId}/messages";

        $response = Http::withToken($token)
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

    protected function sendGreenApi(string $to, string $body): void
    {
        $instance = trim((string) config('services.whatsapp.green_api_instance'));
        $token = trim((string) config('services.whatsapp.green_api_token'));

        if ($instance === '' || $token === '') {
            throw new RuntimeException('Green API is not configured. Add GREEN_API_INSTANCE_ID and GREEN_API_TOKEN, then scan the QR with the school WhatsApp.');
        }

        $host = rtrim((string) config('services.whatsapp.green_api_url', 'https://api.green-api.com'), '/');
        $this->assertGreenApiAuthorized($host, $instance, $token);

        $url = "{$host}/waInstance{$instance}/sendMessage/{$token}";

        $response = Http::timeout(20)
            ->acceptJson()
            ->asJson()
            ->post($url, [
                'chatId' => $to.'@c.us',
                'message' => $body,
            ]);

        if ($response->failed() || $response->json('error') === true || blank($response->json('idMessage'))) {
            $detail = $response->json('message')
                ?: $response->json('errorMessage')
                ?: $response->body();

            throw new RuntimeException(substr(trim((string) $detail), 0, 240) ?: 'Green API rejected the WhatsApp message.');
        }
    }

    protected function assertGreenApiAuthorized(string $host, string $instance, string $token): void
    {
        if ($this->greenAuthorized === true) {
            return;
        }

        $response = Http::timeout(15)
            ->acceptJson()
            ->get("{$host}/waInstance{$instance}/getStateInstance/{$token}");

        $state = (string) $response->json('stateInstance');
        if ($state === 'authorized') {
            $this->greenAuthorized = true;

            return;
        }

        $from = GhanaPhone::display(config('services.whatsapp.from_number')) ?: 'the school WhatsApp';

        throw new RuntimeException(
            $state === 'notAuthorized' || $state === ''
                ? "Green API is not linked yet. On {$from} open WhatsApp → Linked devices → Link a device, then scan the Green API QR."
                : 'Green API WhatsApp state is '.$state.'.'
        );
    }
}
