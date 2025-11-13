# File Upload Component - Implementation Guide

## Overview

The File Upload component provides a complete solution for handling file uploads with drag-drop, progress tracking, validation, and multi-file support. Built with React, TypeScript, react-dropzone, axios, and Framer Motion.

## Architecture

### Component Structure

```
packages/ui/src/
├── components/files/
│   ├── FileUpload.tsx           # Main upload component with drag-drop
│   ├── FilePreview.tsx          # Individual file preview cards
│   ├── UploadProgress.tsx       # Progress bar component
│   ├── FileUpload.example.tsx   # 8 usage examples
│   └── __tests__/
│       └── FileUpload.test.tsx  # Comprehensive tests
├── hooks/
│   └── useFileUpload.ts         # Custom hook for upload logic
├── utils/
│   └── fileValidation.ts        # Validation and utilities
└── types/
    └── files.ts                 # TypeScript definitions
```

### Key Features

1. **Drag-and-Drop Interface**
   - Visual feedback on drag hover
   - Rejection state for invalid files
   - Click-to-select fallback
   - Multi-file support

2. **File Validation**
   - MIME type checking
   - File extension validation
   - Size limits (per file and total)
   - Category detection (image, PDF, code, etc.)

3. **Progress Tracking**
   - Real-time upload progress
   - Speed calculation (bytes/sec)
   - Remaining time estimation
   - Individual and total progress

4. **File Processing**
   - Automatic thumbnail generation for images
   - Text content extraction for code/text files
   - Preview generation
   - Metadata extraction

5. **Upload Management**
   - Upload cancellation
   - Retry failed uploads
   - Auto-upload mode
   - Batch operations

## Usage

### Basic Implementation

```tsx
import { FileUpload } from '@noa/ui/components/files';

function App() {
  return (
    <FileUpload
      config={{
        maxFileSize: 100 * 1024 * 1024, // 100MB
        maxTotalSize: 500 * 1024 * 1024, // 500MB
        multiple: true,
      }}
      callbacks={{
        onUploadComplete: (fileId, response) => {
          console.log('Upload complete:', response);
        },
      }}
    />
  );
}
```

### Advanced Usage with Custom Hook

```tsx
import { useFileUpload } from '@noa/ui/hooks/useFileUpload';

function CustomUploader() {
  const {
    files,
    addFiles,
    removeFile,
    uploadAll,
    isUploading,
    totalProgress,
  } = useFileUpload({
    uploadUrl: '/api/upload',
    callbacks: {
      onUploadComplete: (fileId, response) => {
        // Handle successful upload
      },
    },
  });

  return (
    <div>
      <button onClick={uploadAll} disabled={isUploading}>
        Upload All ({totalProgress}%)
      </button>
      {files.map(file => (
        <div key={file.id}>
          {file.name} - {file.progress}%
        </div>
      ))}
    </div>
  );
}
```

## Configuration

### FileUploadConfig

```typescript
interface FileUploadConfig {
  maxFileSize: number;          // Maximum size per file (bytes)
  maxTotalSize: number;         // Maximum total size (bytes)
  allowedTypes: string[];       // MIME types (e.g., 'image/*')
  allowedExtensions: string[];  // File extensions (e.g., '.jpg')
  multiple: boolean;            // Allow multiple files
  autoUpload: boolean;          // Upload immediately on add
  uploadUrl?: string;           // Upload endpoint URL
}
```

### Default Configuration

```typescript
const DEFAULT_CONFIG = {
  maxFileSize: 100 * 1024 * 1024,    // 100MB
  maxTotalSize: 500 * 1024 * 1024,   // 500MB
  allowedTypes: [
    'image/*',
    'application/pdf',
    'text/*',
    'application/json',
  ],
  allowedExtensions: [
    '.md', '.txt', '.js', '.ts', '.tsx', '.jsx',
    '.json', '.csv', '.py', '.java', '.cpp',
  ],
  multiple: true,
  autoUpload: false,
};
```

## File Type Categories

The system automatically categorizes files into:

- **IMAGE**: JPEG, PNG, GIF, SVG, WebP
- **PDF**: PDF documents
- **TEXT**: Plain text, Markdown, CSV
- **CODE**: JavaScript, TypeScript, Python, Java, etc.
- **DOCUMENT**: DOC, DOCX, ODT, RTF
- **AUDIO**: MP3, WAV, OGG
- **VIDEO**: MP4, WebM
- **UNKNOWN**: Other file types

## Callbacks

### Available Callbacks

