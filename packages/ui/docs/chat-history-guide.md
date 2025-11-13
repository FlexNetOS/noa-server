# Chat History - Implementation Guide

## Overview

The Chat History system provides persistent storage for chat sessions using IndexedDB via Dexie.js. It integrates seamlessly with React using Zustand for state management.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Components                         │
│                  (Chat UI, Search, Export)                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   useChatHistory Hook                        │
│              (Zustand State Management)                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   ChatHistoryDB (Dexie)                      │
│              (Database Operations Layer)                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                     IndexedDB                                │
│              (Browser Persistent Storage)                    │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### Conversations Table

```typescript
interface Conversation {
  id: string;              // Unique identifier
  title: string;           // Display title
  created_at: number;      // Unix timestamp (ms)
  updated_at: number;      // Unix timestamp (ms)
  model?: string;          // AI model identifier
  tags?: string[];         // Categorization tags
  metadata?: Record<string, any>;  // Extensible metadata
}

// Indexes:
// - id (primary key)
// - created_at, updated_at (sorting)
// - title (search)
// - model (filtering)
// - *tags (multi-entry index)
```

### Messages Table

```typescript
interface Message {
  id: string;              // Unique identifier
  conversation_id: string; // Foreign key
  role: 'user' | 'assistant' | 'system';
  content: string;         // Message text
  timestamp: number;       // Unix timestamp (ms)
  metadata?: {
    tokens?: number;
    latency?: number;
    model?: string;
    temperature?: number;
    cached?: boolean;
    error?: {
      message: string;
      code?: string;
      retryable?: boolean;
    };
  };
}

// Indexes:
// - id (primary key)
// - conversation_id (foreign key)
// - timestamp (sorting)
// - role (filtering)
// - content (full-text search)
// - [conversation_id+timestamp] (compound index)
// - [conversation_id+role] (compound index)
```

## Usage Examples

### Basic Chat Implementation

```typescript
import { useChatHistory } from '@noa/ui';
import { useState } from 'react';

function ChatInterface() {
  const {
    currentConversation,
    messages,
    loading,
    createConversation,
    loadConversation,
    addMessage,
  } = useChatHistory();

  const [input, setInput] = useState('');

  const handleNewChat = async () => {
    await createConversation('New Chat', {
      model: 'claude-3-opus-20240229',
      tags: ['general'],
    });
  };

  const handleSendMessage = async () => {
    if (!currentConversation || !input.trim()) return;

    // Add user message
    await addMessage(currentConversation.id, 'user', input);
    setInput('');

    // Call AI API
    const response = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: input }),
    });

    const data = await response.json();

    // Add assistant response
    await addMessage(
      currentConversation.id,
      'assistant',
      data.response,
      {
        tokens: data.usage.total_tokens,
        latency: data.latency_ms,
        model: data.model,
      }
    );
  };

  return (
    <div className="chat-interface">
      <button onClick={handleNewChat}>New Chat</button>

      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.role}`}>
            <p>{msg.content}</p>
            {msg.metadata?.tokens && (
              <span className="tokens">{msg.metadata.tokens} tokens</span>
            )}
          </div>
        ))}
      </div>

      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
        placeholder="Type a message..."
        disabled={loading}
      />
    </div>
  );
}
```

### Streaming Responses with Auto-Save

```typescript
import { useChatHistory, chatHistoryDB } from '@noa/ui';

function StreamingChat() {
  const { currentConversation } = useChatHistory();

  const handleStreamingResponse = async (userMessage: string) => {
    if (!currentConversation) return;

    // Add user message
    await chatHistoryDB.addMessage(
      currentConversation.id,
      'user',
      userMessage
    );

    // Create empty assistant message
    const assistantMessage = await chatHistoryDB.addMessage(
      currentConversation.id,
      'assistant',
      ''
    );

    // Stream response
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      body: JSON.stringify({ message: userMessage }),
    });

    const reader = response.body?.getReader();
    if (!reader) return;

    let fullContent = '';
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      fullContent += chunk;

      // Update message in database (debounced in production)
      await chatHistoryDB.messages.update(assistantMessage.id, {
        content: fullContent,
      });
    }
  };

  return <div>{/* UI implementation */}</div>;
}
```

### Search Implementation

```typescript
import { useChatHistory } from '@noa/ui';
import { useState } from 'react';

