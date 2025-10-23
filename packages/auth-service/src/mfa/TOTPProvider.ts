/**
 * Time-based One-Time Password (TOTP) Provider
 * Compatible with Google Authenticator, Authy, etc.
 */

import QRCode from 'qrcode';
import speakeasy from 'speakeasy';

import { MFASetup } from '../types/index.js';
import { generateBackupCodes, hashBackupCode } from '../utils/crypto.js';

export interface TOTPConfig {
  issuer: string;
  window: number; // Number of time steps to check (default 1 = ±30 seconds)
  step: number; // Time step in seconds (default 30)
  digits: number; // Number of digits (default 6)
}

export class TOTPProvider {
  private config: TOTPConfig;

  constructor(config: Partial<TOTPConfig> = {}) {
    this.config = {
      issuer: config.issuer || 'Noa Server',
      window: config.window || 1,
      step: config.step || 30,
      digits: config.digits || 6,
    };
  }

  /**
   * Generate TOTP secret and setup data
   */
  async generateSecret(userEmail: string): Promise<MFASetup> {
    // Generate base32-encoded secret
    const secret = speakeasy.generateSecret({
      name: `${this.config.issuer} (${userEmail})`,
      issuer: this.config.issuer,
      length: 32,
    });

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

    // Generate backup codes
    const backupCodes = generateBackupCodes(10);

    return {
      secret: secret.base32,
      qrCode,
      backupCodes,
    };
  }

  /**
   * Verify TOTP code
   */
  verifyCode(secret: string, code: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: this.config.window,
      step: this.config.step,
      digits: this.config.digits,
    });
  }

  /**
   * Generate current TOTP code (for testing/debugging)
   */
  generateCode(secret: string): string {
    return speakeasy.totp({
      secret,
      encoding: 'base32',
      step: this.config.step,
      digits: this.config.digits,
    });
  }

  /**
   * Get time remaining until code expires
   */
  getTimeRemaining(): number {
    const now = Math.floor(Date.now() / 1000);
    const step = this.config.step;
    return step - (now % step);
  }

  /**
   * Validate TOTP code format
   */
  validateCodeFormat(code: string): boolean {
    const regex = new RegExp(`^\\d{${this.config.digits}}$`);
    return regex.test(code);
  }

  /**
   * Verify backup code
   */
  verifyBackupCode(
    code: string,
    hashedBackupCodes: string[]
  ): { valid: boolean; codeIndex: number } {
    const normalizedCode = code.replace(/\s|-/g, '').toUpperCase();
    const hash = hashBackupCode(normalizedCode);

    const codeIndex = hashedBackupCodes.indexOf(hash);

    return {
      valid: codeIndex !== -1,
      codeIndex,
    };
  }

  /**
   * Get TOTP URI for manual entry
   */
  getTOTPUri(secret: string, userEmail: string): string {
    return (
      `otpauth://totp/${encodeURIComponent(this.config.issuer)}:${encodeURIComponent(userEmail)}?` +
      `secret=${secret}&issuer=${encodeURIComponent(this.config.issuer)}&` +
      `digits=${this.config.digits}&period=${this.config.step}`
    );
  }

  /**
   * Calculate drift between server and client time
   */
  calculateDrift(secret: string, code: string): number | null {
    for (let drift = -this.config.window; drift <= this.config.window; drift++) {
      const valid = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: code,
        window: 0,
        step: this.config.step,
        digits: this.config.digits,
        counter: Math.floor(Date.now() / 1000 / this.config.step) + drift,
      });

      if (valid) {
        return drift * this.config.step;
      }
    }

    return null;
  }

  /**
   * Generate recovery codes as QR code
   */
  async generateRecoveryCodesQR(backupCodes: string[]): Promise<string> {
    const text =
      `Recovery Codes for ${this.config.issuer}\n\n` +
      backupCodes.join('\n') +
      '\n\nStore these codes in a safe place. Each code can only be used once.';

    return await QRCode.toDataURL(text);
  }
}
