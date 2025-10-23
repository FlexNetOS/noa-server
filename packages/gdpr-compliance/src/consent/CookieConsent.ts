/**
 * Cookie Consent Manager
 *
 * Manages cookie consent and enforcement
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

import { ConsentType } from '../types';

export interface CookieCategory {
  category: 'essential' | 'functional' | 'analytics' | 'marketing';
  cookies: string[];
  enabled: boolean;
}

export class CookieConsent {
  constructor(private db: Pool) {}

  /**
   * Record cookie consent preferences
   */
  async recordCookieConsent(
    userId: string,
    preferences: CookieCategory[],
    ipAddress?: string
  ): Promise<void> {
    const query = `
      INSERT INTO cookie_consent
      (id, user_id, preferences, ip_address, created_at)
      VALUES ($1, $2, $3, $4, $5)
    `;

    await this.db.query(query, [
      uuidv4(),
      userId,
      JSON.stringify(preferences),
      ipAddress,
      new Date(),
    ]);

    // Record individual consent records
    for (const pref of preferences) {
      const consentType = this.mapCategoryToConsentType(pref.category);
      if (consentType && pref.enabled) {
        await this.db.query(
          `INSERT INTO user_consent
           (id, user_id, consent_type, granted, purpose, granted_at, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [uuidv4(), userId, consentType, true, `${pref.category} cookies`, new Date(), new Date()]
        );
      }
    }
  }

  /**
   * Get cookie consent preferences
   */
  async getCookiePreferences(userId: string): Promise<CookieCategory[]> {
    const query = `
      SELECT preferences
      FROM cookie_consent
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await this.db.query(query, [userId]);

    if (result.rows.length === 0) {
      return this.getDefaultPreferences();
    }

    return result.rows[0].preferences;
  }

  /**
   * Check if specific cookie is allowed
   */
  async isCookieAllowed(userId: string, cookieName: string): Promise<boolean> {
    const preferences = await this.getCookiePreferences(userId);

    for (const pref of preferences) {
      if (pref.cookies.includes(cookieName)) {
        return pref.enabled;
      }
    }

    // If cookie not in any category, check if it's essential
    return this.isEssentialCookie(cookieName);
  }

  /**
   * Get default cookie preferences (only essential enabled)
   */
  private getDefaultPreferences(): CookieCategory[] {
    return [
      {
        category: 'essential',
        cookies: ['session', 'csrf', 'auth'],
        enabled: true,
      },
      {
        category: 'functional',
        cookies: ['preferences', 'language', 'theme'],
        enabled: false,
      },
      {
        category: 'analytics',
        cookies: ['_ga', '_gid', 'analytics'],
        enabled: false,
      },
      {
        category: 'marketing',
        cookies: ['_fbp', 'ads', 'marketing'],
        enabled: false,
      },
    ];
  }

  /**
   * Check if cookie is essential
   */
  private isEssentialCookie(cookieName: string): boolean {
    const essentialCookies = ['session', 'csrf', 'auth', 'security'];
    return essentialCookies.some((essential) => cookieName.toLowerCase().includes(essential));
  }

  /**
   * Map cookie category to consent type
   */
  private mapCategoryToConsentType(category: string): ConsentType | null {
    switch (category) {
      case 'essential':
        return ConsentType.COOKIES_ESSENTIAL;
      case 'functional':
        return ConsentType.COOKIES_FUNCTIONAL;
      case 'analytics':
        return ConsentType.COOKIES_ANALYTICS;
      case 'marketing':
        return ConsentType.COOKIES_MARKETING;
      default:
        return null;
    }
  }

  /**
   * Generate cookie consent banner configuration
   */
  async getCookieBannerConfig(userId?: string): Promise<any> {
    let preferences: CookieCategory[] = this.getDefaultPreferences();

    if (userId) {
      preferences = await this.getCookiePreferences(userId);
    }

    return {
      categories: [
        {
          id: 'essential',
          name: 'Essential Cookies',
          description: 'Required for basic functionality',
          required: true,
          enabled: true,
        },
        {
          id: 'functional',
          name: 'Functional Cookies',
          description: 'Enhanced features and preferences',
          required: false,
          enabled: preferences.find((p) => p.category === 'functional')?.enabled || false,
        },
        {
          id: 'analytics',
          name: 'Analytics Cookies',
          description: 'Usage analytics and improvements',
          required: false,
          enabled: preferences.find((p) => p.category === 'analytics')?.enabled || false,
        },
        {
          id: 'marketing',
          name: 'Marketing Cookies',
          description: 'Targeted advertising',
          required: false,
          enabled: preferences.find((p) => p.category === 'marketing')?.enabled || false,
        },
      ],
    };
  }

  /**
   * Clear non-consented cookies
   */
  async clearNonConsentedCookies(userId: string, allCookies: string[]): Promise<string[]> {
    const preferences = await this.getCookiePreferences(userId);
    const cookiesToDelete: string[] = [];

    for (const cookie of allCookies) {
      const allowed = await this.isCookieAllowed(userId, cookie);
      if (!allowed) {
        cookiesToDelete.push(cookie);
      }
    }

    return cookiesToDelete;
  }
}
