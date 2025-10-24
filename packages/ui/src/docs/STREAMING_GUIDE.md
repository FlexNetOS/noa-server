# Streaming and Real-time Communication Guide

Complete guide for implementing streaming AI responses and real-time features in your application.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [SSE Streaming](#sse-streaming)
- [WebSocket Real-time](#websocket-real-time)
- [Integration Patterns](#integration-patterns)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

The UI package provides comprehensive support for:

- **Server-Sent Events (SSE)** - Streaming AI responses with token-by-token updates
- **WebSocket** - Bi-directional real-time communication
- **Automatic Reconnection** - Exponential backoff with configurable retry logic
- **Connection State Management** - Visual indicators and state tracking
- **Typing Indicators** - Real-time user activity tracking
- **Error Recovery** - Graceful degradation and retry mechanisms

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Application                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────┐      ┌──────────────────┐       │
│  │ useStreamingChat │      │  useWebSocket    │       │
│  │    (SSE Hook)    │      │   (WS Hook)      │       │
│  └────────┬─────────┘      └────────┬─────────┘       │
│           │                         │                  │
│  ┌────────▼─────────┐      ┌────────▼─────────┐       │
│  │   SSE Client     │      │  WebSocket       │       │
│  │ - Reconnection   │      │  Client          │       │
│  │ - State Mgmt     │      │ - Events         │       │
│  │ - Error Handling │      │ - Rooms          │       │
│  └────────┬─────────┘      └────────┬─────────┘       │
│           │                         │                  │
└───────────┼─────────────────────────┼──────────────────┘
            │                         │
            ▼                         ▼
   ┌─────────────────┐       ┌─────────────────┐
   │  /inference/    │       │    WebSocket    │
   │   stream        │       │    Server       │
   │  (SSE Endpoint) │       │   (/ws)         │
   └─────────────────┘       └─────────────────┘
```

## Quick Start

### 1. Basic SSE Streaming Chat

```tsx
import { useStreamingChat } from '@noa/ui/hooks';
import { ConnectionStatus } from '@noa/ui/components/chat';

function ChatComponent() {
  const {
    messages,
    sendMessage,
    connectionState,
    isConnected,
  } = useStreamingChat({
    apiUrl: '/api/v1/inference/stream',
    apiKey: 'your-api-key',
    onError: (error) => console.error(error),
  });

  const handleSend = async (content: string) => {
    await sendMessage([
      { role: 'user', content, id: Date.now().toString(), timestamp: Date.now() }
    ]);
  };

  return (
    <div>
      <ConnectionStatus state={connectionState} />

      {Array.from(messages.values()).map(msg => (
        <div key={msg.id}>
          {msg.content}
          {msg.isStreaming && <span>...</span>}
        </div>
      ))}
    </div>
  );
}
```

### 2. WebSocket Real-time Updates

```tsx
import { useWebSocket } from '@noa/ui/hooks';

function RealtimeComponent() {
  const ws = useWebSocket({
    url: '/ws',
    auth: { userId: 'user-123' },
    autoConnect: true,
  });

  useEffect(() => {
    // Subscribe to events
    const unsubscribe = ws.on('message:new', (data) => {
      console.log('New message:', data);
    });

    return unsubscribe;
  }, [ws]);

  const sendMessage = () => {
    ws.emit('message:send', { content: 'Hello!' });
  };

  return (
    <div>
      <ConnectionStatus state={ws.state} />
      <button onClick={sendMessage} disabled={!ws.isConnected}>
        Send
      </button>
    </div>
  );
}
```

### 3. Typing Indicators

```tsx
import { useWebSocket, useTypingIndicator } from '@noa/ui/hooks';
import { TypingIndicator } from '@noa/ui/components/chat';

function ChatWithTyping() {
  const ws = useWebSocket({ url: '/ws' });
  const { isTyping, startTyping, stopTyping } = useTypingIndicator(ws, {
    roomId: 'room-123',
  });

  const handleInputChange = (e) => {
    if (e.target.value) {
      startTyping();
    } else {
      stopTyping();
    }
  };

  const typingUsers = Object.keys(isTyping);

  return (
    <div>
      <input onChange={handleInputChange} />

      {typingUsers.length > 0 && (
        <div>
          <TypingIndicator variant="dots" />
          {typingUsers.join(', ')} typing...
        </div>
      )}
    </div>
  );
}
```

## SSE Streaming

### SSE Client Configuration

```typescript
import { createSSEClient, ConnectionState } from '@noa/ui/utils';

const client = createSSEClient({
  url: '/api/v1/inference/stream',
  maxRetries: 5,
  initialRetryDelay: 1000,
  maxRetryDelay: 30000,
  backoffMultiplier: 2,
  headers: {
    'Authorization': 'Bearer token',
    'X-Custom-Header': 'value',
  },
  onOpen: () => console.log('Connected'),
  onError: (error) => console.error('Error:', error),
  onClose: () => console.log('Disconnected'),
});

// Subscribe to events
client.on('message', (message) => {
  const data = JSON.parse(message.data);
  console.log('Received:', data);
});

// Custom events
client.on('progress', (message) => {
  console.log('Progress:', message.data);
});

// Connect
client.connect();

// Disconnect when done
client.disconnect();
```

### Stream Message Format

The SSE endpoint follows OpenAI's streaming format:

```
data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{"role":"assistant","content":"Hello"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{"content":" world"},"finish_reason":null}]}

data: [DONE]
```

### Handling Stream Chunks

```typescript
const { messages, sendMessage } = useStreamingChat({
  apiUrl: '/api/v1/inference/stream',
});

// Send message and get stream
const messageId = await sendMessage([
  { role: 'user', content: 'Tell me a story', id: '1', timestamp: Date.now() }
], 'gpt-3.5-turbo');

// Access streaming message
const streamingMsg = messages.get(messageId);
console.log(streamingMsg?.content); // Accumulated content
console.log(streamingMsg?.isStreaming); // true while streaming
```

### Canceling Streams

```typescript
const { cancelStream } = useStreamingChat();

// Cancel active stream
cancelStream(messageId);
```

## WebSocket Real-time

### WebSocket Client Configuration

```typescript
import { createWebSocketClient } from '@noa/ui/services';

const ws = createWebSocketClient({
  url: 'ws://localhost:3000/ws',
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  autoConnect: true,
  auth: {
    token: 'auth-token',
    userId: 'user-123',
  },
});

// Event handlers
ws.on('connect', () => console.log('Connected'));
ws.on('disconnect', (reason) => console.log('Disconnected:', reason));
ws.on('error', (error) => console.error('Error:', error));

// Custom events
ws.on('message:new', (data) => {
  console.log('New message:', data);
});

// Send events
ws.emit('message:send', {
  roomId: 'room-123',
  content: 'Hello!',
});
```

### Room Management

```typescript
// Join a room
ws.emit('room:join', { roomId: 'room-123' });

// Leave a room
ws.emit('room:leave', { roomId: 'room-123' });

// Listen for room events
ws.on('room:join', ({ userId, roomId }) => {
  console.log(`${userId} joined ${roomId}`);
});
```

### Presence Tracking

```typescript
// Update presence
ws.emit('presence:update', {
  status: 'online',
  metadata: { lastActive: Date.now() },
});

// Listen for presence changes
ws.on('presence:update', ({ userId, status }) => {
  console.log(`${userId} is now ${status}`);
});
```

## Integration Patterns

### Combined SSE + WebSocket

```tsx
import { useStreamingChat } from '@noa/ui/hooks';
import { useWebSocket } from '@noa/ui/hooks';
import { StreamingChatDemo } from '@noa/ui/components/chat';

function FullFeaturedChat() {
  // Use the demo component with both SSE and WebSocket
  return (
    <StreamingChatDemo
      apiUrl="/api/v1/inference/stream"
      wsUrl="/ws"
      apiKey="your-api-key"
      userId="user-123"
      roomId="chat-room"
    />
  );
}
```

### Custom Integration

```tsx
function CustomChat() {
  const sse = useStreamingChat({
    apiUrl: '/api/v1/inference/stream',
  });

  const ws = useWebSocket({
    url: '/ws',
    auth: { userId: 'user-123' },
  });

  // Sync streaming messages to WebSocket room
  useEffect(() => {
    sse.messages.forEach((msg) => {
      if (!msg.isStreaming && msg.content) {
        ws.emit('message:broadcast', {
          roomId: 'room-123',
          message: msg,
        });
      }
    });
  }, [sse.messages, ws]);

  return (
    <div>
      {/* Your custom UI */}
    </div>
  );
}
```

## Best Practices

### 1. Error Handling

```typescript
const { sendMessage } = useStreamingChat({
  onError: (error) => {
    // Log to error tracking service
    console.error('Stream error:', error);

    // Show user-friendly message
    toast.error('Failed to stream response. Please try again.');
  },
});
```

### 2. Connection State Management

```typescript
const { connectionState, connect } = useStreamingChat();

// Auto-reconnect on visibility change
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' &&
        connectionState === ConnectionState.DISCONNECTED) {
      connect();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, [connectionState, connect]);
