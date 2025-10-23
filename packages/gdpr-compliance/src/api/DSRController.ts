/**
 * Data Subject Request API Controller
 *
 * RESTful API endpoints for GDPR rights
 */

import { Request, Response } from 'express';
import { Pool } from 'pg';

import { RightToAccess } from '../rights/RightToAccess';
import { RightToErasure } from '../rights/RightToErasure';
import { RightToObject } from '../rights/RightToObject';
import { RightToPortability } from '../rights/RightToPortability';
import { RightToRectification } from '../rights/RightToRectification';
import { RightToRestriction } from '../rights/RightToRestriction';

export class DSRController {
  private rightToAccess: RightToAccess;
  private rightToErasure: RightToErasure;
  private rightToRectification: RightToRectification;
  private rightToPortability: RightToPortability;
  private rightToRestriction: RightToRestriction;
  private rightToObject: RightToObject;

  constructor(private db: Pool) {
    this.rightToAccess = new RightToAccess(db);
    this.rightToErasure = new RightToErasure(db);
    this.rightToRectification = new RightToRectification(db);
    this.rightToPortability = new RightToPortability(db);
    this.rightToRestriction = new RightToRestriction(db);
    this.rightToObject = new RightToObject(db);
  }

  /**
   * POST /api/gdpr/dsr/access
   * Request access to personal data (Subject Access Request)
   */
  async createAccessRequest(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { verificationMethod } = req.body;
      const ipAddress = req.ip;

      const request = await this.rightToAccess.createAccessRequest(
        userId,
        verificationMethod,
        ipAddress
      );

      res.status(201).json({
        success: true,
        message: 'Access request created successfully',
        data: { requestId: request.id, status: request.status },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to create access request',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/gdpr/dsr/export
   * Export user data
   */
  async exportUserData(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const format = (req.query.format as 'json' | 'csv' | 'xml') || 'json';

      const data = await this.rightToAccess.exportUserData(userId, {
        format,
        includeMetadata: true,
        pseudonymize: false,
        compress: false,
      });

      const contentType = this.getContentType(format);
      const filename = `user-data-${userId}-${Date.now()}.${format}`;

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(data);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to export user data',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/gdpr/dsr/erasure
   * Request erasure of personal data (Right to be Forgotten)
   */
  async createErasureRequest(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { reason, verificationMethod } = req.body;

      const request = await this.rightToErasure.createErasureRequest(
        userId,
        reason,
        verificationMethod
      );

      res.status(201).json({
        success: true,
        message: 'Erasure request created successfully. Your data will be deleted within 30 days.',
        data: { requestId: request.id, status: request.status },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to create erasure request',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/gdpr/dsr/rectification
   * Request correction of inaccurate data
   */
  async createRectificationRequest(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { corrections, reason } = req.body;

      const request = await this.rightToRectification.createRectificationRequest(
        userId,
        corrections,
        reason
      );

      res.status(201).json({
        success: true,
        message: 'Rectification request created successfully',
        data: { requestId: request.id, status: request.status },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to create rectification request',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/gdpr/dsr/portability
   * Request data in portable format
   */
  async createPortabilityRequest(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { format, includeCategories } = req.body;

      const request = await this.rightToPortability.createPortabilityRequest(
        userId,
        format || 'json',
        includeCategories
      );

      res.status(201).json({
        success: true,
        message: 'Portability request created successfully',
        data: { requestId: request.id, status: request.status },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to create portability request',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/gdpr/dsr/restriction
   * Request restriction of processing
   */
  async createRestrictionRequest(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { reason, scope } = req.body;

      const request = await this.rightToRestriction.createRestrictionRequest(userId, reason, scope);

      res.status(201).json({
        success: true,
        message: 'Processing restriction request created successfully',
        data: { requestId: request.id, status: request.status },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to create restriction request',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/gdpr/dsr/objection
   * Object to processing
   */
  async createObjectionRequest(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { objectionType, reason } = req.body;

      const request = await this.rightToObject.createObjectionRequest(
        userId,
        objectionType,
        reason
      );

      res.status(201).json({
        success: true,
        message: 'Objection request created successfully',
        data: { requestId: request.id, status: request.status },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to create objection request',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/gdpr/dsr/requests
   * Get all requests for authenticated user
   */
  async getUserRequests(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const query = `
        SELECT id, request_type, status, submitted_at, completed_at
        FROM data_subject_requests
        WHERE user_id = $1
        ORDER BY submitted_at DESC
      `;

      const result = await this.db.query(query, [userId]);

      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch requests',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/gdpr/dsr/requests/:id
   * Get specific request details
   */
  async getRequestStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { id } = req.params;

      const query = `
        SELECT *
        FROM data_subject_requests
        WHERE id = $1 AND user_id = $2
      `;

      const result = await this.db.query(query, [id, userId]);

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Request not found',
        });
        return;
      }

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch request',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Helper: Get content type for format
   */
  private getContentType(format: string): string {
    switch (format) {
      case 'json':
        return 'application/json';
      case 'csv':
        return 'text/csv';
      case 'xml':
        return 'application/xml';
      default:
        return 'application/octet-stream';
    }
  }
}
