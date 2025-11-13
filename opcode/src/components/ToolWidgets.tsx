import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  FolderOpen,
  FileText,
  Search,
  Terminal,
  FileEdit,
  Code,
  ChevronRight,
  Maximize2,
  GitBranch,
  X,
  Info,
  AlertCircle,
  Settings,
  Fingerprint,
  Cpu,
  FolderSearch,
  List,
  LogOut,
  Edit3,
  FilePlus,
  Book,
  BookOpen,
  Globe,
  ListChecks,
  ListPlus,
  Globe2,
  Package,
  ChevronDown,
  Package2,
  Wrench,
  CheckSquare,
  type LucideIcon,
  Sparkles,
  Bot,
  Zap,
  FileCode,
  Folder,
  ChevronUp,
  BarChart3,
  Download,
  LayoutGrid,
  LayoutList,
  Activity,
  Hash,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { getClaudeSyntaxTheme } from '@/lib/claudeSyntaxTheme';
import { useTheme } from '@/hooks';
import { Button } from '@/components/ui/button';
import { createPortal } from 'react-dom';
import * as Diff from 'diff';
import { Card, CardContent } from '@/components/ui/card';
import { detectLinks, makeLinksClickable } from '@/lib/linkDetector';
import ReactMarkdown from 'react-markdown';
import { open } from '@tauri-apps/plugin-shell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Widget for TodoWrite tool - displays a beautiful TODO list
 */
