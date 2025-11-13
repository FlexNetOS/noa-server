# Chat History Store

Persistent chat session management using Dexie.js (IndexedDB wrapper).

## Quick Start

```typescript
import { chatHistoryDB } from '@noa/ui';

// Create conversation
const conversation = await chatHistoryDB.createConversation('My Chat', {
  model: 'claude-3-opus-20240229',
  tags: ['work'],
});

// Add messages
await chatHistoryDB.addMessage(conversation.id, 'user', 'Hello!');
await chatHistoryDB.addMessage(conversation.id, 'assistant', 'Hi there!');

// Search
const results = await chatHistoryDB.search({
  query: 'hello',
  limit: 10,
});
```

## Features

- **Persistent Storage**: IndexedDB-backed with automatic schema migrations
- **Full-Text Search**: Search across all messages with highlighting
- **Pagination**: Efficient handling of large datasets
- **Export**: JSON, Markdown, Text, CSV formats
- **Health Monitoring**: Database statistics and orphan cleanup
- **Type Safety**: Full TypeScript support

## Database Schema

### Conversations
- `id` (string) - Unique identifier
- `title` (string) - Display title
- `created_at` (number) - Creation timestamp
- `updated_at` (number) - Last update timestamp
- `model` (string, optional) - AI model identifier
- `tags` (string[], optional) - Categorization tags
- `metadata` (object, optional) - Extensible metadata

### Messages
- `id` (string) - Unique identifier
- `conversation_id` (string) - Foreign key to conversation
- `role` ('user' | 'assistant' | 'system') - Message role
- `content` (string) - Message text
- `timestamp` (number) - Message timestamp
- `metadata` (object, optional) - Performance metrics, errors, etc.

## API

### Conversation Operations

```typescript
// Create
const conv = await chatHistoryDB.createConversation(title, options);

// Read
const conv = await chatHistoryDB.getConversation(id);
const convs = await chatHistoryDB.getConversations({ page: 1, pageSize: 20 });

// Update
await chatHistoryDB.updateConversation(id, { title: 'New Title' });

// Delete (cascade)
await chatHistoryDB.deleteConversation(id);
```

### Message Operations

```typescript
// Add message
const msg = await chatHistoryDB.addMessage(
  conversationId,
  'user',
  'Hello!',
  { tokens: 10 }
);

// Get messages
const msgs = await chatHistoryDB.getMessages(conversationId, {
  page: 1,
  pageSize: 50,
});
```

### Search

```typescript
const results = await chatHistoryDB.search({
  query: 'important',
  limit: 20,
  caseSensitive: false,
  dateRange: {
    start: Date.now() - 7 * 24 * 60 * 60 * 1000,
    end: Date.now(),
  },
  tags: ['work'],
  model: 'claude-3-opus-20240229',
});
```

### Statistics

```typescript
const stats = await chatHistoryDB.getStats();
// {
//   conversationCount: 42,
//   messageCount: 1337,
//   avgMessagesPerConversation: 31.8,
//   totalSize: 5242880,
//   mostUsedModel: 'claude-3-opus-20240229'
// }
```

### Health Monitoring

```typescript
const health = await chatHistoryDB.getHealth();
const deletedOrphans = await chatHistoryDB.cleanupOrphans();
```

## Testing

Run tests:
```bash
pnpm test
pnpm test:ui
pnpm test:coverage
```

See `chatHistory.test.ts` for comprehensive test examples.

## Documentation

Full documentation: `/home/deflex/noa-server/packages/ui/docs/chat-history-guide.md`
