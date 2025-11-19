import React, { useState } from 'react';
import { FolderOpen, Folder, FileCode, FileText, Terminal, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LSWidgetProps {
  path: string;
  result?: any;
}

export const LSWidget: React.FC<LSWidgetProps> = ({ path, result }) => {
  // If we have a result, show it using the LSResultWidget
  if (result) {
    let resultContent = '';
    if (typeof result.content === 'string') {
      resultContent = result.content;
    } else if (result.content && typeof result.content === 'object') {
      if (result.content.text) {
        resultContent = result.content.text;
      } else if (Array.isArray(result.content)) {
        resultContent = result.content
          .map((c: any) => (typeof c === 'string' ? c : c.text || JSON.stringify(c)))
          .join('\n');
      } else {
        resultContent = JSON.stringify(result.content, null, 2);
      }
    }

    return (
      <div className="space-y-2">
        <div className="bg-muted/50 flex items-center gap-2 rounded-lg p-3">
          <FolderOpen className="text-primary h-4 w-4" />
          <span className="text-sm">Directory contents for:</span>
          <code className="bg-background rounded px-2 py-0.5 font-mono text-sm">{path}</code>
        </div>
        {resultContent && <LSResultWidget content={resultContent} />}
      </div>
    );
  }

  return (
    <div className="bg-muted/50 flex items-center gap-2 rounded-lg p-3">
      <FolderOpen className="text-primary h-4 w-4" />
      <span className="text-sm">Listing directory:</span>
      <code className="bg-background rounded px-2 py-0.5 font-mono text-sm">{path}</code>
      {!result && (
        <div className="text-muted-foreground ml-auto flex items-center gap-1 text-xs">
          <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
          <span>Loading...</span>
        </div>
      )}
    </div>
  );
};

interface LSResultWidgetProps {
  content: string;
}

export const LSResultWidget: React.FC<LSResultWidgetProps> = ({ content }) => {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  // Parse the directory tree structure
  const parseDirectoryTree = (rawContent: string) => {
    const lines = rawContent.split('\n');
    const entries: Array<{
      path: string;
      name: string;
      type: 'file' | 'directory';
      level: number;
    }> = [];

    let currentPath: string[] = [];

    for (const line of lines) {
      // Skip NOTE section and everything after it
      if (line.startsWith('NOTE:')) {
        break;
      }

      // Skip empty lines
      if (!line.trim()) continue;

      // Calculate indentation level
      const indent = line.match(/^(\s*)/)?.[1] || '';
      const level = Math.floor(indent.length / 2);

      // Extract the entry name
      const entryMatch = line.match(/^\s*-\s+(.+?)(\/$)?$/);
      if (!entryMatch) continue;

      const fullName = entryMatch[1];
      const isDirectory = line.trim().endsWith('/');
      const name = isDirectory ? fullName : fullName;

      // Update current path based on level
      currentPath = currentPath.slice(0, level);
      currentPath.push(name);

      entries.push({
        path: currentPath.join('/'),
        name,
        type: isDirectory ? 'directory' : 'file',
        level,
      });
    }

    return entries;
  };

  const entries = parseDirectoryTree(content);

  const toggleDirectory = (path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  // Group entries by parent for collapsible display
  const getChildren = (parentPath: string, parentLevel: number) => {
    return entries.filter((e) => {
      if (e.level !== parentLevel + 1) return false;
      const parentParts = parentPath.split('/').filter(Boolean);
      const entryParts = e.path.split('/').filter(Boolean);

      // Check if this entry is a direct child of the parent
      if (entryParts.length !== parentParts.length + 1) return false;

      // Check if all parent parts match
      for (let i = 0; i < parentParts.length; i++) {
        if (parentParts[i] !== entryParts[i]) return false;
      }

      return true;
    });
  };

  const renderEntry = (entry: (typeof entries)[0], isRoot = false) => {
    const hasChildren =
      entry.type === 'directory' &&
      entries.some((e) => e.path.startsWith(entry.path + '/') && e.level === entry.level + 1);
    const isExpanded = expandedDirs.has(entry.path) || isRoot;

    const getIcon = () => {
      if (entry.type === 'directory') {
        return isExpanded ? (
          <FolderOpen className="h-3.5 w-3.5 text-blue-500" />
        ) : (
          <Folder className="h-3.5 w-3.5 text-blue-500" />
        );
      }

      // File type icons based on extension
      const ext = entry.name.split('.').pop()?.toLowerCase();
      switch (ext) {
        case 'rs':
          return <FileCode className="h-3.5 w-3.5 text-orange-500" />;
        case 'toml':
        case 'yaml':
        case 'yml':
        case 'json':
          return <FileText className="h-3.5 w-3.5 text-yellow-500" />;
        case 'md':
          return <FileText className="h-3.5 w-3.5 text-blue-400" />;
        case 'js':
        case 'jsx':
        case 'ts':
        case 'tsx':
          return <FileCode className="h-3.5 w-3.5 text-yellow-400" />;
        case 'py':
          return <FileCode className="h-3.5 w-3.5 text-blue-500" />;
        case 'go':
          return <FileCode className="h-3.5 w-3.5 text-cyan-500" />;
        case 'sh':
        case 'bash':
          return <Terminal className="h-3.5 w-3.5 text-green-500" />;
        default:
          return <FileText className="text-muted-foreground h-3.5 w-3.5" />;
      }
    };

    return (
      <div key={entry.path}>
        <div
          className={cn(
            'hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded px-2 py-1 transition-colors',
            !isRoot && 'ml-4'
          )}
          onClick={() => entry.type === 'directory' && hasChildren && toggleDirectory(entry.path)}
        >
          {entry.type === 'directory' && hasChildren && (
            <ChevronRight
              className={cn(
                'text-muted-foreground h-3 w-3 transition-transform',
                isExpanded && 'rotate-90'
              )}
            />
          )}
          {(!hasChildren || entry.type !== 'directory') && <div className="w-3" />}
          {getIcon()}
          <span className="font-mono text-sm">{entry.name}</span>
        </div>

        {entry.type === 'directory' && hasChildren && isExpanded && (
          <div className="ml-2">
            {getChildren(entry.path, entry.level).map((child) => renderEntry(child))}
          </div>
        )}
      </div>
    );
  };

  // Get root entries
  const rootEntries = entries.filter((e) => e.level === 0);

  return (
    <div className="bg-muted/20 rounded-lg border p-3">
      <div className="space-y-1">{rootEntries.map((entry) => renderEntry(entry, true))}</div>
    </div>
  );
};
