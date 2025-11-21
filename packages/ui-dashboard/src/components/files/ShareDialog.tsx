/**
 * Share Dialog Component
 * UI for creating and managing file share links
 */

import React, { useState, useEffect } from 'react';

interface ShareDialogProps {
  fileId: string;
  fileName: string;
  isOpen: boolean;
  onClose: () => void;
  onShareCreated?: (shareData: ShareData) => void;
}

interface ShareData {
  shareId: string;
  token: string;
  shareUrl: string;
  expiresAt: number | null;
  permission: 'read' | 'write';
  requiresPassword: boolean;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({
  fileId,
  fileName,
  isOpen,
  onClose,
  onShareCreated,
}) => {
  const [permission, setPermission] = useState<'read' | 'write'>('read');
  const [expiresIn, setExpiresIn] = useState<string>('7d');
  const [password, setPassword] = useState('');
  const [maxDownloads, setMaxDownloads] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createdShare, setCreatedShare] = useState<ShareData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when dialog closes
      setCreatedShare(null);
      setError(null);
      setPassword('');
      setCopied(false);
    }
  }, [isOpen]);

  const parseExpiresIn = (value: string): number | null => {
    const units: { [key: string]: number } = {
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
      w: 7 * 24 * 60 * 60 * 1000,
      m: 30 * 24 * 60 * 60 * 1000,
    };

    if (value === 'never') return null;

    const match = value.match(/^(\d+)([hdwm])$/);
    if (!match) return null;

    const [, amount, unit] = match;
    return parseInt(amount) * units[unit];
  };

  const handleCreateShare = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId,
          permission,
          expiresIn: parseExpiresIn(expiresIn),
          password: password || undefined,
          maxDownloads: maxDownloads || undefined,
          userId: 'current-user-id', // Replace with actual user ID from auth
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create share');
      }

      const shareData = await response.json();
      setCreatedShare(shareData);
      onShareCreated?.(shareData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create share link');
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = async () => {
    if (!createdShare) return;

    try {
      await navigator.clipboard.writeText(createdShare.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatExpiration = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-dialog-title"
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2
              id="share-dialog-title"
              className="text-xl font-semibold text-gray-900 dark:text-white"
            >
              Share File
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              aria-label="Close dialog"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {!createdShare ? (
              <>
                {/* File Name */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    File
                  </label>
                  <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <svg
                        className="w-6 h-6 text-blue-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {fileName}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Permission Level */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Permission Level
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setPermission('read')}
                      className={`px-4 py-3 border-2 rounded-lg transition-all ${
                        permission === 'read'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="font-medium">Read Only</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        View and download only
                      </div>
                    </button>
                    <button
                      onClick={() => setPermission('write')}
                      className={`px-4 py-3 border-2 rounded-lg transition-all ${
                        permission === 'write'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="font-medium">Read & Write</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        View, download, and edit
                      </div>
                    </button>
                  </div>
                </div>

                {/* Expiration */}
                <div className="mb-6">
                  <label
                    htmlFor="expiration"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Link Expiration
                  </label>
                  <select
                    id="expiration"
                    value={expiresIn}
                    onChange={(e) => setExpiresIn(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="1h">1 hour</option>
                    <option value="6h">6 hours</option>
                    <option value="1d">1 day</option>
                    <option value="7d">7 days</option>
                    <option value="30d">30 days</option>
                    <option value="never">Never expires</option>
                  </select>
                </div>

                {/* Password Protection */}
                <div className="mb-6">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Password Protection (Optional)
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password to protect link"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                  />
                </div>

                {/* Download Limit */}
                <div className="mb-6">
                  <label
                    htmlFor="maxDownloads"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Download Limit (Optional)
                  </label>
                  <input
                    id="maxDownloads"
                    type="number"
                    min="1"
                    value={maxDownloads || ''}
                    onChange={(e) =>
                      setMaxDownloads(e.target.value ? parseInt(e.target.value) : null)
                    }
                    placeholder="Unlimited"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Link will expire after this many downloads
                  </p>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mb-6 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-center space-x-2 text-red-700 dark:text-red-400">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm">{error}</span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateShare}
                    disabled={isCreating}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? 'Creating...' : 'Create Share Link'}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Success State */}
                <div className="text-center py-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full mb-4">
                    <svg
                      className="w-8 h-8 text-green-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Share Link Created!
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Anyone with this link can access the file
                  </p>

                  {/* Share URL */}
                  <div className="mb-6">
                    <div className="flex items-center space-x-2 px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                      <input
                        type="text"
                        value={createdShare.shareUrl}
                        readOnly
                        className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white"
                      />
                      <button
                        onClick={copyToClipboard}
                        className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded transition-colors"
                      >
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  {/* Share Details */}
                  <div className="space-y-3 text-left">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Permission:</span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {createdShare.permission === 'read' ? 'Read Only' : 'Read & Write'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Expires:</span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {formatExpiration(createdShare.expiresAt)}
                      </span>
                    </div>
                    {createdShare.requiresPassword && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Protection:</span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          Password Protected
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Close Button */}
                <div className="flex justify-end mt-6">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