```typescript
interface FileUploadCallbacks {
  onFileAdded?: (file: UploadedFile) => void;
  onFileRemoved?: (fileId: string) => void;
  onUploadStart?: (fileId: string) => void;
  onUploadProgress?: (fileId: string, progress: UploadProgressInfo) => void;
  onUploadComplete?: (fileId: string, response?: any) => void;
  onUploadError?: (fileId: string, error: string) => void;
  onAllComplete?: () => void;
}
```

### Example with All Callbacks

```tsx
<FileUpload
  callbacks={{
    onFileAdded: (file) => {
      console.log('File added:', file.name);
    },
    onUploadStart: (fileId) => {
      console.log('Upload started:', fileId);
    },
    onUploadProgress: (fileId, progress) => {
      console.log(`Progress: ${progress.percentage}%`);
      console.log(`Speed: ${progress.speed} bytes/s`);
      console.log(`Remaining: ${progress.remaining}s`);
    },
    onUploadComplete: (fileId, response) => {
      console.log('Upload complete:', response);
    },
    onUploadError: (fileId, error) => {
      console.error('Upload error:', error);
    },
    onAllComplete: () => {
      console.log('All uploads complete!');
    },
  }}
/>
```

## File Validation

### Validation Functions

```typescript
import { validateFile, validateFiles } from '@noa/ui/utils/fileValidation';

// Validate single file
const result = validateFile(file, config);
if (result.valid) {
  console.log('File is valid, category:', result.category);
} else {
  console.error('Validation error:', result.error);
}

// Validate multiple files
const { validFiles, errors } = validateFiles(files, existingFiles, config);
```

### Custom Validation

```tsx
const customConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/png'],
  allowedExtensions: ['.jpg', '.jpeg', '.png'],
};

<FileUpload config={customConfig} />
```

## Upload Progress

### Progress Information

```typescript
interface UploadProgressInfo {
  loaded: number;        // Bytes uploaded
  total: number;         // Total bytes
  percentage: number;    // Progress percentage (0-100)
  speed: number;         // Upload speed (bytes/sec)
  remaining: number;     // Estimated seconds remaining
}
```

### Monitoring Progress

```tsx
<FileUpload
  callbacks={{
    onUploadProgress: (fileId, progress) => {
      console.log(`File ${fileId}:`);
      console.log(`- Uploaded: ${formatFileSize(progress.loaded)}`);
      console.log(`- Total: ${formatFileSize(progress.total)}`);
      console.log(`- Progress: ${progress.percentage}%`);
      console.log(`- Speed: ${formatSpeed(progress.speed)}`);
      console.log(`- Remaining: ${formatTime(progress.remaining)}`);
    },
  }}
/>
```

## Utility Functions

### File Size Formatting

```typescript
import { formatFileSize, formatSpeed, formatTime } from '@noa/ui/utils/fileValidation';

formatFileSize(1024);          // "1.00 KB"
formatFileSize(1024 * 1024);   // "1.00 MB"
formatSpeed(512 * 1024);       // "512.00 KB/s"
formatTime(125);               // "2m 5s"
```

### File Categorization

```typescript
import { categorizeFile, FileTypeCategory } from '@noa/ui/utils/fileValidation';

const category = categorizeFile(file);

switch (category) {
  case FileTypeCategory.IMAGE:
    // Handle image file
    break;
  case FileTypeCategory.CODE:
    // Handle code file
    break;
  // ... other categories
}
```

### Thumbnail Generation

```typescript
import { createImageThumbnail } from '@noa/ui/utils/fileValidation';

const thumbnailUrl = await createImageThumbnail(imageFile, 200, 200);
// Returns data URL for thumbnail
```

## Examples

### 1. Image Gallery Upload

```tsx
function ImageGallery() {
  const [images, setImages] = useState<UploadedFile[]>([]);

  return (
    <FileUpload
      config={{
        allowedTypes: ['image/*'],
        maxFileSize: 10 * 1024 * 1024,
      }}
      callbacks={{
        onFileAdded: (file) => setImages(prev => [...prev, file]),
        onFileRemoved: (fileId) =>
          setImages(prev => prev.filter(f => f.id !== fileId)),
      }}
    />
  );
}
```

### 2. Auto-Upload Documents

```tsx
function DocumentUpload() {
  return (
    <FileUpload
      config={{
        autoUpload: true,
        uploadUrl: '/api/documents/upload',
        allowedTypes: ['application/pdf', 'text/*'],
        maxFileSize: 50 * 1024 * 1024,
      }}
      callbacks={{
        onUploadComplete: (fileId, response) => {
          toast.success(`Document uploaded: ${response.url}`);
        },
        onUploadError: (fileId, error) => {
          toast.error(`Upload failed: ${error}`);
        },
      }}
    />
  );
}
```

### 3. Code File Upload with Preview

