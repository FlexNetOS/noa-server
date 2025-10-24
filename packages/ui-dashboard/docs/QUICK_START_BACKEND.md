# Backend Integration Quick Start Guide

This guide will help you quickly set up and test the AI Provider Integration and File Sharing System.

## Prerequisites

- Node.js 20+ installed
- pnpm or npm package manager
- ai-inference-api running (for AI provider testing)

## Installation

### Step 1: Install Backend Dependencies

```bash
cd /home/deflex/noa-server/packages/ui-dashboard/server
npm install
```

This installs:
- `express` - Web framework
- `better-sqlite3` - SQLite database
- `jsonwebtoken` - JWT authentication
- `bcrypt` - Password hashing
- `express-rate-limit` - Rate limiting
- `ws` - WebSocket server
- `cors` - CORS support

### Step 2: Set Environment Variables (Optional)

Create a `.env` file in the server directory:

```bash
PORT=8080
JWT_SECRET=your-secure-secret-key-here
```

For production, always use a strong, random JWT_SECRET.

### Step 3: Start the Server

```bash
npm start
```

You should see:
```
Claude Suite API Server running on http://localhost:8080
API endpoint: http://localhost:8080/api/telemetry
File sharing routes loaded
WebSocket endpoint: ws://localhost:8080
WebSocket server ready for connections
File sharing database initialized
```

## Testing AI Provider Integration

### 1. Start ai-inference-api

First, ensure the AI inference API is running:

```bash
cd /home/deflex/noa-server/packages/ai-inference-api
npm run start:dev
```

### 2. Set Frontend Environment Variable

Create or update `/packages/ui-dashboard/.env`:

```bash
VITE_AI_API_URL=http://localhost:3001/api/v1
```

### 3. Test AI Provider Service

Create a test file to verify the connection:

```typescript
// test-ai-provider.ts
import { aiProviderService } from './src/services/aiProvider';

async function test() {
  // Test 1: Get available models
  console.log('Getting models...');
  const models = await aiProviderService.getAvailableModels();
  console.log('Available models:', models);

  // Test 2: Create chat completion
  if (models.length > 0) {
    console.log('\nTesting chat completion...');
    const response = await aiProviderService.createChatCompletion(
      [{ role: 'user', content: 'Hello!' }],
      models[0].id,
      { temperature: 0.7, max_tokens: 100 }
    );
    console.log('Response:', response);
  }

  // Test 3: Health check
  console.log('\nChecking API health...');
  const isHealthy = await aiProviderService.healthCheck();
  console.log('API is healthy:', isHealthy);
}

test().catch(console.error);
```

Run with:
```bash
npx tsx test-ai-provider.ts
```

### 4. Test React Components

Start the UI dashboard:

```bash
cd /home/deflex/noa-server/packages/ui-dashboard
npm run dev
```

Use the components:

```tsx
import { useAIProvider } from '@/hooks/useAIProvider';
import { ModelSelector } from '@/components/chat/ModelSelector';

function TestPage() {
  const { models, selectedModel, switchModel } = useAIProvider();

  return (
    <div>
      <h1>AI Provider Test</h1>
      <ModelSelector
        models={models}
        selectedModel={selectedModel}
        onModelChange={switchModel}
      />
    </div>
  );
}
```

## Testing File Sharing System

### 1. Create a Share Link (cURL)

```bash
curl -X POST http://localhost:8080/api/share \
  -H "Content-Type: application/json" \
  -d '{
    "fileId": "test-file-123",
    "permission": "read",
    "expiresIn": 604800000,
    "password": "secret123",
    "maxDownloads": 10,
    "userId": "test-user"
  }'
```

Response:
```json
{
  "shareId": "abc123...",
  "token": "xyz789...",
  "shareUrl": "http://localhost:8080/share/xyz789...",
  "expiresAt": 1234567890,
  "permission": "read",
  "requiresPassword": true
}
```

### 2. Get Share Information

```bash
curl http://localhost:8080/api/share/{token}
```

### 3. Verify Password

```bash
curl -X POST http://localhost:8080/api/share/{token}/verify \
  -H "Content-Type: application/json" \
  -d '{"password": "secret123"}'
```

### 4. Download File

```bash
curl http://localhost:8080/api/share/{token}/download \
  -H "Authorization: Bearer {accessToken}"
```

### 5. Test React Components

```tsx
import { useFileSharing } from '@/hooks/useFileSharing';
import { ShareDialog } from '@/components/files/ShareDialog';

function TestFilePage() {
  const { createShare } = useFileSharing();
  const [showDialog, setShowDialog] = useState(false);

  const handleShare = async () => {
    const share = await createShare({
      fileId: 'test-file-123',
      permission: 'read',
      expiresIn: 7 * 24 * 60 * 60 * 1000,
      userId: 'test-user',
    });
    console.log('Share created:', share);
  };

  return (
    <div>
      <button onClick={() => setShowDialog(true)}>
        Share File
      </button>

      <ShareDialog
        fileId="test-file-123"
        fileName="document.pdf"
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
        onShareCreated={(share) => console.log('Created:', share)}
      />
    </div>
  );
}
```