function SearchInterface() {
  const { search, searchResults, searchLoading } = useChatHistory();
  const [query, setQuery] = useState('');

  const handleSearch = async () => {
    await search({
      query,
      limit: 20,
      caseSensitive: false,
      dateRange: {
        start: Date.now() - 30 * 24 * 60 * 60 * 1000, // Last 30 days
        end: Date.now(),
      },
    });
  };

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search conversations..."
      />
      <button onClick={handleSearch} disabled={searchLoading}>
        Search
      </button>

      <div className="search-results">
        {searchResults.map((result) => (
          <div key={result.conversation.id} className="search-result">
            <h3>{result.conversation.title}</h3>
            <p>Relevance: {(result.score * 100).toFixed(1)}%</p>

            {result.highlights.map((highlight, idx) => (
              <div key={idx} className="highlight">
                <code>{highlight.snippet}</code>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Export Functionality

```typescript
import { exportAndDownload } from '@noa/ui';

function ExportControls({ conversationId }: { conversationId: string }) {
  const handleExport = async (format: 'json' | 'markdown' | 'text' | 'csv') => {
    await exportAndDownload(conversationId, {
      format,
      includeMetadata: true,
      prettyPrint: format === 'json',
      markdownOptions: {
        includeTimestamps: true,
        includeTokenCounts: true,
        includeModelInfo: true,
      },
    });
  };

  return (
    <div className="export-controls">
      <button onClick={() => handleExport('json')}>Export as JSON</button>
      <button onClick={() => handleExport('markdown')}>Export as Markdown</button>
      <button onClick={() => handleExport('text')}>Export as Text</button>
      <button onClick={() => handleExport('csv')}>Export as CSV</button>
    </div>
  );
}
```

### Conversation List with Pagination

```typescript
import { useChatHistory } from '@noa/ui';
import { useEffect, useState } from 'react';

function ConversationList() {
  const { conversations, loadConversations, loadConversation } = useChatHistory();
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadConversations({
      page,
      pageSize: 20,
      sortBy: 'updated_at',
      sortDirection: 'desc',
    }).then((result) => {
      setTotalPages(result.totalPages);
    });
  }, [page]);

  return (
    <div className="conversation-list">
      {conversations.map((conv) => (
        <div
          key={conv.id}
          className="conversation-item"
          onClick={() => loadConversation(conv.id)}
        >
          <h4>{conv.title}</h4>
          <p className="meta">
            {new Date(conv.updated_at).toLocaleDateString()}
            {conv.model && <span> • {conv.model}</span>}
          </p>
          {conv.tags && (
            <div className="tags">
              {conv.tags.map((tag) => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
          )}
        </div>
      ))}

      <div className="pagination">
        <button
          onClick={() => setPage(page - 1)}
          disabled={page === 1}
        >
          Previous
        </button>
        <span>Page {page} of {totalPages}</span>
        <button
          onClick={() => setPage(page + 1)}
          disabled={page === totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

### Database Statistics Dashboard

```typescript
import { chatHistoryDB } from '@noa/ui';
import { useEffect, useState } from 'react';
import type { DatabaseStats } from '@noa/ui';

function StatsDashboard() {
  const [stats, setStats] = useState<DatabaseStats | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const dbStats = await chatHistoryDB.getStats();
    setStats(dbStats);
  };

  if (!stats) return <div>Loading...</div>;

  return (
    <div className="stats-dashboard">
      <div className="stat">
        <h3>Total Conversations</h3>
        <p>{stats.conversationCount}</p>
      </div>

      <div className="stat">
        <h3>Total Messages</h3>
        <p>{stats.messageCount.toLocaleString()}</p>
      </div>

      <div className="stat">
        <h3>Avg Messages/Conversation</h3>
        <p>{stats.avgMessagesPerConversation.toFixed(1)}</p>
      </div>

      <div className="stat">
        <h3>Database Size</h3>
        <p>{(stats.totalSize / 1024 / 1024).toFixed(2)} MB</p>
      </div>

      {stats.mostUsedModel && (
        <div className="stat">
          <h3>Most Used Model</h3>
          <p>{stats.mostUsedModel}</p>
        </div>
      )}
    </div>
  );
}
```

## Performance Optimization

### Debounced Auto-Save

```typescript
import { useMemo, useRef } from 'react';
import { chatHistoryDB } from '@noa/ui';

function useAutoSave(messageId: string, debounceMs = 1000) {
  const timeoutRef = useRef<NodeJS.Timeout>();

  const debouncedSave = useMemo(
    () => (content: string) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(async () => {
        await chatHistoryDB.messages.update(messageId, { content });
      }, debounceMs);
    },
    [messageId, debounceMs]
  );

  return debouncedSave;
}
```

### Virtual Scrolling for Large Message Lists

```typescript
import { FixedSizeList as List } from 'react-window';
import { useChatHistory } from '@noa/ui';

function VirtualizedMessages() {
  const { messages } = useChatHistory();

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const message = messages[index];
    return (
      <div style={style} className={`message ${message.role}`}>
        {message.content}
      </div>
    );
  };

  return (
    <List
      height={600}
      itemCount={messages.length}
      itemSize={100}
      width="100%"
    >
      {Row}
    </List>
  );
}
```

## Maintenance

### Database Health Check

```typescript
import { chatHistoryDB } from '@noa/ui';

async function checkDatabaseHealth() {
  const health = await chatHistoryDB.getHealth();

  console.log('Database Health:', health);

  if (!health.healthy) {
    console.warn('Database issues detected:', health.issues);

    // Cleanup orphaned messages
    const deletedCount = await chatHistoryDB.cleanupOrphans();
    console.log(`Cleaned up ${deletedCount} orphaned messages`);
  }
}
```

### Backup and Restore

```typescript
import { chatHistoryDB, exportConversations } from '@noa/ui';

async function backupDatabase() {
  // Get all conversation IDs
  const allConversations = await chatHistoryDB.conversations.toArray();
  const conversationIds = allConversations.map((c) => c.id);

  // Export to JSON
  const backup = await exportConversations(conversationIds, {
    format: 'json',
    includeMetadata: true,
    prettyPrint: true,
  });

  // Save to file
  const blob = new Blob([backup], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `chat-backup-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
```

## Security Considerations

1. **Client-Side Storage**: All data is stored locally in IndexedDB. Never store sensitive credentials.

2. **Data Encryption**: IndexedDB data is not encrypted by default. For sensitive data, implement encryption before storage.

3. **Storage Quotas**: Browser storage limits apply. Monitor database size and implement data retention policies.

4. **XSS Prevention**: Always sanitize message content before rendering HTML.

5. **GDPR Compliance**: Implement data export and deletion functionality for compliance.

## Testing

Run the test suite:

```bash
cd /home/deflex/noa-server/packages/ui
pnpm test
pnpm test:ui      # Interactive UI
pnpm test:coverage
```

## Troubleshooting

### Database Not Opening

```typescript
import { chatHistoryDB } from '@noa/ui';

try {
  await chatHistoryDB.open();
} catch (error) {
  console.error('Failed to open database:', error);
  // Check browser compatibility
  if (!('indexedDB' in window)) {
    console.error('IndexedDB not supported');
  }
}
```

### Quota Exceeded

```typescript
if ('storage' in navigator && 'estimate' in navigator.storage) {
  const estimate = await navigator.storage.estimate();
  const percentUsed = ((estimate.usage || 0) / (estimate.quota || 1)) * 100;

  if (percentUsed > 80) {
    console.warn(`Storage ${percentUsed.toFixed(1)}% full`);
    // Implement cleanup strategy
  }
}
```

## Migration Guide

### From localStorage to IndexedDB

```typescript
// Migrate old localStorage data
const oldData = localStorage.getItem('chat-history');
if (oldData) {
  const { conversations, messages } = JSON.parse(oldData);

  for (const conv of conversations) {
    await chatHistoryDB.conversations.add(conv);
  }

  for (const msg of messages) {
    await chatHistoryDB.messages.add(msg);
  }

  // Clear old data
  localStorage.removeItem('chat-history');
}
```

## Best Practices

1. **Auto-generate titles**: Use first user message to auto-generate conversation titles.

2. **Debounce saves**: Don't save every keystroke during streaming; debounce updates.

3. **Pagination**: Always paginate large datasets to avoid memory issues.

4. **Cleanup**: Run periodic health checks and orphan cleanup.

5. **Export regularly**: Encourage users to export important conversations.

6. **Monitor size**: Track database size and warn users when approaching quotas.

7. **Error handling**: Implement comprehensive error handling for all database operations.

8. **TypeScript**: Use full type safety for all database operations.

## Resources

- [Dexie.js Documentation](https://dexie.org/)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [React Window](https://react-window.vercel.app/)