export const TodoWidget: React.FC<{ todos: any[]; result?: any }> = ({
  todos,
  result: _result,
}) => {
  const statusIcons = {
    completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    in_progress: <Clock className="h-4 w-4 animate-pulse text-blue-500" />,
    pending: <Circle className="text-muted-foreground h-4 w-4" />,
  };

  const priorityColors = {
    high: 'bg-red-500/10 text-red-500 border-red-500/20',
    medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    low: 'bg-green-500/10 text-green-500 border-green-500/20',
  };

  return (
    <div className="space-y-2">
      <div className="mb-3 flex items-center gap-2">
        <FileEdit className="text-primary h-4 w-4" />
        <span className="text-sm font-medium">Todo List</span>
      </div>
      <div className="space-y-2">
        {todos.map((todo, idx) => (
          <div
            key={todo.id || idx}
            className={cn(
              'bg-card/50 flex items-start gap-3 rounded-lg border p-3',
              todo.status === 'completed' && 'opacity-60'
            )}
          >
            <div className="mt-0.5">
              {statusIcons[todo.status as keyof typeof statusIcons] || statusIcons.pending}
            </div>
            <div className="flex-1 space-y-1">
              <p className={cn('text-sm', todo.status === 'completed' && 'line-through')}>
                {todo.content}
              </p>
              {todo.priority && (
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs',
                    priorityColors[todo.priority as keyof typeof priorityColors]
                  )}
                >
                  {todo.priority}
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Widget for LS (List Directory) tool
 */
export const LSWidget: React.FC<{ path: string; result?: any }> = ({ path, result }) => {
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

/**
 * Widget for LS tool result - displays directory tree structure
 */
export const LSResultWidget: React.FC<{ content: string }> = ({ content }) => {
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

/**
 * Widget for Read tool
 */
export const ReadWidget: React.FC<{ filePath: string; result?: any }> = ({ filePath, result }) => {
  // If we have a result, show it using the ReadResultWidget
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
          <FileText className="text-primary h-4 w-4" />
          <span className="text-sm">File content:</span>
          <code className="bg-background flex-1 truncate rounded px-2 py-0.5 font-mono text-sm">
            {filePath}
          </code>
        </div>
        {resultContent && <ReadResultWidget content={resultContent} filePath={filePath} />}
      </div>
    );
  }

  return (
    <div className="bg-muted/50 flex items-center gap-2 rounded-lg p-3">
      <FileText className="text-primary h-4 w-4" />
      <span className="text-sm">Reading file:</span>
      <code className="bg-background flex-1 truncate rounded px-2 py-0.5 font-mono text-sm">
        {filePath}
      </code>
      {!result && (
        <div className="text-muted-foreground ml-auto flex items-center gap-1 text-xs">
          <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
          <span>Loading...</span>
        </div>
      )}
    </div>
  );
};

/**
 * Widget for Read tool result - shows file content with line numbers
 */
export const ReadResultWidget: React.FC<{ content: string; filePath?: string }> = ({
  content,
  filePath,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { theme } = useTheme();
  const syntaxTheme = getClaudeSyntaxTheme(theme);

  // Extract file extension for syntax highlighting
  const getLanguage = (path?: string) => {
    if (!path) return 'text';
    const ext = path.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'tsx',
      js: 'javascript',
      jsx: 'jsx',
      py: 'python',
      rs: 'rust',
      go: 'go',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      cs: 'csharp',
      php: 'php',
      rb: 'ruby',
      swift: 'swift',
      kt: 'kotlin',
      scala: 'scala',
      sh: 'bash',
      bash: 'bash',
      zsh: 'bash',
      yaml: 'yaml',
      yml: 'yaml',
      json: 'json',
      xml: 'xml',
      html: 'html',
      css: 'css',
      scss: 'scss',
      sass: 'sass',
      less: 'less',
      sql: 'sql',
      md: 'markdown',
      toml: 'ini',
      ini: 'ini',
      dockerfile: 'dockerfile',
      makefile: 'makefile',
    };
    return languageMap[ext || ''] || 'text';
  };

  // Parse content to separate line numbers from code
  const parseContent = (rawContent: string) => {
    const lines = rawContent.split('\n');
    const codeLines: string[] = [];
    let minLineNumber = Infinity;

    // First, determine if the content is likely a numbered list from the 'read' tool.
    // It is if more than half the non-empty lines match the expected format.
    const nonEmptyLines = lines.filter((line) => line.trim() !== '');
    if (nonEmptyLines.length === 0) {
      return { codeContent: rawContent, startLineNumber: 1 };
    }
    const parsableLines = nonEmptyLines.filter((line) => /^\s*\d+→/.test(line)).length;
    const isLikelyNumbered = parsableLines / nonEmptyLines.length > 0.5;

    if (!isLikelyNumbered) {
      return { codeContent: rawContent, startLineNumber: 1 };
    }

    // If it's a numbered list, parse it strictly.
    for (const line of lines) {
      // Remove leading whitespace before parsing
      const trimmedLine = line.trimStart();
      const match = trimmedLine.match(/^(\d+)→(.*)$/);
      if (match) {
        const lineNum = parseInt(match[1], 10);
        if (minLineNumber === Infinity) {
          minLineNumber = lineNum;
        }
        // Preserve the code content exactly as it appears after the arrow
        codeLines.push(match[2]);
      } else if (line.trim() === '') {
        // Preserve empty lines
        codeLines.push('');
      } else {
        // If a line in a numbered block does not match, it's a formatting anomaly.
        // Render it as a blank line to avoid showing the raw, un-parsed string.
        codeLines.push('');
      }
    }

    // Remove trailing empty lines
    while (codeLines.length > 0 && codeLines[codeLines.length - 1] === '') {
      codeLines.pop();
    }

    return {
      codeContent: codeLines.join('\n'),
      startLineNumber: minLineNumber === Infinity ? 1 : minLineNumber,
    };
  };

  const language = getLanguage(filePath);
  const { codeContent, startLineNumber } = parseContent(content);
  const lineCount = content.split('\n').filter((line) => line.trim()).length;
  const isLargeFile = lineCount > 20;

  return (
    <div className="bg-background w-full overflow-hidden rounded-lg border">
      <div className="bg-muted/50 flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <FileText className="text-muted-foreground h-3.5 w-3.5" />
          <span className="text-muted-foreground font-mono text-xs">
            {filePath || 'File content'}
          </span>
          {isLargeFile && (
            <span className="text-muted-foreground text-xs">({lineCount} lines)</span>
          )}
        </div>
        {isLargeFile && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
          >
            <ChevronRight
              className={cn('h-3 w-3 transition-transform', isExpanded && 'rotate-90')}
            />
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
        )}
      </div>

      {(!isLargeFile || isExpanded) && (
        <div className="relative overflow-x-auto">
          <SyntaxHighlighter
            language={language}
            style={syntaxTheme}
            showLineNumbers
            startingLineNumber={startLineNumber}
            wrapLongLines={false}
            customStyle={{
              margin: 0,
              background: 'transparent',
              lineHeight: '1.6',
            }}
            codeTagProps={{
              style: {
                fontSize: '0.75rem',
              },
            }}
            lineNumberStyle={{
              minWidth: '3.5rem',
              paddingRight: '1rem',
              textAlign: 'right',
              opacity: 0.5,
            }}
          >
            {codeContent}
          </SyntaxHighlighter>
        </div>
      )}

      {isLargeFile && !isExpanded && (
        <div className="text-muted-foreground bg-muted/30 px-4 py-3 text-center text-xs">
          Click "Expand" to view the full file
        </div>
      )}
    </div>
  );
};

/**
 * Widget for Glob tool
 */
export const GlobWidget: React.FC<{ pattern: string; result?: any }> = ({ pattern, result }) => {
  // Extract result content if available
  let resultContent = '';
  let isError = false;

  if (result) {
    isError = result.is_error || false;
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
  }

  return (
    <div className="space-y-2">
      <div className="bg-muted/50 flex items-center gap-2 rounded-lg p-3">
        <Search className="text-primary h-4 w-4" />
        <span className="text-sm">Searching for pattern:</span>
        <code className="bg-background rounded px-2 py-0.5 font-mono text-sm">{pattern}</code>
        {!result && (
          <div className="text-muted-foreground ml-auto flex items-center gap-1 text-xs">
            <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
            <span>Searching...</span>
          </div>
        )}
      </div>

      {/* Show result if available */}
      {result && (
        <div
          className={cn(
            'overflow-x-auto rounded-md border p-3 font-mono text-xs whitespace-pre-wrap',
            isError
              ? 'border-red-500/20 bg-red-500/5 text-red-400'
              : 'border-green-500/20 bg-green-500/5 text-green-300'
          )}
        >
          {resultContent || (isError ? 'Search failed' : 'No matches found')}
        </div>
      )}
    </div>
  );
};

/**
 * Widget for Bash tool
 */
export const BashWidget: React.FC<{
  command: string;
  description?: string;
  result?: any;
}> = ({ command, description, result }) => {
  // Extract result content if available
  let resultContent = '';
  let isError = false;

  if (result) {
    isError = result.is_error || false;
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
  }

  return (
    <div className="bg-background overflow-hidden rounded-lg border">
      <div className="bg-muted/50 flex items-center gap-2 border-b px-4 py-2">
        <Terminal className="h-3.5 w-3.5 text-green-500" />
        <span className="text-muted-foreground font-mono text-xs">Terminal</span>
        {description && (
          <>
            <ChevronRight className="text-muted-foreground h-3 w-3" />
            <span className="text-muted-foreground text-xs">{description}</span>
          </>
        )}
        {/* Show loading indicator when no result yet */}
        {!result && (
          <div className="text-muted-foreground ml-auto flex items-center gap-1 text-xs">
            <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            <span>Running...</span>
          </div>
        )}
      </div>
      <div className="space-y-3 p-4">
        <code className="block font-mono text-xs text-green-400">$ {command}</code>

        {/* Show result if available */}
        {result && (
          <div
            className={cn(
              'mt-3 overflow-x-auto rounded-md border p-3 font-mono text-xs whitespace-pre-wrap',
              isError
                ? 'border-red-500/20 bg-red-500/5 text-red-400'
                : 'border-green-500/20 bg-green-500/5 text-green-300'
            )}
          >
            {resultContent || (isError ? 'Command failed' : 'Command completed')}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Widget for Write tool
 */
export const WriteWidget: React.FC<{ filePath: string; content: string; result?: any }> = ({
  filePath,
  content,
  result: _result,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const { theme } = useTheme();
  const syntaxTheme = getClaudeSyntaxTheme(theme);

  // Extract file extension for syntax highlighting
  const getLanguage = (path: string) => {
    const ext = path.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'tsx',
      js: 'javascript',
      jsx: 'jsx',
      py: 'python',
      rs: 'rust',
      go: 'go',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      cs: 'csharp',
      php: 'php',
      rb: 'ruby',
      swift: 'swift',
      kt: 'kotlin',
      scala: 'scala',
      sh: 'bash',
      bash: 'bash',
      zsh: 'bash',
      yaml: 'yaml',
      yml: 'yaml',
      json: 'json',
      xml: 'xml',
      html: 'html',
      css: 'css',
      scss: 'scss',
      sass: 'sass',
      less: 'less',
      sql: 'sql',
      md: 'markdown',
      toml: 'ini',
      ini: 'ini',
      dockerfile: 'dockerfile',
      makefile: 'makefile',
    };
    return languageMap[ext || ''] || 'text';
  };

  const language = getLanguage(filePath);
  const isLargeContent = content.length > 1000;
  const displayContent = isLargeContent ? content.substring(0, 1000) + '\n...' : content;

  // Maximized view as a modal
  const MaximizedView = () => {
    if (!isMaximized) return null;

    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop with blur */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsMaximized(false)}
        />

        {/* Modal content */}
        <div className="bg-background relative flex h-[90vh] w-[90vw] max-w-7xl flex-col overflow-hidden rounded-lg border shadow-2xl">
          {/* Header */}
          <div className="bg-background flex items-center justify-between border-b px-6 py-4">
            <div className="flex items-center gap-3">
              <FileText className="text-muted-foreground h-4 w-4" />
              <span className="text-muted-foreground font-mono text-sm">{filePath}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsMaximized(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Code content */}
          <div className="flex-1 overflow-auto">
            <SyntaxHighlighter
              language={language}
              style={syntaxTheme}
              customStyle={{
                margin: 0,
                padding: '1.5rem',
                background: 'transparent',
                fontSize: '0.75rem',
                lineHeight: '1.5',
                height: '100%',
              }}
              showLineNumbers
            >
              {content}
            </SyntaxHighlighter>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const CodePreview = ({ codeContent, truncated }: { codeContent: string; truncated: boolean }) => (
    <div
      className="bg-background w-full overflow-hidden rounded-lg border"
      style={{
        height: truncated ? '440px' : 'auto',
        maxHeight: truncated ? '440px' : undefined,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div className="bg-background sticky top-0 z-10 flex items-center justify-between border-b px-4 py-2">
        <span className="text-muted-foreground font-mono text-xs">Preview</span>
        {isLargeContent && truncated && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs whitespace-nowrap">
              Truncated to 1000 chars
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsMaximized(true)}
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-auto">
        <SyntaxHighlighter
          language={language}
          style={syntaxTheme}
          customStyle={{
            margin: 0,
            padding: '1rem',
            background: 'transparent',
            fontSize: '0.75rem',
            lineHeight: '1.5',
            overflowX: 'auto',
          }}
          wrapLongLines={false}
        >
          {codeContent}
        </SyntaxHighlighter>
      </div>
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="bg-muted/50 flex items-center gap-2 rounded-lg p-3">
        <FileEdit className="text-primary h-4 w-4" />
        <span className="text-sm">Writing to file:</span>
        <code className="bg-background flex-1 truncate rounded px-2 py-0.5 font-mono text-sm">
          {filePath}
        </code>
      </div>
      <CodePreview codeContent={displayContent} truncated={true} />
      <MaximizedView />
    </div>
  );
};

/**
 * Widget for Grep tool
 */
export const GrepWidget: React.FC<{
  pattern: string;
  include?: string;
  path?: string;
  exclude?: string;
  result?: any;
}> = ({ pattern, include, path, exclude, result }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Extract result content if available
  let resultContent = '';
  let isError = false;

  if (result) {
    isError = result.is_error || false;
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
  }

  // Parse grep results to extract file paths and matches
  const parseGrepResults = (content: string) => {
    const lines = content.split('\n').filter((line) => line.trim());
    const results: Array<{
      file: string;
      lineNumber: number;
      content: string;
    }> = [];

    lines.forEach((line) => {
      // Common grep output format: filename:lineNumber:content
      const match = line.match(/^(.+?):(\d+):(.*)$/);
      if (match) {
        results.push({
          file: match[1],
          lineNumber: parseInt(match[2], 10),
          content: match[3],
        });
      }
    });

    return results;
  };

  const grepResults = result && !isError ? parseGrepResults(resultContent) : [];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 p-3">
        <Search className="h-4 w-4 text-emerald-500" />
        <span className="text-sm font-medium">Searching with grep</span>
        {!result && (
          <div className="text-muted-foreground ml-auto flex items-center gap-1 text-xs">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            <span>Searching...</span>
          </div>
        )}
      </div>

      {/* Search Parameters */}
      <div className="bg-muted/20 space-y-2 rounded-lg border p-3">
        <div className="grid gap-2">
          {/* Pattern with regex highlighting */}
          <div className="flex items-start gap-3">
            <div className="flex min-w-[80px] items-center gap-1.5">
              <Code className="h-3 w-3 text-emerald-500" />
              <span className="text-muted-foreground text-xs font-medium">Pattern</span>
            </div>
            <code className="flex-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-sm text-emerald-600 dark:text-emerald-400">
              {pattern}
            </code>
          </div>

          {/* Path */}
          {path && (
            <div className="flex items-start gap-3">
              <div className="flex min-w-[80px] items-center gap-1.5">
                <FolderOpen className="text-muted-foreground h-3 w-3" />
                <span className="text-muted-foreground text-xs font-medium">Path</span>
              </div>
              <code className="bg-muted flex-1 truncate rounded px-2 py-1 font-mono text-xs">
                {path}
              </code>
            </div>
          )}

          {/* Include/Exclude patterns in a row */}
          {(include || exclude) && (
            <div className="flex gap-4">
              {include && (
                <div className="flex flex-1 items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <FilePlus className="h-3 w-3 text-green-500" />
                    <span className="text-muted-foreground text-xs font-medium">Include</span>
                  </div>
                  <code className="rounded border border-green-500/20 bg-green-500/10 px-2 py-0.5 font-mono text-xs text-green-600 dark:text-green-400">
                    {include}
                  </code>
                </div>
              )}

              {exclude && (
                <div className="flex flex-1 items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <X className="h-3 w-3 text-red-500" />
                    <span className="text-muted-foreground text-xs font-medium">Exclude</span>
                  </div>
                  <code className="rounded border border-red-500/20 bg-red-500/10 px-2 py-0.5 font-mono text-xs text-red-600 dark:text-red-400">
                    {exclude}
                  </code>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-2">
          {isError ? (
            <div className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
              <div className="text-sm text-red-600 dark:text-red-400">
                {resultContent || 'Search failed'}
              </div>
            </div>
          ) : grepResults.length > 0 ? (
            <>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm font-medium transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
                <span>{grepResults.length} matches found</span>
              </button>

              {isExpanded && (
                <div className="bg-background overflow-hidden rounded-lg border">
                  <div className="max-h-[400px] overflow-y-auto">
                    {grepResults.map((match, idx) => {
                      const fileName = match.file.split('/').pop() || match.file;
                      const dirPath = match.file.substring(0, match.file.lastIndexOf('/'));

                      return (
                        <div
                          key={idx}
                          className={cn(
                            'border-border hover:bg-muted/50 flex items-start gap-3 border-b p-3 transition-colors',
                            idx === grepResults.length - 1 && 'border-b-0'
                          )}
                        >
                          <div className="flex min-w-[60px] items-center gap-2">
                            <FileText className="h-3.5 w-3.5 text-emerald-500" />
                            <span className="font-mono text-xs text-emerald-400">
                              {match.lineNumber}
                            </span>
                          </div>

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-xs font-medium text-blue-400">
                                {fileName}
                              </span>
                              {dirPath && (
                                <span className="text-muted-foreground truncate text-xs">
                                  {dirPath}
                                </span>
                              )}
                            </div>
                            <code className="block font-mono text-xs break-all whitespace-pre-wrap text-zinc-300">
                              {match.content.trim()}
                            </code>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
              <Info className="h-5 w-5 flex-shrink-0 text-amber-500" />
              <div className="text-sm text-amber-600 dark:text-amber-400">
                No matches found for the given pattern.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const getLanguage = (path: string) => {
  const ext = path.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'tsx',
    js: 'javascript',
    jsx: 'jsx',
    py: 'python',
    rs: 'rust',
    go: 'go',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    cs: 'csharp',
    php: 'php',
    rb: 'ruby',
    swift: 'swift',
    kt: 'kotlin',
    scala: 'scala',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    yaml: 'yaml',
    yml: 'yaml',
    json: 'json',
    xml: 'xml',
    html: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    less: 'less',
    sql: 'sql',
    md: 'markdown',
    toml: 'ini',
    ini: 'ini',
    dockerfile: 'dockerfile',
    makefile: 'makefile',
  };
  return languageMap[ext || ''] || 'text';
};

/**
 * Widget for Edit tool - shows the edit operation
 */
export const EditWidget: React.FC<{
  file_path: string;
  old_string: string;
  new_string: string;
  result?: any;
}> = ({ file_path, old_string, new_string, result: _result }) => {
  const { theme } = useTheme();
  const syntaxTheme = getClaudeSyntaxTheme(theme);

  const diffResult = Diff.diffLines(old_string || '', new_string || '', {
    newlineIsToken: true,
    ignoreWhitespace: false,
  });
  const language = getLanguage(file_path);

  return (
    <div className="space-y-2">
      <div className="mb-2 flex items-center gap-2">
        <FileEdit className="text-primary h-4 w-4" />
        <span className="text-sm font-medium">Applying Edit to:</span>
        <code className="bg-background flex-1 truncate rounded px-2 py-0.5 font-mono text-sm">
          {file_path}
        </code>
      </div>

      <div className="bg-background overflow-hidden rounded-lg border font-mono text-xs">
        <div className="max-h-[440px] overflow-x-auto overflow-y-auto">
          {diffResult.map((part, index) => {
            const partClass = part.added ? 'bg-green-950/20' : part.removed ? 'bg-red-950/20' : '';

            if (!part.added && !part.removed && part.count && part.count > 8) {
              return (
                <div
                  key={index}
                  className="bg-muted border-border text-muted-foreground border-y px-4 py-1 text-center text-xs"
                >
                  ... {part.count} unchanged lines ...
                </div>
              );
            }

            const value = part.value.endsWith('\n') ? part.value.slice(0, -1) : part.value;

            return (
              <div key={index} className={cn(partClass, 'flex')}>
                <div className="w-8 flex-shrink-0 text-center select-none">
                  {part.added ? (
                    <span className="text-green-400">+</span>
                  ) : part.removed ? (
                    <span className="text-red-400">-</span>
                  ) : null}
                </div>
                <div className="flex-1">
                  <SyntaxHighlighter
                    language={language}
                    style={syntaxTheme}
                    PreTag="div"
                    wrapLongLines={false}
                    customStyle={{
                      margin: 0,
                      padding: 0,
                      background: 'transparent',
                    }}
                    codeTagProps={{
                      style: {
                        fontSize: '0.75rem',
                        lineHeight: '1.6',
                      },
                    }}
                  >
                    {value}
                  </SyntaxHighlighter>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/**
 * Widget for Edit tool result - shows a diff view
 */
export const EditResultWidget: React.FC<{ content: string }> = ({ content }) => {
  const { theme } = useTheme();
  const syntaxTheme = getClaudeSyntaxTheme(theme);

  // Parse the content to extract file path and code snippet
  const lines = content.split('\n');
  let filePath = '';
  const codeLines: { lineNumber: string; code: string }[] = [];
  let inCodeBlock = false;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');
    if (line.includes('The file') && line.includes('has been updated')) {
      const match = line.match(/The file (.+) has been updated/);
      if (match) {
        filePath = match[1];
      }
    } else if (/^\s*\d+/.test(line)) {
      inCodeBlock = true;
      const lineMatch = line.match(/^\s*(\d+)\t?(.*)$/);
      if (lineMatch) {
        const [, lineNum, codePart] = lineMatch;
        codeLines.push({
          lineNumber: lineNum,
          code: codePart,
        });
      }
    } else if (inCodeBlock) {
      // Allow non-numbered lines inside a code block (for empty lines)
      codeLines.push({ lineNumber: '', code: line });
    }
  }

  const codeContent = codeLines.map((l) => l.code).join('\n');
  const firstNumberedLine = codeLines.find((l) => l.lineNumber !== '');
  const startLineNumber = firstNumberedLine ? parseInt(firstNumberedLine.lineNumber) : 1;
  const language = getLanguage(filePath);

  return (
    <div className="bg-background overflow-hidden rounded-lg border">
      <div className="flex items-center gap-2 border-b bg-emerald-950/30 px-4 py-2">
        <GitBranch className="h-3.5 w-3.5 text-emerald-500" />
        <span className="font-mono text-xs text-emerald-400">Edit Result</span>
        {filePath && (
          <>
            <ChevronRight className="text-muted-foreground h-3 w-3" />
            <span className="text-muted-foreground font-mono text-xs">{filePath}</span>
          </>
        )}
      </div>
      <div className="max-h-[440px] overflow-x-auto">
        <SyntaxHighlighter
          language={language}
          style={syntaxTheme}
          showLineNumbers
          startingLineNumber={startLineNumber}
          wrapLongLines={false}
          customStyle={{
            margin: 0,
            background: 'transparent',
            lineHeight: '1.6',
          }}
          codeTagProps={{
            style: {
              fontSize: '0.75rem',
            },
          }}
          lineNumberStyle={{
            minWidth: '3.5rem',
            paddingRight: '1rem',
            textAlign: 'right',
            opacity: 0.5,
          }}
        >
          {codeContent}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

/**
 * Widget for MCP (Model Context Protocol) tools
 */
export const MCPWidget: React.FC<{
  toolName: string;
  input?: any;
  result?: any;
}> = ({ toolName, input, result: _result }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { theme } = useTheme();
  const syntaxTheme = getClaudeSyntaxTheme(theme);

  // Parse the tool name to extract components
  // Format: mcp__namespace__method
  const parts = toolName.split('__');
  const namespace = parts[1] || '';
  const method = parts[2] || '';

  // Format namespace for display (handle kebab-case and snake_case)
  const formatNamespace = (ns: string) => {
    return ns
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Format method name
  const formatMethod = (m: string) => {
    return m
      .replace(/_/g, ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const hasInput = input && Object.keys(input).length > 0;
  const inputString = hasInput ? JSON.stringify(input, null, 2) : '';
  const isLargeInput = inputString.length > 200;

  // Count tokens approximation (very rough estimate)
  const estimateTokens = (str: string) => {
    // Rough approximation: ~4 characters per token
    return Math.ceil(str.length / 4);
  };

  const inputTokens = hasInput ? estimateTokens(inputString) : 0;

  return (
    <div className="overflow-hidden rounded-lg border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-purple-500/5">
      {/* Header */}
      <div className="border-b border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-purple-500/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Package2 className="h-4 w-4 text-violet-500" />
              <Sparkles className="absolute -top-1 -right-1 h-2.5 w-2.5 text-violet-400" />
            </div>
            <span className="text-sm font-medium text-violet-600 dark:text-violet-400">
              MCP Tool
            </span>
          </div>
          {hasInput && (
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="border-violet-500/30 text-xs text-violet-600 dark:text-violet-400"
              >
                ~{inputTokens} tokens
              </Badge>
              {isLargeInput && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-violet-500 transition-colors hover:text-violet-600"
                >
                  {isExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tool Path */}
      <div className="space-y-3 px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-violet-500">MCP</span>
          <ChevronRight className="text-muted-foreground h-3.5 w-3.5" />
          <span className="font-medium text-purple-600 dark:text-purple-400">
            {formatNamespace(namespace)}
          </span>
          <ChevronRight className="text-muted-foreground h-3.5 w-3.5" />
          <div className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-violet-500" />
            <code className="text-foreground font-mono text-sm font-semibold">
              {formatMethod(method)}
              <span className="text-muted-foreground">()</span>
            </code>
          </div>
        </div>

        {/* Input Parameters */}
        {hasInput && (
          <div
            className={cn(
              'transition-all duration-200',
              !isExpanded && isLargeInput && 'max-h-[200px]'
            )}
          >
            <div className="relative">
              <div
                className={cn(
                  'bg-background/50 overflow-hidden rounded-lg border',
                  !isExpanded && isLargeInput && 'max-h-[200px]'
                )}
              >
                <div className="bg-muted/50 flex items-center gap-2 border-b px-3 py-2">
                  <Code className="h-3 w-3 text-violet-500" />
                  <span className="text-muted-foreground font-mono text-xs">Parameters</span>
                </div>
                <div
                  className={cn('overflow-auto', !isExpanded && isLargeInput && 'max-h-[150px]')}
                >
                  <SyntaxHighlighter
                    language="json"
                    style={syntaxTheme}
                    customStyle={{
                      margin: 0,
                      padding: '0.75rem',
                      background: 'transparent',
                      fontSize: '0.75rem',
                      lineHeight: '1.5',
                    }}
                    wrapLongLines={false}
                  >
                    {inputString}
                  </SyntaxHighlighter>
                </div>
              </div>

              {/* Gradient fade for collapsed view */}
              {!isExpanded && isLargeInput && (
                <div className="from-background/80 pointer-events-none absolute right-0 bottom-0 left-0 h-12 bg-gradient-to-t to-transparent" />
              )}
            </div>

            {/* Expand hint */}
            {!isExpanded && isLargeInput && (
              <div className="mt-2 text-center">
                <button
                  onClick={() => setIsExpanded(true)}
                  className="inline-flex items-center gap-1 text-xs text-violet-500 transition-colors hover:text-violet-600"
                >
                  <ChevronDown className="h-3 w-3" />
                  Show full parameters
                </button>
              </div>
            )}
          </div>
        )}

        {/* No input message */}
        {!hasInput && (
          <div className="text-muted-foreground px-2 text-xs italic">No parameters required</div>
        )}
      </div>
    </div>
  );
};

/**
 * Widget for user commands (e.g., model, clear)
 */
export const CommandWidget: React.FC<{
  commandName: string;
  commandMessage: string;
  commandArgs?: string;
}> = ({ commandName, commandMessage, commandArgs }) => {
  return (
    <div className="bg-background/50 overflow-hidden rounded-lg border">
      <div className="bg-muted/50 flex items-center gap-2 border-b px-4 py-2">
        <Terminal className="h-3.5 w-3.5 text-blue-500" />
        <span className="font-mono text-xs text-blue-400">Command</span>
      </div>
      <div className="space-y-1 p-3">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">$</span>
          <code className="text-foreground font-mono text-sm">{commandName}</code>
          {commandArgs && (
            <code className="text-muted-foreground font-mono text-sm">{commandArgs}</code>
          )}
        </div>
        {commandMessage && commandMessage !== commandName && (
          <div className="text-muted-foreground ml-4 text-xs">{commandMessage}</div>
        )}
      </div>
    </div>
  );
};

/**
 * Widget for command output/stdout
 */
export const CommandOutputWidget: React.FC<{
  output: string;
  onLinkDetected?: (url: string) => void;
}> = ({ output, onLinkDetected }) => {
  // Check for links on mount and when output changes
  React.useEffect(() => {
    if (output && onLinkDetected) {
      const links = detectLinks(output);
      if (links.length > 0) {
        // Notify about the first detected link
        onLinkDetected(links[0].fullUrl);
      }
    }
  }, [output, onLinkDetected]);

  // Parse ANSI codes for basic styling
  const parseAnsiToReact = (text: string) => {
    // Simple ANSI parsing - handles bold (\u001b[1m) and reset (\u001b[22m)
    const parts = text.split(/(\u001b\[\d+m)/);
    let isBold = false;
    const elements: React.ReactNode[] = [];

    parts.forEach((part, idx) => {
      if (part === '\u001b[1m') {
        isBold = true;
        return;
      } else if (part === '\u001b[22m') {
        isBold = false;
        return;
      } else if (part.match(/\u001b\[\d+m/)) {
        // Ignore other ANSI codes for now
        return;
      }

      if (!part) return;

      // Make links clickable within this part
      const linkElements = makeLinksClickable(part, (url) => {
        onLinkDetected?.(url);
      });

      if (isBold) {
        elements.push(
          <span key={idx} className="font-bold">
            {linkElements}
          </span>
        );
      } else {
        elements.push(...linkElements);
      }
    });

    return elements;
  };

  return (
    <div className="bg-background/50 overflow-hidden rounded-lg border">
      <div className="bg-muted/50 flex items-center gap-2 px-4 py-2">
        <ChevronRight className="h-3 w-3 text-green-500" />
        <span className="font-mono text-xs text-green-400">Output</span>
      </div>
      <div className="p-3">
        <pre className="font-mono text-sm whitespace-pre-wrap text-zinc-300">
          {output ? (
            parseAnsiToReact(output)
          ) : (
            <span className="text-zinc-500 italic">No output</span>
          )}
        </pre>
      </div>
    </div>
  );
};

/**
 * Widget for AI-generated summaries
 */
export const SummaryWidget: React.FC<{
  summary: string;
  leafUuid?: string;
}> = ({ summary, leafUuid }) => {
  return (
    <div className="overflow-hidden rounded-lg border border-blue-500/20 bg-blue-500/5">
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="mt-0.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10">
            <Info className="h-4 w-4 text-blue-500" />
          </div>
        </div>
        <div className="flex-1 space-y-1">
          <div className="text-xs font-medium text-blue-600 dark:text-blue-400">AI Summary</div>
          <p className="text-foreground text-sm">{summary}</p>
          {leafUuid && (
            <div className="text-muted-foreground mt-2 text-xs">
              ID: <code className="font-mono">{leafUuid.slice(0, 8)}...</code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Widget for displaying MultiEdit tool usage
 */
export const MultiEditWidget: React.FC<{
  file_path: string;
  edits: Array<{ old_string: string; new_string: string }>;
  result?: any;
}> = ({ file_path, edits, result: _result }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const language = getLanguage(file_path);
  const { theme } = useTheme();
  const syntaxTheme = getClaudeSyntaxTheme(theme);

  return (
    <div className="space-y-2">
      <div className="mb-2 flex items-center gap-2">
        <FileEdit className="text-muted-foreground h-4 w-4" />
        <span className="text-sm font-medium">Using tool: MultiEdit</span>
      </div>
      <div className="ml-6 space-y-2">
        <div className="flex items-center gap-2">
          <FileText className="h-3 w-3 text-blue-500" />
          <code className="font-mono text-xs text-blue-500">{file_path}</code>
        </div>

        <div className="space-y-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
          >
            <ChevronRight
              className={cn('h-3 w-3 transition-transform', isExpanded && 'rotate-90')}
            />
            {edits.length} edit{edits.length !== 1 ? 's' : ''}
          </button>

          {isExpanded && (
            <div className="mt-3 space-y-3">
              {edits.map((edit, index) => {
                const diffResult = Diff.diffLines(edit.old_string || '', edit.new_string || '', {
                  newlineIsToken: true,
                  ignoreWhitespace: false,
                });

                return (
                  <div key={index} className="space-y-1">
                    <div className="text-muted-foreground text-xs font-medium">
                      Edit {index + 1}
                    </div>
                    <div className="bg-background overflow-hidden rounded-lg border font-mono text-xs">
                      <div className="max-h-[300px] overflow-x-auto overflow-y-auto">
                        {diffResult.map((part, partIndex) => {
                          const partClass = part.added
                            ? 'bg-green-950/20'
                            : part.removed
                              ? 'bg-red-950/20'
                              : '';

                          if (!part.added && !part.removed && part.count && part.count > 8) {
                            return (
                              <div
                                key={partIndex}
                                className="bg-muted border-border text-muted-foreground border-y px-4 py-1 text-center text-xs"
                              >
                                ... {part.count} unchanged lines ...
                              </div>
                            );
                          }

                          const value = part.value.endsWith('\n')
                            ? part.value.slice(0, -1)
                            : part.value;

                          return (
                            <div key={partIndex} className={cn(partClass, 'flex')}>
                              <div className="w-8 flex-shrink-0 text-center select-none">
                                {part.added ? (
                                  <span className="text-green-400">+</span>
                                ) : part.removed ? (
                                  <span className="text-red-400">-</span>
                                ) : null}
                              </div>
                              <div className="flex-1">
                                <SyntaxHighlighter
                                  language={language}
                                  style={syntaxTheme}
                                  PreTag="div"
                                  wrapLongLines={false}
                                  customStyle={{
                                    margin: 0,
                                    padding: 0,
                                    background: 'transparent',
                                  }}
                                  codeTagProps={{
                                    style: {
                                      fontSize: '0.75rem',
                                      lineHeight: '1.6',
                                    },
                                  }}
                                >
                                  {value}
                                </SyntaxHighlighter>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Widget for displaying MultiEdit tool results with diffs
 */
export const MultiEditResultWidget: React.FC<{
  content: string;
  edits?: Array<{ old_string: string; new_string: string }>;
}> = ({ content, edits }) => {
  // If we have the edits array, show a nice diff view
  if (edits && edits.length > 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-t-md border-b border-green-500/20 bg-green-500/10 px-3 py-2">
          <GitBranch className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium text-green-600 dark:text-green-400">
            {edits.length} Changes Applied
          </span>
        </div>

        <div className="space-y-4">
          {edits.map((edit, index) => {
            // Split the strings into lines for diff display
            const oldLines = edit.old_string.split('\n');
            const newLines = edit.new_string.split('\n');

            return (
              <div key={index} className="border-border/50 overflow-hidden rounded-md border">
                <div className="bg-muted/50 border-border/50 border-b px-3 py-1">
                  <span className="text-muted-foreground text-xs font-medium">
                    Change {index + 1}
                  </span>
                </div>

                <div className="font-mono text-xs">
                  {/* Show removed lines */}
                  {oldLines.map((line, lineIndex) => (
                    <div
                      key={`old-${lineIndex}`}
                      className="flex border-l-4 border-red-500 bg-red-500/10"
                    >
                      <span className="w-12 bg-red-500/10 px-2 py-1 text-right text-red-600 select-none dark:text-red-400">
                        -{lineIndex + 1}
                      </span>
                      <pre className="flex-1 overflow-x-auto px-3 py-1 text-red-700 dark:text-red-300">
                        <code>{line || ' '}</code>
                      </pre>
                    </div>
                  ))}

                  {/* Show added lines */}
                  {newLines.map((line, lineIndex) => (
                    <div
                      key={`new-${lineIndex}`}
                      className="flex border-l-4 border-green-500 bg-green-500/10"
                    >
                      <span className="w-12 bg-green-500/10 px-2 py-1 text-right text-green-600 select-none dark:text-green-400">
                        +{lineIndex + 1}
                      </span>
                      <pre className="flex-1 overflow-x-auto px-3 py-1 text-green-700 dark:text-green-300">
                        <code>{line || ' '}</code>
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Fallback to simple content display
  return (
    <div className="bg-muted/50 rounded-md border p-3">
      <pre className="font-mono text-xs whitespace-pre-wrap">{content}</pre>
    </div>
  );
};

/**
 * Widget for displaying system reminders (instead of raw XML)
 */
export const SystemReminderWidget: React.FC<{ message: string }> = ({ message }) => {
  // Extract icon based on message content
  let icon = <Info className="h-4 w-4" />;
  let colorClass = 'border-blue-500/20 bg-blue-500/5 text-blue-600';

  if (message.toLowerCase().includes('warning')) {
    icon = <AlertCircle className="h-4 w-4" />;
    colorClass = 'border-yellow-500/20 bg-yellow-500/5 text-yellow-600';
  } else if (message.toLowerCase().includes('error')) {
    icon = <AlertCircle className="h-4 w-4" />;
    colorClass = 'border-destructive/20 bg-destructive/5 text-destructive';
  }

  return (
    <div className={cn('flex items-start gap-2 rounded-md border p-3', colorClass)}>
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1 text-sm">{message}</div>
    </div>
  );
};

/**
 * Widget for displaying system initialization information in a visually appealing way
 * Separates regular tools from MCP tools and provides icons for each tool type
 */
export const SystemInitializedWidget: React.FC<{
  sessionId?: string;
  model?: string;
  cwd?: string;
  tools?: string[];
}> = ({ sessionId, model, cwd, tools = [] }) => {
  const [mcpExpanded, setMcpExpanded] = useState(false);

  // Separate regular tools from MCP tools
  const regularTools = tools.filter((tool) => !tool.startsWith('mcp__'));
  const mcpTools = tools.filter((tool) => tool.startsWith('mcp__'));

  // Tool icon mapping for regular tools
  const toolIcons: Record<string, LucideIcon> = {
    task: CheckSquare,
    bash: Terminal,
    glob: FolderSearch,
    grep: Search,
    ls: List,
    exit_plan_mode: LogOut,
    read: FileText,
    edit: Edit3,
    multiedit: Edit3,
    write: FilePlus,
    notebookread: Book,
    notebookedit: BookOpen,
    webfetch: Globe,
    todoread: ListChecks,
    todowrite: ListPlus,
    websearch: Globe2,
  };

  // Get icon for a tool, fallback to Wrench
  const getToolIcon = (toolName: string) => {
    const normalizedName = toolName.toLowerCase();
    return toolIcons[normalizedName] || Wrench;
  };

  // Format MCP tool name (remove mcp__ prefix and format underscores)
  const formatMcpToolName = (toolName: string) => {
    // Remove mcp__ prefix
    const withoutPrefix = toolName.replace(/^mcp__/, '');
    // Split by double underscores first (provider separator)
    const parts = withoutPrefix.split('__');
    if (parts.length >= 2) {
      // Format provider name and method name separately
      const provider = parts[0]
        .replace(/_/g, ' ')
        .replace(/-/g, ' ')
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      const method = parts
        .slice(1)
        .join('__')
        .replace(/_/g, ' ')
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      return { provider, method };
    }
    // Fallback formatting
    return {
      provider: 'MCP',
      method: withoutPrefix
        .replace(/_/g, ' ')
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
    };
  };

  // Group MCP tools by provider
  const mcpToolsByProvider = mcpTools.reduce(
    (acc, tool) => {
      const { provider } = formatMcpToolName(tool);
      if (!acc[provider]) {
        acc[provider] = [];
      }
      acc[provider].push(tool);
      return acc;
    },
    {} as Record<string, string[]>
  );

  return (
    <Card className="border-blue-500/20 bg-blue-500/5">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Settings className="mt-0.5 h-5 w-5 text-blue-500" />
          <div className="flex-1 space-y-4">
            <h4 className="text-sm font-semibold">System Initialized</h4>

            {/* Session Info */}
            <div className="space-y-2">
              {sessionId && (
                <div className="flex items-center gap-2 text-xs">
                  <Fingerprint className="text-muted-foreground h-3.5 w-3.5" />
                  <span className="text-muted-foreground">Session ID:</span>
                  <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                    {sessionId}
                  </code>
                </div>
              )}

              {model && (
                <div className="flex items-center gap-2 text-xs">
                  <Cpu className="text-muted-foreground h-3.5 w-3.5" />
                  <span className="text-muted-foreground">Model:</span>
                  <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">{model}</code>
                </div>
              )}

              {cwd && (
                <div className="flex items-center gap-2 text-xs">
                  <FolderOpen className="text-muted-foreground h-3.5 w-3.5" />
                  <span className="text-muted-foreground">Working Directory:</span>
                  <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs break-all">
                    {cwd}
                  </code>
                </div>
              )}
            </div>

            {/* Regular Tools */}
            {regularTools.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Wrench className="text-muted-foreground h-3.5 w-3.5" />
                  <span className="text-muted-foreground text-xs font-medium">
                    Available Tools ({regularTools.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {regularTools.map((tool, idx) => {
                    const Icon = getToolIcon(tool);
                    return (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="flex items-center gap-1 px-2 py-0.5 text-xs"
                      >
                        <Icon className="h-3 w-3" />
                        {tool}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* MCP Tools */}
            {mcpTools.length > 0 && (
              <div className="space-y-2">
                <button
                  onClick={() => setMcpExpanded(!mcpExpanded)}
                  className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-xs font-medium transition-colors"
                >
                  <Package className="h-3.5 w-3.5" />
                  <span>MCP Services ({mcpTools.length})</span>
                  <ChevronDown
                    className={cn('h-3 w-3 transition-transform', mcpExpanded && 'rotate-180')}
                  />
                </button>

                {mcpExpanded && (
                  <div className="ml-5 space-y-3">
                    {Object.entries(mcpToolsByProvider).map(([provider, providerTools]) => (
                      <div key={provider} className="space-y-1.5">
                        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                          <Package2 className="h-3 w-3" />
                          <span className="font-medium">{provider}</span>
                          <span className="text-muted-foreground/60">({providerTools.length})</span>
                        </div>
                        <div className="ml-4 flex flex-wrap gap-1">
                          {providerTools.map((tool, idx) => {
                            const { method } = formatMcpToolName(tool);
                            return (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="px-1.5 py-0 text-xs font-normal"
                              >
                                {method}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Show message if no tools */}
            {tools.length === 0 && (
              <div className="text-muted-foreground text-xs italic">No tools available</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Widget for Task tool - displays sub-agent task information
 */
export const TaskWidget: React.FC<{
  description?: string;
  prompt?: string;
  result?: any;
}> = ({ description, prompt, result: _result }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="space-y-2">
      <div className="mb-2 flex items-center gap-2">
        <div className="relative">
          <Bot className="h-4 w-4 text-purple-500" />
          <Sparkles className="absolute -top-1 -right-1 h-2.5 w-2.5 text-purple-400" />
        </div>
        <span className="text-sm font-medium">Spawning Sub-Agent Task</span>
      </div>

      <div className="ml-6 space-y-3">
        {description && (
          <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
            <div className="mb-1 flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-purple-500" />
              <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                Task Description
              </span>
            </div>
            <p className="text-foreground ml-5 text-sm">{description}</p>
          </div>
        )}

        {prompt && (
          <div className="space-y-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs font-medium transition-colors"
            >
              <ChevronRight
                className={cn('h-3 w-3 transition-transform', isExpanded && 'rotate-90')}
              />
              <span>Task Instructions</span>
            </button>

            {isExpanded && (
              <div className="bg-muted/30 rounded-lg border p-3">
                <pre className="text-muted-foreground font-mono text-xs whitespace-pre-wrap">
                  {prompt}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Widget for WebSearch tool - displays web search query and results
 */
export const WebSearchWidget: React.FC<{
  query: string;
  result?: any;
}> = ({ query, result }) => {
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());

  // Parse the result to extract all links sections and build a structured representation
  const parseSearchResult = (resultContent: string) => {
    const sections: Array<{
      type: 'text' | 'links';
      content: string | Array<{ title: string; url: string }>;
    }> = [];

    // Split by "Links: [" to find all link sections
    const parts = resultContent.split(/Links:\s*\[/);

    // First part is always text (or empty)
    if (parts[0]) {
      sections.push({ type: 'text', content: parts[0].trim() });
    }

    // Process each links section
    parts.slice(1).forEach((part) => {
      try {
        // Find the closing bracket
        const closingIndex = part.indexOf(']');
        if (closingIndex === -1) return;

        const linksJson = '[' + part.substring(0, closingIndex + 1);
        const remainingText = part.substring(closingIndex + 1).trim();

        // Parse the JSON array
        const links = JSON.parse(linksJson);
        sections.push({ type: 'links', content: links });

        // Add any remaining text
        if (remainingText) {
          sections.push({ type: 'text', content: remainingText });
        }
      } catch (e) {
        // If parsing fails, treat it as text
        sections.push({ type: 'text', content: 'Links: [' + part });
      }
    });

    return sections;
  };

  const toggleSection = (index: number) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSections(newExpanded);
  };

  // Extract result content if available
  let searchResults: {
    sections: Array<{
      type: 'text' | 'links';
      content: string | Array<{ title: string; url: string }>;
    }>;
    noResults: boolean;
  } = { sections: [], noResults: false };

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

    searchResults.noResults =
      resultContent.toLowerCase().includes('no links found') ||
      resultContent.toLowerCase().includes('no results');
    searchResults.sections = parseSearchResult(resultContent);
  }

  const handleLinkClick = async (url: string) => {
    try {
      await open(url);
    } catch (error) {
      console.error('Failed to open URL:', error);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Subtle Search Query Header */}
      <div className="flex items-center gap-2 rounded-lg border border-blue-500/10 bg-blue-500/5 px-3 py-2">
        <Globe className="h-4 w-4 text-blue-500/70" />
        <span className="text-xs font-medium tracking-wider text-blue-600/70 uppercase dark:text-blue-400/70">
          Web Search
        </span>
        <span className="text-muted-foreground/80 flex-1 truncate text-sm">{query}</span>
      </div>

      {/* Results */}
      {result && (
        <div className="bg-background/50 overflow-hidden rounded-lg border backdrop-blur-sm">
          {!searchResults.sections.length ? (
            <div className="text-muted-foreground flex items-center gap-2 px-3 py-2">
              <div className="flex animate-pulse items-center gap-1">
                <div className="h-1 w-1 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.3s]"></div>
                <div className="h-1 w-1 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.15s]"></div>
                <div className="h-1 w-1 animate-bounce rounded-full bg-blue-500"></div>
              </div>
              <span className="text-sm">Searching...</span>
            </div>
          ) : searchResults.noResults ? (
            <div className="px-3 py-2">
              <div className="text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">No results found</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3 p-3">
              {searchResults.sections.map((section, idx) => {
                if (section.type === 'text') {
                  return (
                    <div key={idx} className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{section.content as string}</ReactMarkdown>
                    </div>
                  );
                } else if (section.type === 'links' && Array.isArray(section.content)) {
                  const links = section.content;
                  const isExpanded = expandedSections.has(idx);

                  return (
                    <div key={idx} className="space-y-1.5">
                      {/* Toggle Button */}
                      <button
                        onClick={() => toggleSection(idx)}
                        className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                        <span>
                          {links.length} result{links.length !== 1 ? 's' : ''}
                        </span>
                      </button>

                      {/* Links Display */}
                      {isExpanded ? (
                        /* Expanded Card View */
                        <div className="ml-4 grid gap-1.5">
                          {links.map((link, linkIdx) => (
                            <button
                              key={linkIdx}
                              onClick={() => handleLinkClick(link.url)}
                              className="group bg-card/30 hover:bg-card/50 flex flex-col gap-0.5 rounded-md border p-2.5 text-left transition-all hover:border-blue-500/30"
                            >
                              <div className="flex items-start gap-2">
                                <Globe2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-blue-500/70" />
                                <div className="min-w-0 flex-1">
                                  <div className="line-clamp-2 text-sm font-medium transition-colors group-hover:text-blue-500">
                                    {link.title}
                                  </div>
                                  <div className="text-muted-foreground mt-0.5 truncate text-xs">
                                    {link.url}
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        /* Collapsed Pills View */
                        <div className="ml-4 flex flex-wrap gap-1.5">
                          {links.map((link, linkIdx) => (
                            <button
                              key={linkIdx}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLinkClick(link.url);
                              }}
                              className="group inline-flex items-center gap-1 rounded-full border border-blue-500/10 bg-blue-500/5 px-2.5 py-1 text-xs font-medium transition-all hover:border-blue-500/20 hover:bg-blue-500/10"
                            >
                              <Globe2 className="h-3 w-3 text-blue-500/70" />
                              <span className="text-foreground/70 group-hover:text-foreground/90 max-w-[180px] truncate">
                                {link.title}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Widget for displaying AI thinking/reasoning content
 * Collapsible and closed by default
 */
export const ThinkingWidget: React.FC<{
  thinking: string;
  signature?: string;
}> = ({ thinking }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Strip whitespace from thinking content
  const trimmedThinking = thinking.trim();

  return (
    <div className="overflow-hidden rounded-lg border border-gray-500/20 bg-gray-500/5">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-gray-500/10"
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bot className="h-4 w-4 text-gray-500" />
            <Sparkles className="absolute -top-1 -right-1 h-2.5 w-2.5 animate-pulse text-gray-400" />
          </div>
          <span className="text-sm font-medium text-gray-600 italic dark:text-gray-400">
            Thinking...
          </span>
        </div>
        <ChevronRight
          className={cn('h-4 w-4 text-gray-500 transition-transform', isExpanded && 'rotate-90')}
        />
      </button>

      {isExpanded && (
        <div className="border-t border-gray-500/20 px-4 pt-2 pb-4">
          <pre className="rounded-lg bg-gray-500/5 p-3 font-mono text-xs whitespace-pre-wrap text-gray-600 italic dark:text-gray-400">
            {trimmedThinking}
          </pre>
        </div>
      )}
    </div>
  );
};

/**
 * Widget for WebFetch tool - displays URL fetching with optional prompts
 */
export const WebFetchWidget: React.FC<{
  url: string;
  prompt?: string;
  result?: any;
}> = ({ url, prompt, result }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFullContent, setShowFullContent] = useState(false);

  // Extract result content if available
  let fetchedContent = '';
  let isLoading = !result;
  let hasError = false;

  if (result) {
    if (typeof result.content === 'string') {
      fetchedContent = result.content;
    } else if (result.content && typeof result.content === 'object') {
      if (result.content.text) {
        fetchedContent = result.content.text;
      } else if (Array.isArray(result.content)) {
        fetchedContent = result.content
          .map((c: any) => (typeof c === 'string' ? c : c.text || JSON.stringify(c)))
          .join('\n');
      } else {
        fetchedContent = JSON.stringify(result.content, null, 2);
      }
    }

    // Check if there's an error
    hasError =
      result.is_error ||
      fetchedContent.toLowerCase().includes('error') ||
      fetchedContent.toLowerCase().includes('failed');
  }

  // Truncate content for preview
  const maxPreviewLength = 500;
  const isTruncated = fetchedContent.length > maxPreviewLength;
  const previewContent =
    isTruncated && !showFullContent
      ? fetchedContent.substring(0, maxPreviewLength) + '...'
      : fetchedContent;

  // Extract domain from URL for display
  const getDomain = (urlString: string) => {
    try {
      const urlObj = new URL(urlString);
      return urlObj.hostname;
    } catch {
      return urlString;
    }
  };

  const handleUrlClick = async () => {
    try {
      await open(url);
    } catch (error) {
      console.error('Failed to open URL:', error);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Header with URL and optional prompt */}
      <div className="space-y-2">
        {/* URL Display */}
        <div className="flex items-center gap-2 rounded-lg border border-purple-500/10 bg-purple-500/5 px-3 py-2">
          <Globe className="h-4 w-4 text-purple-500/70" />
          <span className="text-xs font-medium tracking-wider text-purple-600/70 uppercase dark:text-purple-400/70">
            Fetching
          </span>
          <button
            onClick={handleUrlClick}
            className="text-foreground/80 hover:text-foreground flex-1 truncate text-left text-sm decoration-purple-500/50 hover:underline"
          >
            {url}
          </button>
        </div>

        {/* Prompt Display */}
        {prompt && (
          <div className="ml-6 space-y-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs font-medium transition-colors"
            >
              <ChevronRight
                className={cn('h-3 w-3 transition-transform', isExpanded && 'rotate-90')}
              />
              <Info className="h-3 w-3" />
              <span>Analysis Prompt</span>
            </button>

            {isExpanded && (
              <div className="bg-muted/30 ml-4 rounded-lg border p-3">
                <p className="text-foreground/90 text-sm">{prompt}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="bg-background/50 overflow-hidden rounded-lg border backdrop-blur-sm">
          <div className="text-muted-foreground flex items-center gap-2 px-3 py-2">
            <div className="flex animate-pulse items-center gap-1">
              <div className="h-1 w-1 animate-bounce rounded-full bg-purple-500 [animation-delay:-0.3s]"></div>
              <div className="h-1 w-1 animate-bounce rounded-full bg-purple-500 [animation-delay:-0.15s]"></div>
              <div className="h-1 w-1 animate-bounce rounded-full bg-purple-500"></div>
            </div>
            <span className="text-sm">Fetching content from {getDomain(url)}...</span>
          </div>
        </div>
      ) : fetchedContent ? (
        <div className="bg-background/50 overflow-hidden rounded-lg border backdrop-blur-sm">
          {hasError ? (
            <div className="px-3 py-2">
              <div className="text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Failed to fetch content</span>
              </div>
              <pre className="text-muted-foreground mt-2 font-mono text-xs whitespace-pre-wrap">
                {fetchedContent}
              </pre>
            </div>
          ) : (
            <div className="space-y-2 p-3">
              {/* Content Header */}
              <div className="flex items-center justify-between">
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <FileText className="h-3.5 w-3.5" />
                  <span>Content from {getDomain(url)}</span>
                </div>
                {isTruncated && (
                  <button
                    onClick={() => setShowFullContent(!showFullContent)}
                    className="flex items-center gap-1 text-xs text-purple-500 transition-colors hover:text-purple-600"
                  >
                    {showFullContent ? (
                      <>
                        <ChevronUp className="h-3 w-3" />
                        Show less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3" />
                        Show full content
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Fetched Content */}
              <div className="relative">
                <div
                  className={cn(
                    'bg-muted/30 overflow-hidden rounded-lg p-3',
                    !showFullContent && isTruncated && 'max-h-[300px]'
                  )}
                >
                  <pre className="text-foreground/90 font-mono text-sm whitespace-pre-wrap">
                    {previewContent}
                  </pre>
                  {!showFullContent && isTruncated && (
                    <div className="from-muted/30 pointer-events-none absolute right-0 bottom-0 left-0 h-20 bg-gradient-to-t to-transparent" />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-background/50 overflow-hidden rounded-lg border backdrop-blur-sm">
          <div className="px-3 py-2">
            <div className="text-muted-foreground flex items-center gap-2">
              <Info className="h-4 w-4" />
              <span className="text-sm">No content returned</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Widget for TodoRead tool - displays todos with advanced viewing capabilities
 */
export const TodoReadWidget: React.FC<{ todos?: any[]; result?: any }> = ({
  todos: inputTodos,
  result,
}) => {
  // Extract todos from result if not directly provided
  let todos: any[] = inputTodos || [];
  if (!todos.length && result) {
    if (typeof result === 'object' && Array.isArray(result.todos)) {
      todos = result.todos;
    } else if (typeof result.content === 'string') {
      try {
        const parsed = JSON.parse(result.content);
        if (Array.isArray(parsed)) todos = parsed;
        else if (parsed.todos) todos = parsed.todos;
      } catch (e) {
        // Not JSON, ignore
      }
    }
  }

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'board' | 'timeline' | 'stats'>('list');
  const [expandedTodos, setExpandedTodos] = useState<Set<string>>(new Set());

  // Status icons and colors
  const statusConfig = {
    completed: {
      icon: <CheckCircle2 className="h-4 w-4" />,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20',
      label: 'Completed',
    },
    in_progress: {
      icon: <Clock className="h-4 w-4 animate-pulse" />,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      label: 'In Progress',
    },
    pending: {
      icon: <Circle className="h-4 w-4" />,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted/50',
      borderColor: 'border-muted',
      label: 'Pending',
    },
    cancelled: {
      icon: <X className="h-4 w-4" />,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
      label: 'Cancelled',
    },
  };

  // Filter todos based on search and status
  const filteredTodos = todos.filter((todo) => {
    const matchesSearch =
      !searchQuery ||
      todo.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (todo.id && todo.id.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || todo.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate statistics
  const stats = {
    total: todos.length,
    completed: todos.filter((t) => t.status === 'completed').length,
    inProgress: todos.filter((t) => t.status === 'in_progress').length,
    pending: todos.filter((t) => t.status === 'pending').length,
    cancelled: todos.filter((t) => t.status === 'cancelled').length,
    completionRate:
      todos.length > 0
        ? Math.round((todos.filter((t) => t.status === 'completed').length / todos.length) * 100)
        : 0,
  };

  // Group todos by status for board view
  const todosByStatus = {
    pending: filteredTodos.filter((t) => t.status === 'pending'),
    in_progress: filteredTodos.filter((t) => t.status === 'in_progress'),
    completed: filteredTodos.filter((t) => t.status === 'completed'),
    cancelled: filteredTodos.filter((t) => t.status === 'cancelled'),
  };

  // Toggle expanded state for a todo
  const toggleExpanded = (todoId: string) => {
    setExpandedTodos((prev) => {
      const next = new Set(prev);
      if (next.has(todoId)) {
        next.delete(todoId);
      } else {
        next.add(todoId);
      }
      return next;
    });
  };

  // Export todos as JSON
  const exportAsJson = () => {
    const dataStr = JSON.stringify(todos, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = 'todos.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Export todos as Markdown
  const exportAsMarkdown = () => {
    let markdown = '# Todo List\n\n';
    markdown += `**Total**: ${stats.total} | **Completed**: ${stats.completed} | **In Progress**: ${stats.inProgress} | **Pending**: ${stats.pending}\n\n`;

    const statusGroups = ['pending', 'in_progress', 'completed', 'cancelled'];
    statusGroups.forEach((status) => {
      const todosInStatus = todos.filter((t) => t.status === status);
      if (todosInStatus.length > 0) {
        markdown += `## ${statusConfig[status as keyof typeof statusConfig]?.label || status}\n\n`;
        todosInStatus.forEach((todo) => {
          const checkbox = todo.status === 'completed' ? '[x]' : '[ ]';
          markdown += `- ${checkbox} ${todo.content}${todo.id ? ` (${todo.id})` : ''}\n`;
          if (todo.dependencies?.length > 0) {
            markdown += `  - Dependencies: ${todo.dependencies.join(', ')}\n`;
          }
        });
        markdown += '\n';
      }
    });

    const dataUri = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(markdown);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', 'todos.md');
    linkElement.click();
  };

  // Render todo card
  const TodoCard = ({ todo, isExpanded }: { todo: any; isExpanded: boolean }) => {
    const config = statusConfig[todo.status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={cn(
          'group cursor-pointer rounded-lg border p-4 transition-all hover:shadow-md',
          config.bgColor,
          config.borderColor,
          todo.status === 'completed' && 'opacity-75'
        )}
        onClick={() => todo.id && toggleExpanded(todo.id)}
      >
        <div className="flex items-start gap-3">
          <div className={cn('mt-0.5', config.color)}>{config.icon}</div>
          <div className="flex-1 space-y-2">
            <p className={cn('text-sm', todo.status === 'completed' && 'line-through')}>
              {todo.content}
            </p>

            {/* Todo metadata */}
            <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
              {todo.id && (
                <div className="flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  <span className="font-mono">{todo.id}</span>
                </div>
              )}
              {todo.dependencies?.length > 0 && (
                <div className="flex items-center gap-1">
                  <GitBranch className="h-3 w-3" />
                  <span>{todo.dependencies.length} deps</span>
                </div>
              )}
            </div>

            {/* Expanded details */}
            <AnimatePresence>
              {isExpanded && todo.dependencies?.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 space-y-1 border-t pt-2">
                    <span className="text-muted-foreground text-xs font-medium">Dependencies:</span>
                    <div className="flex flex-wrap gap-1">
                      {todo.dependencies.map((dep: string) => (
                        <Badge key={dep} variant="outline" className="font-mono text-xs">
                          {dep}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    );
  };

  // Render statistics view
  const StatsView = () => (
    <div className="space-y-4">
      {/* Overall Progress */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-medium">Overall Progress</h4>
          <span className="text-primary text-2xl font-bold">{stats.completionRate}%</span>
        </div>
        <div className="bg-muted h-3 w-full overflow-hidden rounded-full">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${stats.completionRate}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="from-primary to-primary/80 h-full bg-gradient-to-r"
          />
        </div>
      </Card>

      {/* Status Breakdown */}
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(statusConfig).map(([status, config]) => {
          const count = stats[status as keyof typeof stats] || 0;
          const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;

          return (
            <Card key={status} className={cn('p-4', config.bgColor)}>
              <div className="flex items-center gap-3">
                <div className={config.color}>{config.icon}</div>
                <div className="flex-1">
                  <p className="text-muted-foreground text-xs">{config.label}</p>
                  <p className="text-lg font-semibold">{count}</p>
                  <p className="text-muted-foreground text-xs">{percentage}%</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Activity Chart */}
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Activity className="text-primary h-4 w-4" />
          <h4 className="text-sm font-medium">Activity Overview</h4>
        </div>
        <div className="space-y-2">
          {Object.entries(statusConfig).map(([status, config]) => {
            const count = stats[status as keyof typeof stats] || 0;
            const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;

            return (
              <div key={status} className="flex items-center gap-3">
                <span className="w-20 text-right text-xs">{config.label}</span>
                <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className={cn('h-full', config.bgColor)}
                  />
                </div>
                <span className="w-12 text-left text-xs">{count}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );

  // Render board view
  const BoardView = () => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Object.entries(todosByStatus).map(([status, todos]) => {
        const config = statusConfig[status as keyof typeof statusConfig];

        return (
          <div key={status} className="space-y-3">
            <div className="flex items-center gap-2 border-b pb-2">
              <div className={config.color}>{config.icon}</div>
              <h3 className="text-sm font-medium">{config.label}</h3>
              <Badge variant="secondary" className="ml-auto text-xs">
                {todos.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {todos.map((todo) => (
                <TodoCard
                  key={todo.id || todos.indexOf(todo)}
                  todo={todo}
                  isExpanded={expandedTodos.has(todo.id)}
                />
              ))}
              {todos.length === 0 && (
                <p className="text-muted-foreground py-4 text-center text-xs">No todos</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  // Render timeline view
  const TimelineView = () => {
    // Group todos by their dependencies to create a timeline
    const rootTodos = todos.filter((t) => !t.dependencies || t.dependencies.length === 0);
    const rendered = new Set<string>();

    const renderTodoWithDependents = (todo: any, level = 0) => {
      if (rendered.has(todo.id)) return null;
      rendered.add(todo.id);

      const dependents = todos.filter(
        (t) => t.dependencies?.includes(todo.id) && !rendered.has(t.id)
      );

      return (
        <div key={todo.id} className="relative">
          {level > 0 && <div className="bg-border absolute top-0 left-6 h-6 w-px" />}
          <div className={cn('flex gap-4', level > 0 && 'ml-12')}>
            <div className="relative">
              <div
                className={cn(
                  'bg-background h-3 w-3 rounded-full border-2',
                  statusConfig[todo.status as keyof typeof statusConfig]?.borderColor
                )}
              />
              {dependents.length > 0 && (
                <div className="bg-border absolute top-3 left-1/2 h-full w-px -translate-x-1/2" />
              )}
            </div>
            <div className="flex-1 pb-6">
              <TodoCard todo={todo} isExpanded={expandedTodos.has(todo.id)} />
            </div>
          </div>
          {dependents.map((dep) => renderTodoWithDependents(dep, level + 1))}
        </div>
      );
    };

    return (
      <div className="space-y-4">
        {rootTodos.map((todo) => renderTodoWithDependents(todo))}
        {todos.filter((t) => !rendered.has(t.id)).map((todo) => renderTodoWithDependents(todo))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ListChecks className="text-primary h-5 w-5" />
          <div>
            <h3 className="text-sm font-medium">Todo Overview</h3>
            <p className="text-muted-foreground text-xs">
              {stats.total} total • {stats.completed} completed • {stats.completionRate}% done
            </p>
          </div>
        </div>

        {/* Export Options */}
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={exportAsJson}>
            <Download className="mr-1 h-3 w-3" />
            JSON
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={exportAsMarkdown}>
            <Download className="mr-1 h-3 w-3" />
            Markdown
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Search todos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-9"
          />
        </div>

        <div className="flex gap-2">
          <div className="bg-muted flex gap-1 rounded-md p-1">
            {['all', 'pending', 'in_progress', 'completed', 'cancelled'].map((status) => (
              <Button
                key={status}
                size="sm"
                variant={statusFilter === status ? 'default' : 'ghost'}
                className="h-7 px-2 text-xs"
                onClick={() => setStatusFilter(status)}
              >
                {status === 'all'
                  ? 'All'
                  : statusConfig[status as keyof typeof statusConfig]?.label}
                {status === 'all' && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                    {stats.total}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="list" className="text-xs">
            <LayoutList className="mr-1 h-4 w-4" />
            List
          </TabsTrigger>
          <TabsTrigger value="board" className="text-xs">
            <LayoutGrid className="mr-1 h-4 w-4" />
            Board
          </TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs">
            <GitBranch className="mr-1 h-4 w-4" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="stats" className="text-xs">
            <BarChart3 className="mr-1 h-4 w-4" />
            Stats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {filteredTodos.map((todo) => (
                <TodoCard
                  key={todo.id || filteredTodos.indexOf(todo)}
                  todo={todo}
                  isExpanded={expandedTodos.has(todo.id)}
                />
              ))}
            </AnimatePresence>
            {filteredTodos.length === 0 && (
              <div className="text-muted-foreground py-8 text-center text-sm">
                {searchQuery || statusFilter !== 'all'
                  ? 'No todos match your filters'
                  : 'No todos available'}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="board" className="mt-4">
          <BoardView />
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <TimelineView />
        </TabsContent>

        <TabsContent value="stats" className="mt-4">
          <StatsView />
        </TabsContent>
      </Tabs>
    </div>
  );
};
