# Backend Integration Documentation

This document describes the backend integration for AI Provider and File Sharing systems.

## Overview

Two major backend integrations have been implemented:

1. **AI Provider Integration** - Connect UI to ai-inference-api for AI operations
2. **File Sharing System** - Secure file sharing with JWT authentication

## 1. AI Provider Integration

### Architecture

```
UI Components → React Hooks → API Service → ai-inference-api (Express)
```

### Files Created

#### Frontend

- **`/src/services/aiProvider.ts`** - API client for AI operations
  - Model management (list, switch)
  - Chat completions (standard & streaming)
  - Embeddings generation
  - Health checks

- **`/src/hooks/useAIProvider.ts`** - React hook for AI operations
  - `useAIProvider()` - Full AI provider functionality
  - `useChat()` - Simplified chat interface
  - State management for models, streaming, errors

- **`/src/components/chat/ModelSelector.tsx`** - Model selection UI
  - Multi-provider support (OpenAI, Claude, llama.cpp)
  - Model filtering by provider
  - Context length display
  - Accessible keyboard navigation

- **`/src/components/chat/ParameterControls.tsx`** - AI parameter controls
  - Temperature (0-2)
  - Max tokens (1-4096)
  - Top P (0-1)
  - Frequency penalty (-2 to 2)
  - Presence penalty (-2 to 2)
  - Stop sequences
  - Reset to defaults

### Usage Example

```typescript
import { useAIProvider } from '@/hooks/useAIProvider';
import { ModelSelector } from '@/components/chat/ModelSelector';
import { ParameterControls } from '@/components/chat/ParameterControls';

function ChatInterface() {
  const {
    models,
    selectedModel,
    switchModel,
    createStreamingChat,
    streamState,
  } = useAIProvider();

  const [config, setConfig] = useState({
    temperature: 0.7,
    max_tokens: 2000,
  });

  return (
    <div>
      <ModelSelector
        models={models}
        selectedModel={selectedModel}
        onModelChange={switchModel}
      />

      <ParameterControls
        config={config}
        onChange={setConfig}
      />

      {streamState.isStreaming && (
        <div>{streamState.content}</div>
      )}
    </div>
  );
}
```

### API Endpoints

The service connects to these ai-inference-api endpoints:

- `GET /api/v1/models` - List all available models
- `GET /api/v1/models/:provider` - List models by provider
- `POST /api/v1/models/switch` - Switch active model
- `POST /api/v1/inference/chat` - Create chat completion
- `POST /api/v1/inference/chat/stream` - Streaming chat completion
- `POST /api/v1/inference/embeddings` - Generate embeddings
- `GET /api/v1/status` - API status

### Environment Variables

```env
VITE_AI_API_URL=http://localhost:3001/api/v1
```

## 2. File Sharing System

### Architecture

```
UI → React Hooks → Express Routes → SQLite Database
                         ↓
                  JWT Middleware
```

### Files Created

#### Backend

- **`/server/database.js`** - SQLite database setup
  - Files table (metadata)
  - File shares table (links, permissions, expiration)
  - Download logs table (tracking)
  - Automatic cleanup of expired shares

- **`/server/routes/share.js`** - Express routes for file sharing
  - Create share links
  - Verify passwords
  - Download tracking
  - Revoke shares
  - Download statistics

- **`/server/middleware/shareAuth.js`** - JWT authentication middleware
  - Token validation
  - Permission checking
  - Rate limiting
  - Password protection

- **`/server/package.json`** - Dependencies for server
  - `express` - Web framework
  - `better-sqlite3` - Database
  - `jsonwebtoken` - JWT tokens
  - `bcrypt` - Password hashing
  - `express-rate-limit` - Rate limiting

#### Frontend

- **`/src/components/files/ShareDialog.tsx`** - Share creation UI
  - Permission levels (read/write)
  - Expiration settings (1h - 30d)
  - Password protection
  - Download limits
  - Copy to clipboard

- **`/src/hooks/useFileSharing.ts`** - React hook for file sharing
  - `useFileSharing()` - Full file sharing operations
  - `useShareLink()` - Share link view/download

### Database Schema

#### Files Table
```sql
CREATE TABLE files (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  size INTEGER NOT NULL,
  mimeType TEXT,
  userId TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  deletedAt INTEGER DEFAULT NULL
);
```

#### File Shares Table
```sql
CREATE TABLE file_shares (
  id TEXT PRIMARY KEY,
  fileId TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  permission TEXT CHECK(permission IN ('read', 'write')),
  expiresAt INTEGER,
  password TEXT,
  maxDownloads INTEGER,
  downloadCount INTEGER DEFAULT 0,
  createdBy TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  revokedAt INTEGER DEFAULT NULL,
  FOREIGN KEY (fileId) REFERENCES files(id)
);
```

#### Download Logs Table
```sql
CREATE TABLE download_logs (
  id TEXT PRIMARY KEY,
  shareId TEXT NOT NULL,
  fileId TEXT NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  downloadedAt INTEGER NOT NULL,
  FOREIGN KEY (shareId) REFERENCES file_shares(id),
  FOREIGN KEY (fileId) REFERENCES files(id)
);
```

### API Endpoints

#### Share Management

