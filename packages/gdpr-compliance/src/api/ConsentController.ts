/**
 * Consent Management API Controller
 *
 * RESTful API endpoints for consent management
 */

import { Request, Response } from 'express';
import { Pool } from 'pg';

import { ConsentManager } from '../consent/ConsentManager';
import { ConsentTypeManager } from '../consent/ConsentTypes';
import { CookieConsent } from '../consent/CookieConsent';
import { ConsentType, LegalBasis } from '../types';

export class ConsentController {
  private consentManager: ConsentManager;
  private cookieConsent: CookieConsent;

  constructor(private db: Pool) {
    this.consentManager = new ConsentManager(db);
    this.cookieConsent = new CookieConsent(db);
  }

  /**
   * POST /api/gdpr/consent/grant
   * Grant consent
   */
  async grantConsent(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { consentType, purpose, legalBasis } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.get('user-agent');

      const consent = await this.consentManager.grantConsent(
        userId,
        consentType as ConsentType,
        purpose,
        (legalBasis as LegalBasis) || LegalBasis.CONSENT,
        ipAddress,
        userAgent
      );

      res.status(201).json({
        success: true,
        message: 'Consent granted successfully',
        data: consent,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to grant consent',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/gdpr/consent/withdraw
   * Withdraw consent
   */
  async withdrawConsent(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { consentType, reason } = req.body;

      await this.consentManager.withdrawConsent(userId, consentType as ConsentType, reason);

      res.json({
        success: true,
        message: 'Consent withdrawn successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to withdraw consent',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/gdpr/consent
   * Get all consents for user
   */
  async getUserConsents(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const consents = await this.consentManager.getUserConsents(userId);

      res.json({
        success: true,
        data: consents,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch consents',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/gdpr/consent/:type/history
   * Get consent history for specific type
   */
  async getConsentHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { type } = req.params;

      const history = await this.consentManager.getConsentHistory(userId, type as ConsentType);

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch consent history',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/gdpr/consent/bulk
   * Update multiple consents at once
   */
  async updateBulkConsents(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { consents } = req.body;

      await this.consentManager.updateBulkConsents(userId, consents);

      res.json({
        success: true,
        message: 'Consents updated successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to update consents',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/gdpr/consent/types
   * Get available consent types and definitions
   */
  async getConsentTypes(req: Request, res: Response): Promise<void> {
    try {
      const required = ConsentTypeManager.getRequiredConsents();
      const optional = ConsentTypeManager.getOptionalConsents();

      res.json({
        success: true,
        data: {
          required,
          optional,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch consent types',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/gdpr/cookies/consent
   * Record cookie consent preferences
   */
  async recordCookieConsent(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { preferences } = req.body;
      const ipAddress = req.ip;

      await this.cookieConsent.recordCookieConsent(userId, preferences, ipAddress);

      res.json({
        success: true,
        message: 'Cookie preferences saved successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to save cookie preferences',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/gdpr/cookies/preferences
   * Get cookie preferences
   */
  async getCookiePreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const preferences = await this.cookieConsent.getCookiePreferences(userId);

      res.json({
        success: true,
        data: preferences,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch cookie preferences',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/gdpr/cookies/banner
   * Get cookie consent banner configuration
   */
  async getCookieBannerConfig(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      const config = await this.cookieConsent.getCookieBannerConfig(userId);

      res.json({
        success: true,
        data: config,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch cookie banner config',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/gdpr/consent/statistics
   * Get consent statistics (admin only)
   */
  async getConsentStatistics(req: Request, res: Response): Promise<void> {
    try {
      // Check if user has admin role
      if (!req.user?.roles?.includes('admin')) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
        });
        return;
      }

      const stats = await this.consentManager.getConsentStatistics();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch statistics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
