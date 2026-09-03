<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ $notice->subject }}</title>
</head>
<body style="margin:0;padding:24px;background:#f4f1ea;font-family:Segoe UI,system-ui,sans-serif;color:#1e293b;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
        <tr>
            <td style="background:#022c22;color:#ecfdf5;padding:20px 24px;">
                <p style="margin:0;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#fbbf24;">School Management System</p>
                <h1 style="margin:6px 0 0;font-size:20px;">{{ $notice->type === 'meeting' ? 'Parent meeting' : 'Message from the school' }}</h1>
            </td>
        </tr>
        <tr>
            <td style="padding:24px;">
                <p style="margin:0 0 12px;">Dear {{ $guardian->name }},</p>
                @if($guardian->children->isNotEmpty())
                    <p style="margin:0 0 16px;color:#64748b;font-size:14px;">
                        Regarding:
                        {{ $guardian->children->map(fn ($child) => $child->display_name)->join(', ') }}
                    </p>
                @endif
                @if($notice->type === 'meeting' && $notice->meeting_at)
                    <p style="margin:0 0 16px;padding:12px 16px;background:#ecfdf5;border-radius:12px;font-size:14px;">
                        <strong>When:</strong> {{ $notice->meeting_at->timezone(config('app.timezone'))->format('l, j F Y · H:i') }}<br>
                        <strong>Where:</strong> {{ $notice->meeting_venue ?: 'School compound' }}
                    </p>
                @endif
                <div style="font-size:15px;line-height:1.6;white-space:pre-wrap;">{{ $notice->body }}</div>
                <p style="margin:24px 0 0;font-size:13px;color:#64748b;">
                    Please contact the school office
                    @if(config('mail.from.address'))
                        at <a href="mailto:{{ config('mail.from.address') }}" style="color:#065f46;">{{ config('mail.from.address') }}</a>
                    @endif
                    if you cannot attend or need a follow-up.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