- `POST /api/share` - Create share link
  ```json
  {
    "fileId": "file-123",
    "permission": "read",
    "expiresIn": 604800000,
    "password": "optional",
    "maxDownloads": 10,
    "userId": "user-123"
  }
  ```

- `GET /api/share/:token` - Get share information

- `POST /api/share/:token/verify` - Verify password
  ```json
  {
    "password": "secret"
  }
  ```

- `GET /api/share/:token/download` - Download file (with auth)

- `GET /api/share/file/:fileId` - Get all shares for file

- `DELETE /api/share/:shareId` - Revoke share

- `GET /api/share/:shareId/stats` - Download statistics

### Usage Example

```typescript
import { useFileSharing } from '@/hooks/useFileSharing';
import { ShareDialog } from '@/components/files/ShareDialog';

function FileManager() {
  const {
    createShare,
    getFileShares,
    revokeShare,
    shares,
  } = useFileSharing();

  const [showShareDialog, setShowShareDialog] = useState(false);

  const handleShare = async () => {
    const share = await createShare({
      fileId: 'file-123',
      permission: 'read',
      expiresIn: 7 * 24 * 60 * 60 * 1000, // 7 days
      password: 'optional-password',
      userId: 'current-user',
    });

    if (share) {
      console.log('Share URL:', share.shareUrl);
    }
  };

  return (
    <div>
      <button onClick={() => setShowShareDialog(true)}>
        Share File
      </button>

      <ShareDialog
        fileId="file-123"
        fileName="document.pdf"
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        onShareCreated={(share) => {
          console.log('Created:', share);
        }}
      />
    </div>
  );
}
```

### Security Features

1. **JWT Authentication** - Secure token-based access
2. **Password Protection** - bcrypt hashing for passwords
3. **Rate Limiting** - Prevent abuse (50 shares/15min, 100 downloads/15min)
4. **Expiration** - Automatic cleanup of expired links
5. **Download Limits** - Auto-revoke after max downloads
6. **IP Tracking** - Log downloads with IP/user-agent
7. **Soft Delete** - Files marked as deleted, not removed immediately

### Environment Variables

```env
JWT_SECRET=your-secret-key-change-in-production
PORT=8080
```

## Installation

### Backend Dependencies

```bash
cd /home/deflex/noa-server/packages/ui-dashboard/server
npm install
```

### Start Server

```bash
cd /home/deflex/noa-server/packages/ui-dashboard/server
npm start
```

Or with auto-reload:

```bash
npm run dev
```

### Database Location

SQLite database is created at:
```
/home/deflex/noa-server/packages/ui-dashboard/server/data/fileSharing.db
```

## Testing

### Test AI Provider Integration

```bash
# Start ai-inference-api
cd /home/deflex/noa-server/packages/ai-inference-api
npm run start:dev

# Start UI dashboard
cd /home/deflex/noa-server/packages/ui-dashboard
npm run dev
```

### Test File Sharing

```bash
# Start server
cd /home/deflex/noa-server/packages/ui-dashboard/server
npm start

# Create a share
curl -X POST http://localhost:8080/api/share \
  -H "Content-Type: application/json" \
  -d '{
    "fileId": "test-file-123",
    "permission": "read",
    "userId": "test-user"
  }'

# Get share info
curl http://localhost:8080/api/share/{token}
```

## Performance

- **Database**: SQLite with WAL mode for concurrency
- **Rate Limiting**: In-memory (use Redis in production)
- **Cleanup**: Runs every hour to revoke expired shares
- **Streaming**: Server-Sent Events for AI chat streaming

## Production Considerations

1. **Environment Variables**: Use proper secrets in production
2. **Rate Limiting**: Implement Redis-backed rate limiting
3. **File Storage**: Integrate with S3/cloud storage
4. **Authentication**: Add proper user authentication
5. **HTTPS**: Use SSL certificates
6. **Monitoring**: Add logging and error tracking
7. **Database**: Consider PostgreSQL for production scale
8. **CORS**: Configure proper CORS origins

## Troubleshooting

### AI Provider Issues

- Check `VITE_AI_API_URL` environment variable
- Verify ai-inference-api is running on port 3001
- Check browser console for CORS errors

### File Sharing Issues

- Check database file permissions
- Verify JWT_SECRET is set
- Check rate limiting if requests fail
- Inspect SQLite database: `sqlite3 data/fileSharing.db`

## File Locations Summary

### AI Provider Integration
```
/packages/ui-dashboard/src/
├── services/aiProvider.ts
├── hooks/useAIProvider.ts
└── components/chat/
    ├── ModelSelector.tsx
    └── ParameterControls.tsx
```

### File Sharing System
```
/packages/ui-dashboard/
├── server/
│   ├── database.js
│   ├── routes/share.js
│   ├── middleware/shareAuth.js
│   ├── package.json
│   └── data/fileSharing.db (created on first run)
├── src/
│   ├── components/files/ShareDialog.tsx
│   └── hooks/useFileSharing.ts
└── docs/BACKEND_INTEGRATION.md
```

## Next Steps

1. Integrate with existing authentication system
2. Add file upload/storage implementation
3. Implement real-time notifications for downloads
4. Add share analytics dashboard
5. Create admin panel for managing shares
6. Add bulk operations support
7. Implement share templates
