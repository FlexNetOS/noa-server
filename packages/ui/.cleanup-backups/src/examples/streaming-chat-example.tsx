/**
 * Streaming Chat Example
 *
 * Comprehensive example demonstrating all streaming and real-time features:
 * - SSE streaming chat
 * - WebSocket real-time updates
 * - Typing indicators
 * - Connection status
 * - Error handling
 * - Message history
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useStreamingChat } from '../hooks/useStreamingChat';
import { useWebSocket, useTypingIndicator } from '../hooks/useWebSocket';
import {
  ConnectionStatus,
  ConnectionIndicator,
  StreamingChatDemo,
} from '../components/chat';
import TypingIndicator from '../components/chat/TypingIndicator';
import type { Message } from '../types/chat';

/**
 * Example 1: Basic SSE Streaming
 */
export function BasicStreamingExample() {
  const {
    messages,
    sendMessage,
    connectionState,
    isConnected,
  } = useStreamingChat({
    apiUrl: '/api/v1/inference/stream',
    apiKey: process.env.VITE_API_KEY,
  });

  const [input, setInput] = useState('');

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    await sendMessage([userMessage], 'gpt-3.5-turbo');
    setInput('');
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Basic Streaming Chat</h2>
        <ConnectionStatus state={connectionState} variant="minimal" />
      </div>

      <div className="space-y-4 mb-4 h-96 overflow-y-auto border rounded-lg p-4">
        {Array.from(messages.values()).map((msg) => (
          <div key={msg.id} className="space-y-2">
            <div
              className={`p-3 rounded-lg ${
                msg.role === 'assistant'
                  ? 'bg-gray-100 mr-auto max-w-md'
                  : 'bg-blue-100 ml-auto max-w-md'
              }`}
            >
              {msg.isStreaming && (
                <div className="text-xs text-gray-500 mb-1">Streaming...</div>
              )}
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.error && (
                <p className="text-red-500 text-sm mt-2">{msg.error}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder={isConnected ? 'Type a message...' : 'Connecting...'}
          disabled={!isConnected}
          className="flex-1 px-4 py-2 border rounded-lg"
        />
        <button
          onClick={handleSend}
          disabled={!isConnected || !input.trim()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}

/**
 * Example 2: WebSocket Real-time Chat
 */
export function WebSocketChatExample() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');

  const ws = useWebSocket({
    url: '/ws',
    auth: { userId: 'user-123' },
    autoConnect: true,
    onConnect: () => {
      console.log('WebSocket connected');
      // Join room on connect
      ws.emit('room:join', { roomId: 'general' });
    },
  });

  // Listen for new messages
  useEffect(() => {
    const unsubscribe = ws.on('message:new', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    return unsubscribe;
  }, [ws]);

  const handleSend = () => {
    if (!input.trim()) return;

    ws.emit('message:send', {
      roomId: 'general',
      content: input,
      timestamp: Date.now(),
    });

    setInput('');
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">WebSocket Real-time Chat</h2>
        <div className="flex items-center gap-2">
          <ConnectionIndicator state={ws.state} size="md" />
          <span className="text-sm text-gray-600">
            {ws.isConnected ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      <div className="space-y-2 mb-4 h-96 overflow-y-auto border rounded-lg p-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className="p-3 rounded-lg bg-gray-100 max-w-md"
          >
            <div className="text-xs text-gray-500 mb-1">
              {msg.userId} • {new Date(msg.timestamp).toLocaleTimeString()}
            </div>
            <p>{msg.content}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder={ws.isConnected ? 'Type a message...' : 'Connecting...'}
          disabled={!ws.isConnected}
          className="flex-1 px-4 py-2 border rounded-lg"
        />
        <button
          onClick={handleSend}
          disabled={!ws.isConnected || !input.trim()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}

/**
 * Example 3: Typing Indicators
 */
export function TypingIndicatorExample() {
  const [input, setInput] = useState('');
  const ws = useWebSocket({ url: '/ws' });
  const { isTyping, startTyping, stopTyping } = useTypingIndicator(ws, {
    roomId: 'general',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);

    if (e.target.value.length > 0) {
      startTyping();
    } else {
      stopTyping();
    }
  };

  const typingUsers = Object.keys(isTyping);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">Typing Indicators</h2>

      <div className="mb-4 h-20 border rounded-lg p-4 flex items-center">
        {typingUsers.length > 0 ? (
          <div className="flex items-center gap-2">
            <TypingIndicator variant="dots" />
            <span className="text-sm text-gray-600">
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'}{' '}
              typing...
            </span>
          </div>
        ) : (
          <span className="text-sm text-gray-400">No one is typing</span>
        )}
      </div>

      <input
        type="text"
        value={input}
        onChange={handleInputChange}
        placeholder="Start typing to see indicator..."
        className="w-full px-4 py-2 border rounded-lg"
      />
    </div>
  );
}

/**
 * Example 4: Connection Status Variants
 */
export function ConnectionStatusExample() {
  const sse = useStreamingChat({ apiUrl: '/api/v1/inference/stream' });
  const ws = useWebSocket({ url: '/ws' });

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8">
      <h2 className="text-2xl font-bold">Connection Status Variants</h2>

      <div className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">Minimal Variant</h3>
          <div className="flex gap-4">
            <ConnectionStatus state={sse.connectionState} variant="minimal" />
            <ConnectionStatus state={ws.state} variant="minimal" />
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Detailed Variant</h3>
          <div className="flex gap-4">
            <ConnectionStatus
              state={sse.connectionState}
              variant="detailed"
              reconnectAttempt={2}
              maxReconnectAttempts={5}
            />
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Full Variant</h3>
          <ConnectionStatus
            state={ws.state}
            variant="full"
            reconnectAttempt={3}
            maxReconnectAttempts={5}
            onRetry={() => ws.connect()}
          />
        </div>

        <div>
          <h3 className="font-semibold mb-2">Indicator Only</h3>
          <div className="flex gap-4 items-center">
            <ConnectionIndicator state={sse.connectionState} size="sm" />
            <ConnectionIndicator state={sse.connectionState} size="md" />
            <ConnectionIndicator state={sse.connectionState} size="lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Example 5: Full-Featured Chat (Everything Combined)
 */
export function FullFeaturedChatExample() {
  return (
    <div className="h-screen">
      <StreamingChatDemo
        apiUrl="/api/v1/inference/stream"
        wsUrl="/ws"
        apiKey={process.env.VITE_API_KEY}
        userId="user-demo"
        roomId="demo-room"
        className="h-full"
      />
    </div>
  );
}

/**
 * Example 6: Error Handling
 */
export function ErrorHandlingExample() {
  const [errors, setErrors] = useState<string[]>([]);

  const {
    connectionState,
  } = useStreamingChat({
    apiUrl: '/api/v1/inference/stream',
    onError: (error) => {
      setErrors((prev) => [...prev, `SSE Error: ${error.message}`]);
    },
  });

  const ws = useWebSocket({
    url: '/ws',
    onError: (error) => {
      setErrors((prev) => [...prev, `WebSocket Error: ${error}`]);
    },
    onDisconnect: (reason) => {
      setErrors((prev) => [...prev, `Disconnected: ${reason || 'Unknown'}`]);
    },
  });

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">Error Handling Demo</h2>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <h3 className="font-semibold mb-2">SSE Status</h3>
          <ConnectionStatus state={connectionState} variant="detailed" />
        </div>
        <div>
          <h3 className="font-semibold mb-2">WebSocket Status</h3>
          <ConnectionStatus state={ws.state} variant="detailed" />
        </div>
      </div>

      <div className="border rounded-lg p-4 bg-red-50">
        <h3 className="font-semibold mb-2">Error Log</h3>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {errors.length === 0 ? (
            <p className="text-sm text-gray-500">No errors</p>
          ) : (
            errors.map((error, idx) => (
              <div key={idx} className="text-sm text-red-600">
                {new Date().toLocaleTimeString()} - {error}
              </div>
            ))
          )}
        </div>
        {errors.length > 0 && (
          <button
            onClick={() => setErrors([])}
            className="mt-2 text-sm text-red-600 underline"
          >
            Clear errors
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Main Examples Component
 */
export function StreamingChatExamples() {
  const [activeExample, setActiveExample] = useState('basic');

  const examples = [
    { id: 'basic', label: 'Basic Streaming', component: BasicStreamingExample },
    { id: 'websocket', label: 'WebSocket Chat', component: WebSocketChatExample },
    { id: 'typing', label: 'Typing Indicators', component: TypingIndicatorExample },
    { id: 'status', label: 'Connection Status', component: ConnectionStatusExample },
    { id: 'full', label: 'Full Featured', component: FullFeaturedChatExample },
    { id: 'errors', label: 'Error Handling', component: ErrorHandlingExample },
  ];

  const ActiveComponent = examples.find((ex) => ex.id === activeExample)?.component || BasicStreamingExample;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold mb-4">Streaming Chat Examples</h1>
          <div className="flex gap-2 flex-wrap">
            {examples.map((ex) => (
              <button
                key={ex.id}
                onClick={() => setActiveExample(ex.id)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeExample === ex.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="py-8">
        <ActiveComponent />
      </div>
    </div>
  );
}

export default StreamingChatExamples;
