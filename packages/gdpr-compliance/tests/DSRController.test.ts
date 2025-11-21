import { Pool } from 'pg';
import { beforeEach, describe, expect, it } from 'vitest';
import { DSRController } from '../src/api/DSRController';

// Mock database connection
const mockPool = {
  query: vi.fn(),
} as unknown as Pool;

describe('DSRController', () => {
  let controller: DSRController;

  beforeEach(() => {
    controller = new DSRController(mockPool);
    vi.clearAllMocks();
  });

  describe('createAccessRequest', () => {
    it('should return 401 when user is not authenticated', async () => {
      const mockReq = {
        user: undefined,
        body: { verificationMethod: 'email' },
        ip: '127.0.0.1',
      } as any;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      await controller.createAccessRequest(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
      });
    });

    it('should create access request when user is authenticated', async () => {
      const mockReq = {
        user: { id: 'user-123' },
        body: { verificationMethod: 'email' },
        ip: '127.0.0.1',
      } as any;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      // Mock the rightToAccess.createAccessRequest method
      const mockRequest = { id: 'req-123', status: 'pending' };
      vi.spyOn(controller['rightToAccess'], 'createAccessRequest').mockResolvedValue(mockRequest);

      await controller.createAccessRequest(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Access request created successfully',
        data: { requestId: 'req-123', status: 'pending' },
      });
    });
  });

  describe('exportUserData', () => {
    it('should return 401 when user is not authenticated', async () => {
      const mockReq = {
        user: undefined,
        query: { format: 'json' },
      } as any;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      await controller.exportUserData(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
      });
    });

    it('should export user data when user is authenticated', async () => {
      const mockReq = {
        user: { id: 'user-123' },
        query: { format: 'json' },
      } as any;

      const mockRes = {
        setHeader: vi.fn(),
        send: vi.fn(),
      } as any;

      const mockData = { personalData: 'test data' };
      vi.spyOn(controller['rightToAccess'], 'exportUserData').mockResolvedValue(mockData);

      await controller.exportUserData(mockReq, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('user-data-user-123')
      );
      expect(mockRes.send).toHaveBeenCalledWith(mockData);
    });
  });

  describe('getUserRequests', () => {
    it('should return 401 when user is not authenticated', async () => {
      const mockReq = {
        user: undefined,
      } as any;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      await controller.getUserRequests(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
      });
    });

    it('should return user requests when authenticated', async () => {
      const mockReq = {
        user: { id: 'user-123' },
      } as any;

      const mockRes = {
        json: vi.fn(),
      } as any;

      const mockRows = [{ id: 'req-1', request_type: 'access', status: 'completed' }];

      mockPool.query.mockResolvedValue({ rows: mockRows });

      await controller.getUserRequests(mockReq, mockRes);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, request_type, status'),
        ['user-123']
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockRows,
      });
    });
  });
});
