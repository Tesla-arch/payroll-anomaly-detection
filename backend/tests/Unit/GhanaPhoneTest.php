<?php

namespace Tests\Unit;

use App\Support\GhanaPhone;
use PHPUnit\Framework\TestCase;

class GhanaPhoneTest extends TestCase
{
    public function test_local_ghana_mobile_becomes_whatsapp_e164(): void
    {
        $this->assertSame('233241111111', GhanaPhone::toWhatsApp('0241111111'));
        $this->assertSame('233241111111', GhanaPhone::toWhatsApp('+233 24 111 1111'));
        $this->assertSame('233241111111', GhanaPhone::toWhatsApp('233241111111'));
        $this->assertSame('233591723646', GhanaPhone::toWhatsApp('0591723646'));
        $this->assertSame('0591723646', GhanaPhone::display('0591723646'));
        $this->assertSame('0591723646', GhanaPhone::display('+233 59 172 3646'));
        $this->assertSame('https://wa.me/233241111111', GhanaPhone::chatUrl('0241111111'));
        $this->assertSame('https://wa.me/233241111111?text=Sports%20day', GhanaPhone::chatUrl('0241111111', 'Sports day'));
        $this->assertTrue(GhanaPhone::isValid('0241111111'));
        $this->assertTrue(GhanaPhone::isValid('+233 24 111 1111'));
    }

    public function test_blank_or_short_numbers_are_rejected(): void
    {
        $this->assertNull(GhanaPhone::toWhatsApp(null));
        $this->assertNull(GhanaPhone::toWhatsApp(''));
        $this->assertNull(GhanaPhone::toWhatsApp('12345'));
        $this->assertFalse(GhanaPhone::isValid(null));
        $this->assertFalse(GhanaPhone::isValid('not-a-phone'));
    }
}
