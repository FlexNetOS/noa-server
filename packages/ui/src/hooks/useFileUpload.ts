/**
 * File Upload Hook
 *
 * Custom React hook for managing file uploads with progress tracking,
 * validation, and cancellation support.
 */

import { useState, useCallback, useRef } from 'react';
import axios, { AxiosRequestConfig, CancelTokenSource } from 'axios';
import {
  UploadedFile,
  FileUploadStatus,
  FileUploadConfig,
  FileUploadCallbacks,
  UploadProgressInfo,
  DEFAULT_UPLOAD_CONFIG,
} from '../types/files';
import {
  validateFiles,
  categorizeFile,
  generateFileId,
  createImageThumbnail,
  readFileAsText,
  isTextFileByName,
  FileTypeCategory,
} from '../utils/fileValidation';

export interface UseFileUploadOptions {
  config?: Partial<FileUploadConfig>;
  callbacks?: FileUploadCallbacks;
  uploadUrl?: string;
}

export interface UseFileUploadReturn {
  files: UploadedFile[];
  addFiles: (newFiles: File[]) => void;
  removeFile: (fileId: string) => void;
  uploadFile: (fileId: string) => Promise<void>;
  uploadAll: () => Promise<void>;
  cancelUpload: (fileId: string) => void;
  retryUpload: (fileId: string) => Promise<void>;
  clearAll: () => void;
  isUploading: boolean;
  totalProgress: number;
}

