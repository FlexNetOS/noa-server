/**
 * Password policy enforcement
 */

export interface PasswordPolicyConfig {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventCommon: boolean;
  preventUserInfo: boolean;
  preventReuse: number; // Number of previous passwords to check
  maxAge?: number; // Days before password expires
  minAge?: number; // Days before password can be changed again
}

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  strength: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';
  score: number; // 0-100
}

export class PasswordPolicy {
  private config: PasswordPolicyConfig;
  private commonPasswords: Set<string>;

  constructor(config: PasswordPolicyConfig) {
    this.config = config;
    this.commonPasswords = this.loadCommonPasswords();
  }

  /**
   * Validate password against policy
   */
  validate(
    password: string,
    userInfo?: { email?: string; username?: string; firstName?: string; lastName?: string }
  ): PasswordValidationResult {
    const errors: string[] = [];

    // Length check
    if (password.length < this.config.minLength) {
      errors.push(`Password must be at least ${this.config.minLength} characters long`);
    }

    if (password.length > this.config.maxLength) {
      errors.push(`Password must not exceed ${this.config.maxLength} characters`);
    }

    // Character requirements
    if (this.config.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (this.config.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (this.config.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (this.config.requireSpecialChars && !/[@$!%*?&#^()_+\-=[\]{}|;:'",.<>/?\\]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Common passwords check
    if (this.config.preventCommon && this.commonPasswords.has(password.toLowerCase())) {
      errors.push('Password is too common');
    }

    // User info check
    if (this.config.preventUserInfo && userInfo) {
      const userInfoValues = [
        userInfo.email?.split('@')[0],
        userInfo.username,
        userInfo.firstName,
        userInfo.lastName,
      ].filter(Boolean) as string[];

      for (const value of userInfoValues) {
        if (password.toLowerCase().includes(value.toLowerCase())) {
          errors.push('Password must not contain personal information');
          break;
        }
      }
    }

    // Calculate strength
    const { strength, score } = this.calculateStrength(password);

    return {
      valid: errors.length === 0,
      errors,
      strength,
      score,
    };
  }

  /**
   * Calculate password strength
   */
  calculateStrength(password: string): {
    strength: PasswordValidationResult['strength'];
    score: number;
  } {
    let score = 0;

    // Length score (up to 30 points)
    score += Math.min(password.length * 2, 30);

    // Character variety score (up to 40 points)
    if (/[a-z]/.test(password)) {
      score += 10;
    }
    if (/[A-Z]/.test(password)) {
      score += 10;
    }
    if (/\d/.test(password)) {
      score += 10;
    }
    if (/[@$!%*?&#^()_+\-=[\]{}|;:'",.<>/?\\]/.test(password)) {
      score += 10;
    }

    // Pattern complexity (up to 30 points)
    const uniqueChars = new Set(password).size;
    score += Math.min((uniqueChars / password.length) * 30, 30);

    // Penalties
    if (/(.)\1{2,}/.test(password)) {
      score -= 10;
    } // Repeated characters
    if (/^[a-z]+$/i.test(password)) {
      score -= 10;
    } // Only letters
    if (/^\d+$/.test(password)) {
      score -= 20;
    } // Only numbers
    if (/^(?:012|123|234|345|456|567|678|789|890|abc|bcd|cde|def)/.test(password.toLowerCase())) {
      score -= 15; // Sequential characters
    }

    // Normalize score to 0-100
    score = Math.max(0, Math.min(100, score));

    // Determine strength level
    let strength: PasswordValidationResult['strength'];
    if (score < 30) {
      strength = 'weak';
    } else if (score < 50) {
      strength = 'fair';
    } else if (score < 70) {
      strength = 'good';
    } else if (score < 90) {
      strength = 'strong';
    } else {
      strength = 'very-strong';
    }

    return { strength, score };
  }

  /**
   * Check if password has been reused
   */
  async checkReuse(password: string, previousHashes: string[]): Promise<boolean> {
    if (this.config.preventReuse === 0) {
      return false;
    }

    const { PasswordHasher } = await import('./PasswordHasher.js');
    const hasher = new PasswordHasher();

    const recentHashes = previousHashes.slice(-this.config.preventReuse);

    for (const hash of recentHashes) {
      if (await hasher.verify(password, hash)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if password has expired
   */
  isExpired(passwordChangedAt: Date): boolean {
    if (!this.config.maxAge) {
      return false;
    }

    const daysSinceChange = Math.floor(
      (Date.now() - passwordChangedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysSinceChange >= this.config.maxAge;
  }

  /**
   * Check if password can be changed (minimum age requirement)
   */
  canChangePassword(passwordChangedAt: Date): boolean {
    if (!this.config.minAge) {
      return true;
    }

    const daysSinceChange = Math.floor(
      (Date.now() - passwordChangedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysSinceChange >= this.config.minAge;
  }

  /**
   * Generate password suggestions
   */
  generatePassword(length: number = 16): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '@$!%*?&#^()_+-=[]{}|;:,.<>/?';

    let charset = '';
    let password = '';

    // Ensure all required character types are included
    if (this.config.requireLowercase) {
      charset += lowercase;
      password += lowercase[Math.floor(Math.random() * lowercase.length)];
    }

    if (this.config.requireUppercase) {
      charset += uppercase;
      password += uppercase[Math.floor(Math.random() * uppercase.length)];
    }

    if (this.config.requireNumbers) {
      charset += numbers;
      password += numbers[Math.floor(Math.random() * numbers.length)];
    }

    if (this.config.requireSpecialChars) {
      charset += special;
      password += special[Math.floor(Math.random() * special.length)];
    }

    // Fill remaining length
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }

    // Shuffle password
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }

  /**
   * Load common passwords list
   */
  private loadCommonPasswords(): Set<string> {
    // Top 100 most common passwords
    return new Set([
      '123456',
      'password',
      '12345678',
      'qwerty',
      '123456789',
      '12345',
      '1234',
      '111111',
      '1234567',
      'dragon',
      '123123',
      'baseball',
      'iloveyou',
      'trustno1',
      '1234567890',
      'sunshine',
      'master',
      'welcome',
      'shadow',
      'ashley',
      'football',
      'jesus',
      'michael',
      'ninja',
      'mustang',
      'password1',
      '123qwe',
      'admin',
      'letmein',
      'monkey',
      'passw0rd',
      'pass',
      'abc123',
      'qwertyuiop',
      'superman',
      'asdfghjkl',
      'computer',
      '1qaz2wsx',
      'charlie',
      'qwerty123',
      'password123',
      '111',
      'test',
      'dragon',
      'access',
      'batman',
      'killer',
      'freedom',
      'whatever',
      'secret',
      'samsung',
      '1q2w3e4r',
      'matrix',
      'lovely',
      'passw0rd',
      'zxcvbnm',
      'flower',
      'princess',
      'hello',
      'maggie',
      'summer',
      'internet',
      'cookie',
      'jordan',
      'taylor',
      'jessica',
      'daniel',
      'thomas',
      'michelle',
      'jackson',
      'joshua',
      'andrew',
      'alexander',
      'william',
      'bailey',
      'nicole',
      'amanda',
      'melissa',
      'matthew',
      'jennifer',
      'robert',
      'hunter',
      'soccer',
      'madison',
      'tigger',
      'buster',
      'butterfly',
      'pepper',
      'london',
      'charlie',
      'abcdef',
      'starwars',
      'mercedes',
      'starter',
      'redrum',
    ]);
  }
}
