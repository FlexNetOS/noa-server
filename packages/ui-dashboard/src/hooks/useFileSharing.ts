/**
 * React Hook for File Sharing Operations
 * Manages file sharing state and API calls
 */

import { useState, useCallback } from 'react';

export interface FileShare {
  shareId: string;
  token: string;
  shareUrl: string;
  permission: 'read' | 'write';
  expiresAt: number | null;
  requiresPassword: boolean;
  downloadCount: number;
  maxDownloads: number | null;
  createdAt: number;
}

export interface CreateShareOptions {
  fileId: string;
  permission?: 'read' | 'write';
  expiresIn?: number; // in milliseconds
  password?: string;
  maxDownloads?: number;
  userId: string;
}

export interface ShareInfo {
  shareId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  permission: 'read' | 'write';
  requiresPassword: boolean;
  expiresAt: number | null;
  downloadCount: number;
  maxDownloads: number | null;
  createdAt: number;
}

export interface DownloadLog {
  id: string;
  downloadedAt: number;
  ipAddress: string;
}

export function useFileSharing() {
  const [shares, setShares] = useState<FileShare[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Create a new share link
   */
  const createShare = useCallback(async (options: CreateShareOptions): Promise<FileShare | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create share');
      }

      const share = await response.json();
      setShares((prev) => [...prev, share]);
      return share;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create share';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get share information by token
   */
  const getShareInfo = useCallback(async (token: string): Promise<ShareInfo | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/share/${token}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get share info');
      }

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get share info';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Verify password for password-protected share
   */
  const verifyPassword = useCallback(
    async (token: string, password: string): Promise<string | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/share/${token}/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ password }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Invalid password');
        }

        const data = await response.json();
        return data.accessToken;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Password verification failed';
        setError(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Download file via share link
   */
  const downloadFile = useCallback(
    async (token: string, accessToken?: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const headers: HeadersInit = {};
        if (accessToken) {
          headers['Authorization'] = `Bearer ${accessToken}`;
        }

        const response = await fetch(`/api/share/${token}/download`, {
          headers,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Download failed');
        }

        const data = await response.json();

        // In a real implementation, this would trigger the actual file download
        console.log('Download initiated:', data);

        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Download failed';
        setError(errorMessage);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Get all shares for a file
   */
  const getFileShares = useCallback(async (fileId: string, userId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/share/file/${fileId}?userId=${userId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get file shares');
      }

      const fileShares = await response.json();
      setShares(fileShares);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get file shares';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Revoke a share
   */
  const revokeShare = useCallback(
    async (shareId: string, userId: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/share/${shareId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to revoke share');
        }

        // Remove from local state
        setShares((prev) => prev.filter((share) => share.shareId !== shareId));

        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to revoke share';
        setError(errorMessage);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Get download statistics for a share
   */
  const getDownloadStats = useCallback(
    async (
      shareId: string,
      userId: string
    ): Promise<{ totalDownloads: number; logs: DownloadLog[] } | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/share/${shareId}/stats?userId=${userId}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to get download stats');
        }

        return await response.json();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to get download stats';
        setError(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Copy share URL to clipboard
   */
  const copyShareUrl = useCallback(async (shareUrl: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      return true;
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      return false;
    }
  }, []);

  return {
    shares,
    isLoading,
    error,
    createShare,
    getShareInfo,
    verifyPassword,
    downloadFile,
    getFileShares,
    revokeShare,
    getDownloadStats,
    copyShareUrl,
  };
}

/**
 * Hook for managing a single share link view
 */
export function useShareLink(token: string) {
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { getShareInfo, verifyPassword, downloadFile } = useFileSharing();

  const loadShareInfo = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const info = await getShareInfo(token);
    if (info) {
      setShareInfo(info);
    }

    setIsLoading(false);
  }, [token, getShareInfo]);

  const handlePasswordSubmit = useCallback(
    async (password: string) => {
      const token = await verifyPassword(token, password);
      if (token) {
        setAccessToken(token);
        return true;
      }
      return false;
    },
    [token, verifyPassword]
  );

  const handleDownload = useCallback(async () => {
    return await downloadFile(token, accessToken || undefined);
  }, [token, accessToken, downloadFile]);

  return {
    shareInfo,
    accessToken,
    isLoading,
    error,
    loadShareInfo,
    handlePasswordSubmit,
    handleDownload,
  };
}