export function useFileUpload(options: UseFileUploadOptions = {}): UseFileUploadReturn {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const config: FileUploadConfig = {
    ...DEFAULT_UPLOAD_CONFIG,
    ...options.config,
  };

  const callbacks = options.callbacks || {};
  const uploadUrl = options.uploadUrl || config.uploadUrl;

  // Store cancel tokens for each upload
  const cancelTokensRef = useRef<Map<string, CancelTokenSource>>(new Map());

  // Store upload start times for speed calculation
  const uploadTimesRef = useRef<Map<string, number>>(new Map());

  /**
   * Add files to the upload queue
   */
  const addFiles = useCallback(
    async (newFiles: File[]) => {
      const existingFiles = files.map((f) => f.file);
      const { validFiles, errors } = validateFiles(newFiles, existingFiles, config);

      if (errors.length > 0) {
        console.error('File validation errors:', errors);
        errors.forEach((error) => {
          callbacks.onUploadError?.('validation', error);
        });
      }

      const uploadedFiles: UploadedFile[] = await Promise.all(
        validFiles.map(async (file) => {
          const id = generateFileId();
          const category = categorizeFile(file);

          let preview: string | undefined;
          let textContent: string | undefined;
          let thumbnailUrl: string | undefined;

          // Generate preview for images
          if (category === FileTypeCategory.IMAGE) {
            try {
              thumbnailUrl = await createImageThumbnail(file);
            } catch (error) {
              console.error('Failed to create thumbnail:', error);
            }
          }

          // Read text content for text files
          if (category === FileTypeCategory.TEXT || isTextFileByName(file.name)) {
            try {
              textContent = await readFileAsText(file);
            } catch (error) {
              console.error('Failed to read text file:', error);
            }
          }

          const uploadedFile: UploadedFile = {
            id,
            file,
            name: file.name,
            size: file.size,
            type: file.type,
            category,
            status: FileUploadStatus.PENDING,
            progress: 0,
            uploadedBytes: 0,
            preview,
            textContent,
            thumbnailUrl,
          };

          callbacks.onFileAdded?.(uploadedFile);
          return uploadedFile;
        })
      );

      setFiles((prev) => [...prev, ...uploadedFiles]);

      // Auto-upload if enabled
      if (config.autoUpload && uploadUrl) {
        uploadedFiles.forEach((file) => {
          uploadFile(file.id);
        });
      }
    },
    [files, config, callbacks, uploadUrl]
  );

  /**
   * Remove a file from the queue
   */
  const removeFile = useCallback(
    (fileId: string) => {
      // Cancel upload if in progress
      const cancelToken = cancelTokensRef.current.get(fileId);
      if (cancelToken) {
        cancelToken.cancel('Upload cancelled by user');
        cancelTokensRef.current.delete(fileId);
      }

      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      uploadTimesRef.current.delete(fileId);
      callbacks.onFileRemoved?.(fileId);
    },
    [callbacks]
  );

  /**
   * Upload a single file
   */
  const uploadFile = useCallback(
    async (fileId: string) => {
      if (!uploadUrl) {
        console.error('Upload URL not configured');
        return;
      }

      const fileToUpload = files.find((f) => f.id === fileId);
      if (!fileToUpload) {
        console.error('File not found:', fileId);
        return;
      }

      if (fileToUpload.status === FileUploadStatus.UPLOADING) {
        console.warn('File already uploading:', fileId);
        return;
      }

      // Create cancel token
      const cancelTokenSource = axios.CancelToken.source();
      cancelTokensRef.current.set(fileId, cancelTokenSource);
      uploadTimesRef.current.set(fileId, Date.now());

      // Update status to uploading
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? { ...f, status: FileUploadStatus.UPLOADING, error: undefined }
            : f
        )
      );

      callbacks.onUploadStart?.(fileId);

      try {
        const formData = new FormData();
        formData.append('file', fileToUpload.file);
        formData.append('name', fileToUpload.name);
        formData.append('category', fileToUpload.category);

        const axiosConfig: AxiosRequestConfig = {
          cancelToken: cancelTokenSource.token,
          onUploadProgress: (progressEvent) => {
            const loaded = progressEvent.loaded || 0;
            const total = progressEvent.total || fileToUpload.size;
            const percentage = Math.round((loaded / total) * 100);

            // Calculate speed and remaining time
            const startTime = uploadTimesRef.current.get(fileId) || Date.now();
            const elapsed = (Date.now() - startTime) / 1000; // seconds
            const speed = elapsed > 0 ? loaded / elapsed : 0;
            const remaining = speed > 0 ? (total - loaded) / speed : 0;

            const progressInfo: UploadProgressInfo = {
              loaded,
              total,
              percentage,
              speed,
              remaining,
            };

            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileId
                  ? { ...f, progress: percentage, uploadedBytes: loaded }
                  : f
              )
            );

            callbacks.onUploadProgress?.(fileId, progressInfo);
          },
        };

        const response = await axios.post(uploadUrl, formData, axiosConfig);

        // Upload successful
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? { ...f, status: FileUploadStatus.SUCCESS, progress: 100 }
              : f
          )
        );

        cancelTokensRef.current.delete(fileId);
        uploadTimesRef.current.delete(fileId);

        callbacks.onUploadComplete?.(fileId, response.data);
      } catch (error) {
        if (axios.isCancel(error)) {
          // Upload cancelled
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileId
                ? { ...f, status: FileUploadStatus.CANCELLED, error: 'Upload cancelled' }
                : f
            )
          );
        } else {
          // Upload error
          const errorMessage =
            error instanceof Error ? error.message : 'Upload failed';

          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileId
                ? { ...f, status: FileUploadStatus.ERROR, error: errorMessage }
                : f
            )
          );

          callbacks.onUploadError?.(fileId, errorMessage);
        }

        cancelTokensRef.current.delete(fileId);
        uploadTimesRef.current.delete(fileId);
      }
    },
    [files, uploadUrl, callbacks]
  );

  /**
   * Upload all pending files
   */
  const uploadAll = useCallback(async () => {
    setIsUploading(true);

    const pendingFiles = files.filter(
      (f) => f.status === FileUploadStatus.PENDING || f.status === FileUploadStatus.ERROR
    );

    await Promise.all(pendingFiles.map((f) => uploadFile(f.id)));

    setIsUploading(false);
    callbacks.onAllComplete?.();
  }, [files, uploadFile, callbacks]);

  /**
   * Cancel an ongoing upload
   */
  const cancelUpload = useCallback(
    (fileId: string) => {
      const cancelToken = cancelTokensRef.current.get(fileId);
      if (cancelToken) {
        cancelToken.cancel('Upload cancelled by user');
        cancelTokensRef.current.delete(fileId);
        uploadTimesRef.current.delete(fileId);
      }
    },
    []
  );

  /**
   * Retry a failed upload
   */
  const retryUpload = useCallback(
    async (fileId: string) => {
      const file = files.find((f) => f.id === fileId);
      if (!file) return;

      if (file.status === FileUploadStatus.ERROR || file.status === FileUploadStatus.CANCELLED) {
        await uploadFile(fileId);
      }
    },
    [files, uploadFile]
  );

  /**
   * Clear all files
   */
  const clearAll = useCallback(() => {
    // Cancel all ongoing uploads
    cancelTokensRef.current.forEach((token) => {
      token.cancel('Clearing all files');
    });

    cancelTokensRef.current.clear();
    uploadTimesRef.current.clear();
    setFiles([]);
    setIsUploading(false);
  }, []);

  /**
   * Calculate total upload progress
   */
  const totalProgress = files.length > 0
    ? Math.round(
        files.reduce((sum, f) => sum + f.progress, 0) / files.length
      )
    : 0;

  return {
    files,
    addFiles,
    removeFile,
    uploadFile,
    uploadAll,
    cancelUpload,
    retryUpload,
    clearAll,
    isUploading,
    totalProgress,
  };
}
