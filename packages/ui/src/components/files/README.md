# File Browser Component

A high-performance, feature-rich file browser component with tree view, virtual scrolling, search, filtering, and sorting capabilities.

## Features

- **Tree View**: Hierarchical folder structure with expand/collapse
- **Virtual Scrolling**: Efficiently handles 10,000+ files using react-window
- **Search**: Real-time search with debouncing across file names and paths
- **Filtering**: Filter by file type (Images, Documents, Code, PDFs, Videos, Audio)
- **Sorting**: Sort by name, date, size, or type (ascending/descending)
- **Multi-Select**: Ctrl+Click for multi-select, Shift+Click for range selection
- **Keyboard Navigation**: Full keyboard support with arrow keys
- **Context Menu**: Right-click menu with actions (Download, Rename, Share, Delete)
- **Dark Mode**: Full dark mode support with Tailwind CSS

## Installation

```bash
# Install dependencies
pnpm add zustand react-window react-virtualized-auto-sizer lucide-react
```

## Usage

### Basic Example

```tsx
import React from 'react';
import { FileBrowser } from '@/components/files';
import type { FileItem } from '@/types/fileBrowser';

const MyComponent = () => {
  const files: FileItem[] = [
    {
      id: '1',
      name: 'Documents',
      type: 'folder',
      size: 0,
      created_at: Date.now(),
      updated_at: Date.now(),
      path: '/Documents',
    },
    {
      id: '2',
      name: 'report.pdf',
      type: 'file',
      size: 2048576,
      created_at: Date.now(),
      updated_at: Date.now(),
      mime_type: 'application/pdf',
      parent_id: '1',
      path: '/Documents/report.pdf',
    },
  ];

  return (
    <FileBrowser
      files={files}
      onFileClick={(file) => console.log('Clicked:', file.name)}
      onFileDoubleClick={(file) => console.log('Opened:', file.name)}
      height="600px"
    />
  );
};
```

### With All Features

