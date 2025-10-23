/**
 * Consent Type Definitions and Configurations
 *
 * Defines different types of consent and their requirements
 */

import { ConsentType, LegalBasis } from '../types';

export interface ConsentDefinition {
  type: ConsentType;
  name: string;
  description: string;
  legalBasis: LegalBasis;
  required: boolean;
  granularity: 'service' | 'feature' | 'data-category';
  canWithdraw: boolean;
  withdrawalImpact: string;
}

export const CONSENT_DEFINITIONS: ConsentDefinition[] = [
  {
    type: ConsentType.MARKETING,
    name: 'Marketing Communications',
    description: 'Consent to receive marketing emails, SMS, and promotional content',
    legalBasis: LegalBasis.CONSENT,
    required: false,
    granularity: 'feature',
    canWithdraw: true,
    withdrawalImpact: 'You will no longer receive marketing communications',
  },
  {
    type: ConsentType.ANALYTICS,
    name: 'Analytics & Performance',
    description: 'Consent to track usage analytics for service improvement',
    legalBasis: LegalBasis.LEGITIMATE_INTERESTS,
    required: false,
    granularity: 'feature',
    canWithdraw: true,
    withdrawalImpact: 'We will not track your usage patterns',
  },
  {
    type: ConsentType.PERSONALIZATION,
    name: 'Personalization',
    description: 'Consent to personalize content and recommendations',
    legalBasis: LegalBasis.CONSENT,
    required: false,
    granularity: 'feature',
    canWithdraw: true,
    withdrawalImpact: 'You will receive generic, non-personalized content',
  },
  {
    type: ConsentType.THIRD_PARTY_SHARING,
    name: 'Third-Party Data Sharing',
    description: 'Consent to share data with trusted third-party partners',
    legalBasis: LegalBasis.CONSENT,
    required: false,
    granularity: 'data-category',
    canWithdraw: true,
    withdrawalImpact: 'Your data will not be shared with third parties',
  },
  {
    type: ConsentType.PROFILING,
    name: 'Automated Profiling',
    description: 'Consent to automated profiling and decision-making',
    legalBasis: LegalBasis.CONSENT,
    required: false,
    granularity: 'feature',
    canWithdraw: true,
    withdrawalImpact: 'Automated recommendations and decisions will be disabled',
  },
  {
    type: ConsentType.COOKIES_ESSENTIAL,
    name: 'Essential Cookies',
    description: 'Cookies required for basic functionality',
    legalBasis: LegalBasis.LEGITIMATE_INTERESTS,
    required: true,
    granularity: 'service',
    canWithdraw: false,
    withdrawalImpact: 'Service will not function properly',
  },
  {
    type: ConsentType.COOKIES_FUNCTIONAL,
    name: 'Functional Cookies',
    description: 'Cookies for enhanced functionality and preferences',
    legalBasis: LegalBasis.CONSENT,
    required: false,
    granularity: 'feature',
    canWithdraw: true,
    withdrawalImpact: 'Some features may not work as expected',
  },
  {
    type: ConsentType.COOKIES_ANALYTICS,
    name: 'Analytics Cookies',
    description: 'Cookies for usage analytics and service improvement',
    legalBasis: LegalBasis.CONSENT,
    required: false,
    granularity: 'feature',
    canWithdraw: true,
    withdrawalImpact: 'We will not track your usage patterns',
  },
  {
    type: ConsentType.COOKIES_MARKETING,
    name: 'Marketing Cookies',
    description: 'Cookies for targeted advertising and marketing',
    legalBasis: LegalBasis.CONSENT,
    required: false,
    granularity: 'feature',
    canWithdraw: true,
    withdrawalImpact: 'You will see generic, non-targeted ads',
  },
];

export class ConsentTypeManager {
  /**
   * Get consent definition by type
   */
  static getDefinition(type: ConsentType): ConsentDefinition | undefined {
    return CONSENT_DEFINITIONS.find((d) => d.type === type);
  }

  /**
   * Get all required consents
   */
  static getRequiredConsents(): ConsentDefinition[] {
    return CONSENT_DEFINITIONS.filter((d) => d.required);
  }

  /**
   * Get all optional consents
   */
  static getOptionalConsents(): ConsentDefinition[] {
    return CONSENT_DEFINITIONS.filter((d) => !d.required);
  }

  /**
   * Check if consent can be withdrawn
   */
  static canWithdraw(type: ConsentType): boolean {
    const definition = this.getDefinition(type);
    return definition?.canWithdraw ?? false;
  }

  /**
   * Get withdrawal impact message
   */
  static getWithdrawalImpact(type: ConsentType): string {
    const definition = this.getDefinition(type);
    return definition?.withdrawalImpact ?? 'Unknown impact';
  }

  /**
   * Validate consent configuration
   */
  static validateConsents(providedConsents: ConsentType[]): {
    valid: boolean;
    missing: ConsentType[];
  } {
    const required = this.getRequiredConsents();
    const missing = required.filter((r) => !providedConsents.includes(r.type)).map((r) => r.type);

    return {
      valid: missing.length === 0,
      missing,
    };
  }
}