```tsx
function CodeUpload() {
  return (
    <FileUpload
      config={{
        allowedExtensions: ['.js', '.ts', '.tsx', '.py', '.java'],
        maxFileSize: 5 * 1024 * 1024,
      }}
      callbacks={{
        onFileAdded: (file) => {
          if (file.textContent) {
            console.log('Code preview:', file.textContent);
          }
        },
      }}
    />
  );
}
```

### 4. Upload with Progress Dashboard

```tsx
function ProgressDashboard() {
  const [stats, setStats] = useState({
    totalFiles: 0,
    completedFiles: 0,
    totalSize: 0,
    uploadedSize: 0,
  });

  return (
    <div>
      <div className="stats-grid">
        <div>Total: {stats.totalFiles}</div>
        <div>Completed: {stats.completedFiles}</div>
        <div>Progress: {Math.round((stats.uploadedSize / stats.totalSize) * 100)}%</div>
      </div>

      <FileUpload
        callbacks={{
          onFileAdded: (file) =>
            setStats(prev => ({
              ...prev,
              totalFiles: prev.totalFiles + 1,
              totalSize: prev.totalSize + file.size,
            })),
          onUploadComplete: () =>
            setStats(prev => ({
              ...prev,
              completedFiles: prev.completedFiles + 1,
            })),
        }}
      />
    </div>
  );
}
```

## Styling

### TailwindCSS Classes

Components use TailwindCSS for styling. Customize with:

```tsx
<FileUpload className="max-w-4xl mx-auto bg-gray-50 rounded-lg shadow-lg" />
```

### Custom Styles

Override component styles:

```css
/* Custom drop zone */
.file-upload-zone {
  @apply border-4 border-dashed border-purple-500 rounded-xl p-12;
}

/* Custom progress bar */
.upload-progress {
  @apply bg-gradient-to-r from-blue-500 to-purple-600;
}
```

## Testing

### Running Tests

```bash
cd packages/ui
npm test
```

### Test Coverage

Tests cover:
- File addition and removal
- Upload progress tracking
- File validation (size, type, extension)
- File categorization
- Utility functions
- Callback execution
- Error handling

## Performance Optimization

### Best Practices

1. **Lazy Loading**: Use code splitting for the component
2. **Virtualization**: For large file lists, use react-window
3. **Debouncing**: Debounce search/filter operations
4. **Memoization**: Use React.memo for file preview components
5. **Cancel Tokens**: Clean up axios cancel tokens properly

### Example Optimization

```tsx
import { lazy, Suspense } from 'react';

const FileUpload = lazy(() => import('@noa/ui/components/files/FileUpload'));

function App() {
  return (
    <Suspense fallback={<div>Loading uploader...</div>}>
      <FileUpload {...props} />
    </Suspense>
  );
}
```

## Accessibility

### ARIA Labels

Components include proper ARIA labels:

```tsx
<div
  role="button"
  aria-label="Upload files by drag and drop or click to select"
  tabIndex={0}
>
  {/* Drop zone content */}
</div>
```

### Keyboard Navigation

- Tab navigation through files
- Enter/Space to trigger actions
- Escape to cancel uploads

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Polyfills Required

- File API
- FormData
- Promise
- Fetch/XMLHttpRequest

## Security Considerations

1. **File Type Validation**: Always validate on server-side too
2. **Size Limits**: Enforce both client and server limits
3. **Sanitization**: Sanitize file names and content
4. **HTTPS**: Use HTTPS for upload endpoints
5. **CSRF Tokens**: Include CSRF protection

### Example Secure Upload

```tsx
<FileUpload
  config={{
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png'],
  }}
  callbacks={{
    onUploadStart: (fileId) => {
      // Add CSRF token to request headers
      axios.defaults.headers.common['X-CSRF-Token'] = getCsrfToken();
    },
  }}
/>
```

## Troubleshooting

### Common Issues

**Issue**: Files not uploading
- Check `uploadUrl` is configured
- Verify CORS settings on server
- Check network tab for errors

**Issue**: Progress not updating
- Ensure server supports progress events
- Check axios onUploadProgress callback

**Issue**: Large files failing
- Increase server upload limits
- Adjust `maxFileSize` config
- Consider chunked uploads for very large files

**Issue**: Thumbnails not generating
- Check file is valid image format
- Verify browser supports Canvas API
- Check console for errors

## API Reference

See TypeScript definitions in `/packages/ui/src/types/files.ts` for complete API documentation.

## Contributing

When adding features:

1. Update TypeScript types
2. Add tests
3. Update documentation
4. Add examples
5. Consider accessibility
6. Test across browsers

## License

MIT License - See LICENSE file for details
