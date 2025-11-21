# Streaming Chat Components

Real-time communication components for AI chat with Server-Sent Events (SSE) and WebSocket support.

## Components

### StreamingChatDemo

Complete chat interface with SSE streaming and WebSocket real-time updates.

```tsx
import { StreamingChatDemo } from '@noa/ui/components/chat';

<StreamingChatDemo
  apiUrl="/api/v1/inference/stream"
  wsUrl="/ws"
  apiKey={process.env.API_KEY}
  userId="user-123"
  roomId="general"
/>
```

**Features**:
- Token-by-token streaming responses
- Real-time message broadcasting
- Typing indicators
- Connection status display
- Stream cancellation
- Error handling
- Auto-scroll

### ConnectionStatus

Visual connection state indicator with multiple variants.

```tsx
import { ConnectionStatus } from '@noa/ui/components/chat';

// Minimal variant
<ConnectionStatus state={connectionState} variant="minimal" />

// Detailed with retry info
<ConnectionStatus
  state={connectionState}
  variant="detailed"
  reconnectAttempt={2}
  maxReconnectAttempts={5}
/>

// Full with retry button
<ConnectionStatus
  state={connectionState}
  variant="full"
  onRetry={() => connect()}
/>
```

### ConnectionIndicator

Compact dot indicator for connection status.

```tsx
import { ConnectionIndicator } from '@noa/ui/components/chat';

<ConnectionIndicator state={connectionState} size="md" />
```

## Hooks

### useStreamingChat

React hook for SSE streaming chat.

```tsx
import { useStreamingChat } from '@noa/ui/hooks';

const {
  messages,        // Map of streaming messages
  sendMessage,     // Send message and start stream
  cancelStream,    // Cancel active stream
  connectionState, // Current connection state
  isConnected,     // Boolean connection status
  connect,         // Manually connect
  disconnect,      // Disconnect
} = useStreamingChat({
  apiUrl: '/api/v1/inference/stream',
  apiKey: 'your-key',
  onError: (error) => console.error(error),
});
```

### useWebSocket

React hook for WebSocket connections.

```tsx
import { useWebSocket } from '@noa/ui/hooks';

const ws = useWebSocket({
  url: '/ws',
  auth: { userId: 'user-123' },
  autoConnect: true,
});

// Send events
ws.emit('message:send', { content: 'Hello' });

// Subscribe to events
useEffect(() => {
  const unsubscribe = ws.on('message:new', (data) => {
    console.log('New message:', data);
  });
  return unsubscribe;
}, [ws]);
```

### useTypingIndicator

Track typing status for multiple users.

```tsx
import { useTypingIndicator } from '@noa/ui/hooks';

const { isTyping, startTyping, stopTyping } = useTypingIndicator(ws, {
  roomId: 'chat-123',
  typingTimeout: 3000,
});

const handleInputChange = (e) => {
  if (e.target.value) {
    startTyping();
  } else {
    stopTyping();
  }
};
```

## Core Services

### SSEClient

Low-level SSE client with reconnection.

```tsx
import { createSSEClient } from '@noa/ui/utils';

const client = createSSEClient({
  url: '/api/v1/inference/stream',
  maxRetries: 5,
  initialRetryDelay: 1000,
  headers: { Authorization: 'Bearer token' },
});

client.on('message', (message) => {
  console.log('Received:', message.data);
});

client.connect();
```

### WebSocketClient

Low-level WebSocket client with event system.

```tsx
import { createWebSocketClient } from '@noa/ui/services';

const ws = createWebSocketClient({
  url: 'ws://localhost:3000',
  reconnection: true,
  auth: { userId: 'user-123' },
});

ws.on('connect', () => console.log('Connected'));
ws.emit('message', { content: 'Hello' });
```

## Examples

See `/src/examples/streaming-chat-example.tsx` for complete examples:

1. Basic SSE streaming
2. WebSocket real-time chat
3. Typing indicators
4. Connection status variants
5. Full-featured chat
6. Error handling

## Documentation

- [Streaming Guide](/src/docs/STREAMING_GUIDE.md) - Complete usage guide
- [Implementation Summary](/src/docs/STREAMING_IMPLEMENTATION_SUMMARY.md) - Technical details
- [API Reference](/docs/api/openapi/ai-inference-api.yaml) - API specification

## Quick Start

```bash
# Install dependencies (already included in @noa/ui)
pnpm install

# Run example
pnpm dev
```

```tsx
import { StreamingChatDemo } from '@noa/ui';

function App() {
  return (
    <StreamingChatDemo
      apiUrl="/api/v1/inference/stream"
      wsUrl="/ws"
    />
  );
}
```

## Features

✅ **SSE Streaming**
- Token-by-token responses
- Automatic reconnection
- Stream cancellation
- Error recovery

✅ **WebSocket Real-time**
- Bi-directional messaging
- Event-based communication
- Room support
- Presence tracking

✅ **Typing Indicators**
- Multi-user support
- Auto-timeout
- Room filtering

✅ **Connection Management**
- State tracking
- Visual indicators
- Retry logic
- Error handling

✅ **Developer Experience**
- TypeScript support
- React hooks
- Zero config
- Comprehensive examples

## Browser Support

- Chrome 6+ (SSE), 16+ (WebSocket)
- Firefox 6+ (SSE), 11+ (WebSocket)
- Safari 5+ (SSE), 7+ (WebSocket)
- Edge 79+ (SSE), 12+ (WebSocket)

## License

MIT