```

### 3. Memory Management

```typescript
const { messages, cancelStream } = useStreamingChat();

// Cleanup on unmount
useEffect(() => {
  return () => {
    // Cancel all active streams
    messages.forEach((msg, id) => {
      if (msg.isStreaming) {
        cancelStream(id);
      }
    });
  };
}, [messages, cancelStream]);
```

### 4. Rate Limiting

```typescript
import { debounce } from 'lodash';

const { startTyping } = useTypingIndicator(ws);

// Debounce typing indicator
const debouncedStartTyping = useMemo(
  () => debounce(startTyping, 500),
  [startTyping]
);

const handleInputChange = (e) => {
  debouncedStartTyping();
};
```

## Troubleshooting

### SSE Connection Issues

**Problem**: SSE connection fails immediately

**Solution**: Check CORS headers and ensure server supports `text/event-stream`

```typescript
// Server should send:
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');
res.setHeader('Access-Control-Allow-Origin', '*');
```

**Problem**: Stream stops after 30 seconds

**Solution**: Send periodic heartbeat messages from server

```javascript
// Server-side heartbeat
setInterval(() => {
  res.write(': heartbeat\n\n');
}, 15000);
```

### WebSocket Connection Issues

**Problem**: WebSocket connection drops frequently

**Solution**: Implement heartbeat/ping-pong (built into our client)

```typescript
const ws = useWebSocket({
  url: '/ws',
  // Heartbeat sent automatically every 30s
});
```

**Problem**: Messages not received after reconnection

**Solution**: Re-subscribe to events after reconnection

```typescript
ws.on('connect', () => {
  // Re-join rooms
  ws.emit('room:join', { roomId: 'room-123' });

  // Re-subscribe to events
  setupEventListeners();
});
```

### Performance Issues

**Problem**: UI lags during streaming

**Solution**: Use debouncing for rapid updates

```typescript
import { useMemo } from 'react';
import { debounce } from 'lodash';

const updateUI = useMemo(
  () => debounce((content) => {
    setDisplayContent(content);
  }, 100),
  []
);
```

**Problem**: Memory leaks from event listeners

**Solution**: Always clean up subscriptions

```typescript
useEffect(() => {
  const unsubscribe1 = ws.on('message:new', handler1);
  const unsubscribe2 = ws.on('typing:start', handler2);

  return () => {
    unsubscribe1();
    unsubscribe2();
  };
}, [ws]);
```

## API Reference

See individual component/hook documentation:

- [useStreamingChat](/home/deflex/noa-server/packages/ui/src/hooks/useStreamingChat.ts)
- [useWebSocket](/home/deflex/noa-server/packages/ui/src/hooks/useWebSocket.ts)
- [SSEClient](/home/deflex/noa-server/packages/ui/src/utils/sse-client.ts)
- [WebSocketClient](/home/deflex/noa-server/packages/ui/src/services/websocket.ts)
- [ConnectionStatus](/home/deflex/noa-server/packages/ui/src/components/chat/ConnectionStatus.tsx)

## Examples

See [StreamingChatDemo](/home/deflex/noa-server/packages/ui/src/components/chat/StreamingChatDemo.tsx) for a complete working example.
