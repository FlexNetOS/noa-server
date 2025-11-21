# File Preview Components

Production-ready file preview components for PDF, images, markdown, code, and text files with lazy loading, error handling, and TypeScript support.

## Components

### FilePreviewModal

Main modal container that routes to specific file preview types based on file extension and MIME type.

**Features:**
- Lazy loading of preview components for optimal performance
- Automatic file type detection
- Modal overlay with header and controls
- Download support
- Keyboard shortcuts (Escape to close)

**Usage:**
```tsx
import { FilePreviewModal } from '@noa/ui/files';

const [previewFile, setPreviewFile] = useState<FileItem | null>(null);

<FilePreviewModal
  file={previewFile}
  onClose={() => setPreviewFile(null)}
  onDownload={handleDownload}
  fetchContent={fetchFileContent}
/>
```

**Props:**
- `file: FileItem | null` - File to preview
- `onClose: () => void` - Close handler
- `onDownload?: (file: FileItem) => void` - Optional download handler
- `fetchContent?: (file: FileItem) => Promise<string | ArrayBuffer>` - Content fetcher

### PDFPreview

PDF viewer with zoom, navigation, and search using pdfjs-dist 5.4.54.

**Features:**
- Page navigation (previous/next)
- Zoom controls (50% - 300%)
- Text search across all pages
- Canvas-based rendering
- Error handling and loading states

**Controls:**
- Navigate: Previous/Next buttons or arrow keys
- Zoom: In/Out buttons or mouse wheel
- Search: Enter search text and press Enter

**Usage:**
```tsx
import { PDFPreview } from '@noa/ui/files';

<PDFPreview
  file={fileItem}
  content={pdfArrayBuffer}
/>
```

### ImagePreview

Image viewer with zoom and pan using react-zoom-pan-pinch.

**Features:**
- Zoom in/out (50% - 500%)
- Pan and drag
- Rotation (90° increments)
- Reset view
- Touch gestures support

**Controls:**
- Zoom: Buttons or scroll wheel
- Pan: Click and drag
- Rotate: Rotate button
- Reset: Maximize button

**Usage:**
```tsx
import { ImagePreview } from '@noa/ui/files';

<ImagePreview
  file={fileItem}
  content={imageUrl}
/>
```

### MarkdownPreview

Markdown renderer with syntax highlighting using remark and rehype.

**Features:**
- GitHub Flavored Markdown (GFM)
- Syntax highlighting for code blocks
- Tables, task lists, strikethrough
- Auto-linking
- Custom styling with dark mode support

**Supported Features:**
- Headings (H1-H6)
- Code blocks with language detection
- Inline code
- Tables
- Lists (ordered/unordered)
- Blockquotes
- Links and images
- Horizontal rules

**Usage:**
```tsx
import { MarkdownPreview } from '@noa/ui/files';

<MarkdownPreview
  file={fileItem}
  content={markdownText}
/>
```

### CodePreview

Code viewer with syntax highlighting and line numbers using highlight.js.

**Features:**
- Syntax highlighting for 100+ languages
- Line numbers
- Copy to clipboard
- Language detection from extension
- Statistics (line count)
- Dark theme optimized

**Supported Languages:**
JavaScript, TypeScript, Python, Java, C++, C, C#, PHP, Go, Rust, Swift, Kotlin, Scala, SQL, Bash, JSON, XML, HTML, CSS, SCSS, YAML, TOML, Markdown, and more.

**Usage:**
```tsx
import { CodePreview } from '@noa/ui/files';

<CodePreview
  file={fileItem}
  content={codeText}
/>
```

### TextPreview

Plain text viewer with search and formatting controls.

**Features:**
- Text search with highlighting
- Font size controls (10px - 24px)
- Text wrapping toggle
- Statistics (lines, words, characters)
- Smooth scrolling

**Controls:**
- Search: Enter text in search box
- Font size: +/- buttons
- Wrap: Toggle button

**Usage:**
```tsx
import { TextPreview } from '@noa/ui/files';

<TextPreview
  file={fileItem}
  content={plainText}
/>
```

## File Type Detection

The `FilePreviewModal` automatically detects file types based on:

1. MIME type (primary)
2. File extension (fallback)

**Supported File Types:**

