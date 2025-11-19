/**
 * FileUpload Component Tests
 *
 * Comprehensive test suite for file upload functionality.
 */

import { renderHook, act } from '@testing-library/react';
import { useFileUpload } from '../../../hooks/useFileUpload';
import {
  validateFile,
  validateFiles,
  formatFileSize,
  categorizeFile,
  FileTypeCategory,
} from '../../../utils/fileValidation';

// Mock axios
jest.mock('axios');

describe('useFileUpload Hook', () => {
  test('should initialize with empty files array', () => {
    const { result } = renderHook(() => useFileUpload());

    expect(result.current.files).toEqual([]);
    expect(result.current.isUploading).toBe(false);
    expect(result.current.totalProgress).toBe(0);
  });

  test('should add files to the queue', async () => {
    const { result } = renderHook(() => useFileUpload());

    const mockFile = new File(['hello'], 'test.txt', { type: 'text/plain' });

    await act(async () => {
      await result.current.addFiles([mockFile]);
    });

    expect(result.current.files).toHaveLength(1);
    expect(result.current.files[0].name).toBe('test.txt');
  });

  test('should remove files from the queue', async () => {
    const { result } = renderHook(() => useFileUpload());

    const mockFile = new File(['hello'], 'test.txt', { type: 'text/plain' });

    await act(async () => {
      await result.current.addFiles([mockFile]);
    });

    const fileId = result.current.files[0].id;

    act(() => {
      result.current.removeFile(fileId);
    });

    expect(result.current.files).toHaveLength(0);
  });

  test('should clear all files', async () => {
    const { result } = renderHook(() => useFileUpload());

    const mockFiles = [
      new File(['file1'], 'test1.txt', { type: 'text/plain' }),
      new File(['file2'], 'test2.txt', { type: 'text/plain' }),
    ];

    await act(async () => {
      await result.current.addFiles(mockFiles);
    });

    expect(result.current.files).toHaveLength(2);

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.files).toHaveLength(0);
  });

  test('should calculate total progress correctly', async () => {
    const { result } = renderHook(() => useFileUpload());

    const mockFile = new File(['hello'], 'test.txt', { type: 'text/plain' });

    await act(async () => {
      await result.current.addFiles([mockFile]);
    });

    expect(result.current.totalProgress).toBe(0);
  });
});

describe('File Validation', () => {
  const config = {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxTotalSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: ['image/*', 'text/*'],
    allowedExtensions: ['.jpg', '.png', '.txt', '.md'],
    multiple: true,
    autoUpload: false,
  };

  test('should validate file size', () => {
    const smallFile = new File(['small'], 'small.txt', { type: 'text/plain' });
    const largeFile = new File(
      [new ArrayBuffer(20 * 1024 * 1024)],
      'large.txt',
      { type: 'text/plain' }
    );

    expect(validateFile(smallFile, config).valid).toBe(true);
    expect(validateFile(largeFile, config).valid).toBe(false);
  });

  test('should validate file type', () => {
    const validFile = new File(['valid'], 'valid.txt', { type: 'text/plain' });
    const invalidFile = new File(['invalid'], 'invalid.exe', {
      type: 'application/x-msdownload',
    });

    expect(validateFile(validFile, config).valid).toBe(true);
    expect(validateFile(invalidFile, config).valid).toBe(false);
  });

  test('should validate multiple files', () => {
    const files = [
      new File(['file1'], 'file1.txt', { type: 'text/plain' }),
      new File(['file2'], 'file2.jpg', { type: 'image/jpeg' }),
      new File(['file3'], 'file3.exe', { type: 'application/x-msdownload' }),
    ];

    const { validFiles, errors } = validateFiles(files, [], config);

    expect(validFiles).toHaveLength(2);
    expect(errors).toHaveLength(1);
  });

  test('should categorize files correctly', () => {
    const imageFile = new File(['img'], 'image.jpg', { type: 'image/jpeg' });
    const textFile = new File(['text'], 'text.txt', { type: 'text/plain' });
    const pdfFile = new File(['pdf'], 'doc.pdf', { type: 'application/pdf' });
    const codeFile = new File(['code'], 'code.ts', { type: 'text/typescript' });

    expect(categorizeFile(imageFile)).toBe(FileTypeCategory.IMAGE);
    expect(categorizeFile(textFile)).toBe(FileTypeCategory.TEXT);
    expect(categorizeFile(pdfFile)).toBe(FileTypeCategory.PDF);
    expect(categorizeFile(codeFile)).toBe(FileTypeCategory.CODE);
  });
});

describe('File Utilities', () => {
  test('should format file sizes correctly', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(1024)).toBe('1.00 KB');
    expect(formatFileSize(1024 * 1024)).toBe('1.00 MB');
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.00 GB');
  });

  test('should handle edge cases in file size formatting', () => {
    expect(formatFileSize(1023)).toBe('1023.00 B');
    expect(formatFileSize(1536)).toBe('1.50 KB');
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.50 MB');
  });
});

describe('File Type Detection', () => {
  test('should detect image files', () => {
    const jpgFile = new File([''], 'photo.jpg', { type: 'image/jpeg' });
    const pngFile = new File([''], 'graphic.png', { type: 'image/png' });
    const svgFile = new File([''], 'icon.svg', { type: 'image/svg+xml' });

    expect(categorizeFile(jpgFile)).toBe(FileTypeCategory.IMAGE);
    expect(categorizeFile(pngFile)).toBe(FileTypeCategory.IMAGE);
    expect(categorizeFile(svgFile)).toBe(FileTypeCategory.IMAGE);
  });

  test('should detect code files by extension', () => {
    const jsFile = new File([''], 'script.js', { type: '' });
    const tsFile = new File([''], 'app.ts', { type: '' });
    const pyFile = new File([''], 'main.py', { type: '' });

    expect(categorizeFile(jsFile)).toBe(FileTypeCategory.CODE);
    expect(categorizeFile(tsFile)).toBe(FileTypeCategory.CODE);
    expect(categorizeFile(pyFile)).toBe(FileTypeCategory.CODE);
  });

  test('should detect PDF files', () => {
    const pdfFile = new File([''], 'document.pdf', { type: 'application/pdf' });
    expect(categorizeFile(pdfFile)).toBe(FileTypeCategory.PDF);
  });

  test('should detect text files', () => {
    const txtFile = new File([''], 'readme.txt', { type: 'text/plain' });
    const mdFile = new File([''], 'README.md', { type: '' });

    expect(categorizeFile(txtFile)).toBe(FileTypeCategory.TEXT);
    expect(categorizeFile(mdFile)).toBe(FileTypeCategory.TEXT);
  });
});

describe('Upload Configuration', () => {
  test('should apply custom configuration', () => {
    const customConfig = {
      maxFileSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/*'],
    };

    const { result } = renderHook(() =>
      useFileUpload({ config: customConfig })
    );

    expect(result.current.files).toEqual([]);
  });

  test('should trigger callbacks on file operations', async () => {
    const onFileAdded = jest.fn();
    const onFileRemoved = jest.fn();

    const { result } = renderHook(() =>
      useFileUpload({
        callbacks: { onFileAdded, onFileRemoved },
      })
    );

    const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });

    await act(async () => {
      await result.current.addFiles([mockFile]);
    });

    expect(onFileAdded).toHaveBeenCalledTimes(1);

    const fileId = result.current.files[0].id;

    act(() => {
      result.current.removeFile(fileId);
    });

    expect(onFileRemoved).toHaveBeenCalledWith(fileId);
  });
});
