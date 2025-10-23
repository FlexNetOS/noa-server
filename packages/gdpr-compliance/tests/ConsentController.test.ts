import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConsentController } from '../src/api/ConsentController';

// Mock database connection
const mockPool = {
  query: vi.fn(),
} as any;

describe('ConsentController', () => {
  let controller: ConsentController;

  beforeEach(() => {
    controller = new ConsentController(mockPool);
    vi.clearAllMocks();
  });

  describe('recordCookieConsent', () => {
    it('should return 401 when user is not authenticated', async () => {
      const mockReq = {
        user: undefined,
        body: {
          preferences: { essential: true, analytics: false },
        },
      } as any;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      await controller.recordCookieConsent(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
      });
    });

    it('should record cookie consent when user is authenticated', async () => {
      const mockReq = {
        user: { id: 'user-123' },
        body: {
          preferences: { essential: true, analytics: false },
        },
        ip: '127.0.0.1',
      } as any;

      const mockRes = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      } as any;

      // Mock the cookieConsent.recordCookieConsent method
      vi.spyOn(controller['cookieConsent'], 'recordCookieConsent')
        .mockResolvedValue();

      await controller.recordCookieConsent(mockReq, mockRes);

      expect(controller['cookieConsent'].recordCookieConsent).toHaveBeenCalledWith(
        'user-123',
        { essential: true, analytics: false },
        '127.0.0.1'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Cookie preferences saved successfully',
      });
    });
  });

  describe('getCookiePreferences', () => {
    it('should return 401 when user is not authenticated', async () => {
      const mockReq = {
        user: undefined,
      } as any;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      await controller.getCookiePreferences(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
      });
    });

    it('should return cookie preferences when user is authenticated', async () => {
      const mockReq = {
        user: { id: 'user-123' },
      } as any;

      const mockRes = {
        json: vi.fn(),
      } as any;

      const mockPreferences = { essential: true, analytics: false };

      mockPool.query.mockResolvedValue({ rows: [{ preferences: mockPreferences }] });

      await controller.getCookiePreferences(mockReq, mockRes);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT preferences'),
        ['user-123']
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockPreferences,
      });
    });
  });

  describe('getConsentHistory', () => {
    it('should return consent history for authenticated user', async () => {
      const mockReq = {
        user: { id: 'user-123' },
        params: { type: 'marketing' },
      } as any;

      const mockRes = {
        json: vi.fn(),
      } as any;

      const mockHistory = [
        { id: 'consent-1', consent_type: 'marketing', granted: true, created_at: '2024-01-01' },
      ];

      mockPool.query.mockResolvedValue({ rows: mockHistory });

      await controller.getConsentHistory(mockReq, mockRes);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM user_consent'),
        ['user-123', 'marketing']
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockHistory,
      });
    });
  });
});