| Category | Extensions | MIME Types |
|----------|-----------|------------|
| PDF | `.pdf` | `application/pdf` |
| Images | `.jpg`, `.jpeg`, `.png`, `.gif`, `.svg`, `.webp`, `.bmp` | `image/*` |
| Markdown | `.md`, `.markdown` | `text/markdown` |
| Code | `.js`, `.ts`, `.tsx`, `.jsx`, `.py`, `.java`, `.cpp`, `.c`, etc. | Various |
| Text | `.txt`, all others | `text/plain`, `text/*` |

## Integration Example

Complete integration with FileBrowser:

```tsx
import React, { useState } from 'react';
import { FileBrowser, FilePreviewModal } from '@noa/ui/files';
import type { FileItem } from '@noa/ui/types';

export const MyFileBrowser = () => {
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);

  const fetchFileContent = async (file: FileItem): Promise<string | ArrayBuffer> => {
    // Fetch file content from your API
    const response = await fetch(`/api/files/${file.id}`);

    // For binary files (PDF, images)
    if (file.mime_type === 'application/pdf') {
      return await response.arrayBuffer();
    }

    // For text files
    return await response.text();
  };

  return (
    <>
      <FileBrowser
        files={files}
        onFileDoubleClick={(file) => {
          if (file.type === 'file') {
            setPreviewFile(file);
          }
        }}
      />

      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
          fetchContent={fetchFileContent}
        />
      )}
    </>
  );
};
```

## Performance Optimization

### Lazy Loading

All preview components are lazy-loaded using React.lazy() for optimal bundle size:

```tsx
const PDFPreview = lazy(() => import('./PDFPreview'));
const ImagePreview = lazy(() => import('./ImagePreview'));
// ... etc
```

### PDF.js Worker

PDF.js worker is loaded asynchronously and bundled inline to avoid CDN dependencies:

```tsx
import('pdfjs-dist/build/pdf.worker.min.mjs?url').then((module) => {
  pdfjs.GlobalWorkerOptions.workerSrc = module.default;
});
```

### Bundle Size

Approximate component sizes (gzipped):
- FilePreviewModal: ~5 KB
- PDFPreview: ~180 KB (includes pdfjs-dist)
- ImagePreview: ~8 KB
- MarkdownPreview: ~15 KB
- CodePreview: ~80 KB (includes highlight.js)
- TextPreview: ~3 KB

## Browser Compatibility

- Chrome/Edge: 90+
- Firefox: 88+
- Safari: 14+
- Mobile: iOS Safari 14+, Chrome Android 90+

## Dependencies

```json
{
  "pdfjs-dist": "5.4.54",
  "react-zoom-pan-pinch": "^3.7.0",
  "remark-gfm": "^4.0.1",
  "remark-breaks": "^4.0.0",
  "remark-rehype": "^11.1.2",
  "rehype-highlight": "^7.0.2",
  "rehype-stringify": "^10.0.1",
  "highlight.js": "^11.11.1"
}
```

## Accessibility

All components follow WCAG 2.1 Level AA guidelines:
- Keyboard navigation support
- ARIA labels and roles
- Focus management
- Screen reader friendly
- High contrast mode support

## Error Handling

All components include:
- Loading states with spinners
- Error boundaries
- Graceful fallbacks
- User-friendly error messages
- Console error logging for debugging

## Styling

Components use Tailwind CSS with dark mode support:
- Light mode optimized
- Dark mode compatible
- Custom scrollbars
- Smooth transitions
- Responsive design

## Troubleshooting

### PDF Preview Issues

**Problem:** PDF not rendering
**Solution:** Ensure PDF.js worker is loaded. Check browser console for errors.

```tsx
// Verify worker is loaded
console.log(pdfjs.GlobalWorkerOptions.workerSrc);
```

**Problem:** Large PDFs slow to load
**Solution:** Implement pagination or lazy page rendering.

### Image Preview Issues

**Problem:** Image not loading
**Solution:** Check image URL and CORS settings.

**Problem:** Zoom not working
**Solution:** Ensure TransformWrapper is properly initialized.

### Code/Markdown Syntax Highlighting

**Problem:** No syntax highlighting
**Solution:** Import highlight.js styles:

```tsx
import 'highlight.js/styles/github-dark.css';
```

## License

MIT

## Support

For issues and feature requests, please visit the GitHub repository.