```tsx
import React from 'react';
import { FileBrowser } from '@/components/files';

const AdvancedExample = () => {
  const handleFileDownload = (file) => {
    // Implement download logic
    fetch(`/api/files/${file.id}/download`)
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
      });
  };

  const handleFileDelete = async (file) => {
    await fetch(`/api/files/${file.id}`, { method: 'DELETE' });
    // Refresh file list
  };

  const handleFileRename = async (file, newName) => {
    await fetch(`/api/files/${file.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: newName }),
    });
    // Refresh file list
  };

  const handleFileShare = (file) => {
    navigator.clipboard.writeText(`https://example.com/files/${file.id}`);
    alert('Share link copied to clipboard!');
  };

  return (
    <FileBrowser
      files={files}
      onFileClick={(file) => console.log('Clicked:', file.name)}
      onFileDoubleClick={(file) => window.open(`/files/${file.id}`, '_blank')}
      onFileDownload={handleFileDownload}
      onFileDelete={handleFileDelete}
      onFileRename={handleFileRename}
      onFileShare={handleFileShare}
      height="800px"
      enableKeyboardNavigation
    />
  );
};
```

## Props

### FileBrowserProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `files` | `FileItem[]` | required | Array of files and folders to display |
| `onFileClick` | `(file: FileItem) => void` | - | Called when a file/folder is clicked |
| `onFileDoubleClick` | `(file: FileItem) => void` | - | Called when a file/folder is double-clicked |
| `onFileDownload` | `(file: FileItem) => void` | - | Called when download is selected from context menu |
| `onFileDelete` | `(file: FileItem) => void` | - | Called when delete is selected from context menu |
| `onFileRename` | `(file: FileItem, newName: string) => void` | - | Called when rename is selected from context menu |
| `onFileShare` | `(file: FileItem) => void` | - | Called when share is selected from context menu |
| `className` | `string` | `''` | Additional CSS classes for the container |
| `height` | `string \| number` | `'100%'` | Height of the file browser |
| `enableKeyboardNavigation` | `boolean` | `true` | Enable keyboard shortcuts |

### FileItem

```typescript
interface FileItem {
  id: string;                 // Unique identifier
  name: string;               // File/folder name
  type: 'file' | 'folder';    // Item type
  size: number;               // File size in bytes
  created_at: number;         // Creation timestamp
  updated_at: number;         // Last modified timestamp
  mime_type?: string;         // MIME type (for files)
  parent_id?: string;         // Parent folder ID
  path: string;               // Full path
  children?: FileItem[];      // Child items (for folders)
  isExpanded?: boolean;       // Expansion state (managed by store)
  depth?: number;             // Tree depth (managed by store)
}
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Arrow Up/Down` | Navigate files |
| `Arrow Right` | Expand folder |
| `Arrow Left` | Collapse folder |
| `Enter` | Open file or toggle folder |
| `Shift + Click` | Range select |
| `Ctrl/Cmd + Click` | Multi-select |
| `Ctrl/Cmd + A` | Select all |
| `Delete` | Delete selected files |
| `Escape` | Clear selection and close menus |

## File Type Filters

The component automatically categorizes files by type:

- **Images**: `.jpg`, `.png`, `.gif`, `.svg`, `.webp`, etc.
- **Documents**: `.pdf`, `.doc`, `.docx`, `.txt`, `.xls`, `.xlsx`, etc.
- **Code**: `.js`, `.ts`, `.jsx`, `.tsx`, `.html`, `.css`, `.json`, `.py`, etc.
- **PDFs**: `.pdf`
- **Videos**: `.mp4`, `.webm`, `.ogg`, `.avi`, etc.
- **Audio**: `.mp3`, `.wav`, `.ogg`, `.m4a`, etc.

## Performance

The file browser uses virtual scrolling via `react-window` to efficiently render large file lists:

- Handles 10,000+ files smoothly
- Only renders visible items (with overscan)
- Minimal memory footprint
- 60fps scrolling performance

## State Management

The component uses Zustand for state management with the following features:

- Tree flattening for virtual scrolling
- Efficient selection tracking with `Set`
- Smart filtering and sorting
- Devtools integration for debugging

## Customization

### Styling

The component uses Tailwind CSS classes and can be customized via:

1. **CSS classes**: Pass `className` prop
2. **Tailwind config**: Customize theme colors
3. **Component override**: Copy and modify component files

### Context Menu Actions

Customize context menu actions by modifying `useFileBrowser.ts`:

```typescript
const contextMenuActions: ContextMenuAction[] = [
  {
    id: 'custom-action',
    label: 'Custom Action',
    icon: MyIcon,
    onClick: (fileId) => {
      // Custom logic
    },
  },
  // ... existing actions
];
```

## Architecture

### Component Structure

```
FileBrowser (Main container)
├── FileSearch (Search bar with filters)
├── FileTree (Virtual scrolled tree)
│   └── FileItem (Individual file/folder)
└── ContextMenu (Right-click menu)
```

### Data Flow

1. **Files** are passed to `FileBrowser`
2. Files are stored in **Zustand store**
3. Store builds **tree structure**
4. Tree is **flattened** for virtual scrolling
5. **FileTree** renders visible items
6. User interactions update **store state**

### File Organization

- `FileBrowser.tsx` - Main component
- `FileTree.tsx` - Virtual scrolled tree
- `FileItem.tsx` - Individual item renderer
- `FileSearch.tsx` - Search and filter controls
- `useFileBrowser.ts` - Custom hook with logic
- `fileBrowser.ts` (store) - Zustand state management
- `fileBrowser.ts` (types) - TypeScript definitions

## Browser Support

- Chrome/Edge: Latest
- Firefox: Latest
- Safari: Latest
- Mobile browsers: iOS Safari, Chrome Mobile

## Accessibility

- ARIA labels on interactive elements
- Keyboard navigation support
- Focus management
- Screen reader friendly
- High contrast mode support

## Examples

See `FileBrowser.example.tsx` for a complete working example with:
- Mock data generation
- All event handlers
- Keyboard shortcuts demo
- Feature documentation

## Troubleshooting

### Virtual scrolling issues

If items aren't rendering correctly:
1. Ensure all files have unique `id`s
2. Check that `parent_id` references are valid
3. Verify `depth` is being calculated correctly

### Performance issues

If the browser is slow:
1. Reduce `overscanCount` in `FileTree.tsx`
2. Optimize file filtering logic
3. Use `React.memo` for custom item renderers

### Selection not working

If multi-select isn't working:
1. Check that `enableKeyboardNavigation` is true
2. Verify event handlers are attached
3. Ensure Zustand store is initialized

## License

MIT

## Contributing

Contributions welcome! Please follow the existing code style and include tests.