## Database Inspection

View the SQLite database:

```bash
cd /home/deflex/noa-server/packages/ui-dashboard/server
sqlite3 data/fileSharing.db

# List tables
.tables

# View files
SELECT * FROM files;

# View shares
SELECT * FROM file_shares;

# View download logs
SELECT * FROM download_logs;

# Exit
.quit
```

## Common Issues

### Issue: "Module not found" errors

**Solution**: Install dependencies
```bash
cd /home/deflex/noa-server/packages/ui-dashboard/server
npm install
```

### Issue: "EADDRINUSE" - Port already in use

**Solution**: Change port or kill existing process
```bash
# Find process using port 8080
lsof -i :8080

# Kill process
kill -9 <PID>

# Or use different port
PORT=8081 npm start
```

### Issue: Cannot connect to ai-inference-api

**Solution**: Verify ai-inference-api is running
```bash
curl http://localhost:3001/health
```

If not running:
```bash
cd /home/deflex/noa-server/packages/ai-inference-api
npm run start:dev
```

### Issue: CORS errors in browser

**Solution**: Server already has CORS enabled. If issues persist, check:
```javascript
// server/api-server.js
app.use(cors({
  origin: '*', // Or specify your frontend URL
  credentials: true,
}));
```

### Issue: Database locked

**Solution**: Close all connections
```bash
# If database is locked, close server and remove lock
rm -f data/fileSharing.db-wal data/fileSharing.db-shm
```

## Development Workflow

### 1. Start All Services

Terminal 1 - AI Inference API:
```bash
cd /home/deflex/noa-server/packages/ai-inference-api
npm run start:dev
```

Terminal 2 - Backend Server:
```bash
cd /home/deflex/noa-server/packages/ui-dashboard/server
npm run dev  # Auto-reloads on changes
```

Terminal 3 - Frontend:
```bash
cd /home/deflex/noa-server/packages/ui-dashboard
npm run dev
```

### 2. Access Services

- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- AI Inference API: http://localhost:3001
- API Docs: http://localhost:3001/api-docs

## Testing Checklist

### AI Provider Integration

- [ ] Models load successfully
- [ ] Can switch between models
- [ ] Chat completion works
- [ ] Streaming chat works
- [ ] Parameters can be adjusted
- [ ] Error handling works
- [ ] Health check passes

### File Sharing System

- [ ] Can create share links
- [ ] Password protection works
- [ ] Expiration dates work
- [ ] Download limits work
- [ ] Can download files
- [ ] Can revoke shares
- [ ] Download tracking works
- [ ] Rate limiting works

## Next Steps

1. **Integrate with authentication**: Replace `userId` with real auth tokens
2. **Add file upload**: Implement actual file storage (S3, local filesystem)
3. **Add analytics**: Track share usage and downloads
4. **Enhance security**: Add IP whitelisting, more granular permissions
5. **Add notifications**: Email/webhook notifications for downloads
6. **Create admin panel**: Manage all shares from one place

## Production Deployment

Before deploying to production:

1. **Environment Variables**
   - Use strong JWT_SECRET
   - Configure proper CORS origins
   - Set secure database path

2. **Database**
   - Consider PostgreSQL for production
   - Set up regular backups
   - Configure connection pooling

3. **Security**
   - Use HTTPS only
   - Implement rate limiting with Redis
   - Add authentication middleware
   - Enable database encryption
   - Set secure headers (helmet.js)

4. **Monitoring**
   - Add logging (Winston, Bunyan)
   - Set up error tracking (Sentry)
   - Monitor database performance
   - Track API metrics

5. **Performance**
   - Enable caching
   - Use CDN for static files
   - Optimize database queries
   - Implement connection pooling

## Support

For issues or questions:
- Check `/docs/BACKEND_INTEGRATION.md` for detailed documentation
- Review source code comments
- Check ai-inference-api documentation

## File Locations

```
/packages/ui-dashboard/
├── server/
│   ├── api-server.js               # Main server (updated)
│   ├── database.js                 # Database setup
│   ├── routes/share.js             # Share API routes
│   ├── middleware/shareAuth.js     # Authentication
│   ├── package.json                # Dependencies
│   └── data/fileSharing.db         # SQLite database
├── src/
│   ├── services/aiProvider.ts      # AI API client
│   ├── hooks/
│   │   ├── useAIProvider.ts        # AI React hook
│   │   └── useFileSharing.ts       # File sharing hook
│   └── components/
│       ├── chat/
│       │   ├── ModelSelector.tsx   # Model picker
│       │   └── ParameterControls.tsx # AI parameters
│       └── files/
│           └── ShareDialog.tsx     # Share creation UI
└── docs/
    ├── BACKEND_INTEGRATION.md      # Full documentation
    └── QUICK_START_BACKEND.md      # This file
```
