/**
 * Streaming Chat Demo Component
 *
 * Demonstrates integration of:
 * - SSE streaming responses
 * - WebSocket real-time updates
 * - Typing indicators
 * - Connection status
 * - Message history management
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useStreamingChat } from '../../hooks/useStreamingChat';
import { useWebSocket, useTypingIndicator } from '../../hooks/useWebSocket';
import { ConnectionStatus } from './ConnectionStatus';
import TypingIndicator from './TypingIndicator';
import type { Message, ChatMessage } from '../../types/chat';

export interface StreamingChatDemoProps {
  apiUrl?: string;
  wsUrl?: string;
  apiKey?: string;
  userId?: string;
  roomId?: string;
  className?: string;
}

export const StreamingChatDemo: React.FC<StreamingChatDemoProps> = ({
  apiUrl = '/api/v1/inference/stream',
  wsUrl = '/ws',
  apiKey,
  userId = 'user-1',
  roomId = 'default',
  className = '',
}) => {
  const [messageHistory, setMessageHistory] = useState<Message[]>([
    {
      id: 'system-1',
      role: 'system',
      content: 'You are a helpful AI assistant.',
      timestamp: Date.now(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // SSE streaming hook
  const {
    messages: streamingMessages,
    sendMessage,
    cancelStream,
    connectionState: sseState,
    isConnected: sseConnected,
    connect: connectSSE,
  } = useStreamingChat({
    apiUrl,
    apiKey,
    onError: (error) => {
      console.error('Streaming error:', error);
    },
  });

  // WebSocket hook for real-time updates
  const ws = useWebSocket({
    url: wsUrl,
    auth: { userId, room: roomId },
    onConnect: () => {
      console.log('WebSocket connected');
    },
    onDisconnect: (reason) => {
      console.log('WebSocket disconnected:', reason);
    },
  });

  // Typing indicator hook
  const { isTyping, startTyping, stopTyping } = useTypingIndicator(ws, {
    roomId,
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messageHistory, streamingMessages]);

  // Handle real-time messages from other users
  useEffect(() => {
    const unsubscribe = ws.on('message:new', (message: ChatMessage) => {
      setMessageHistory((prev) => [...prev, message]);
    });

    return unsubscribe;
  }, [ws]);

  // Handle input change with typing indicator
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInputValue(e.target.value);

      if (!isComposing && e.target.value.length > 0) {
        setIsComposing(true);
        startTyping();
      } else if (isComposing && e.target.value.length === 0) {
        setIsComposing(false);
        stopTyping();
      }
    },
    [isComposing, startTyping, stopTyping]
  );

  // Handle message send
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || !sseConnected) return;

    const userMessage: Message = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: Date.now(),
    };

    // Add user message to history
    const updatedHistory = [...messageHistory, userMessage];
    setMessageHistory(updatedHistory);

    // Clear input and stop typing
    setInputValue('');
    setIsComposing(false);
    stopTyping();

    try {
      // Send streaming request
      await sendMessage(updatedHistory);

      // Broadcast to other users via WebSocket
      ws.emit('message:send', {
        roomId,
        message: userMessage,
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [
    inputValue,
    messageHistory,
    sseConnected,
    sendMessage,
    ws,
    roomId,
    stopTyping,
  ]);

  // Handle Enter key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Combine regular messages and streaming messages
  const allMessages = React.useMemo(() => {
    const messages: ChatMessage[] = messageHistory.map((msg) => ({
      ...msg,
      isStreaming: false,
    }));

    // Add streaming messages
    streamingMessages.forEach((streamMsg) => {
      if (!messages.find((m) => m.id === streamMsg.id)) {
        messages.push(streamMsg as ChatMessage);
      }
    });

    return messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  }, [messageHistory, streamingMessages]);

  // Get typing users
  const typingUsers = Object.keys(isTyping).filter((uid) => uid !== userId);

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-900 ${className}`}>
      {/* Header with connection status */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          AI Chat
        </h2>
        <div className="flex items-center gap-3">
          <ConnectionStatus
            state={sseState}
            variant="minimal"
            showText={false}
            className="mr-2"
          />
          <ConnectionStatus
            state={ws.state}
            variant="minimal"
            showText={false}
          />
          {!sseConnected && (
            <button
              onClick={connectSSE}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Reconnect
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {allMessages
          .filter((msg) => msg.role !== 'system')
          .map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                }`}
              >
                {message.isStreaming && (
                  <div className="flex items-center gap-2 mb-1">
                    <TypingIndicator variant="dots" className="text-xs" />
                    <button
                      onClick={() => cancelStream(message.id)}
                      className="text-xs underline hover:no-underline"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {message.thinking && (
                  <div className="text-sm italic opacity-75 mb-2 border-l-2 border-gray-400 pl-2">
                    {message.thinking}
                  </div>
                )}

                <div className="whitespace-pre-wrap break-words">
                  {message.content || (message.isStreaming ? '' : 'Thinking...')}
                </div>

                {message.error && (
                  <div className="mt-2 text-xs text-red-400 border-l-2 border-red-400 pl-2">
                    Error: {message.error}
                  </div>
                )}

                {message.model && (
                  <div className="mt-2 text-xs opacity-50">
                    {message.model}
                  </div>
                )}
              </div>
            </div>
          ))}

        {/* Typing indicator for other users */}
        {typingUsers.length > 0 && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2">
              <TypingIndicator variant="dots" />
              <span className="text-xs text-gray-600 dark:text-gray-400 ml-2">
                {typingUsers.length === 1
                  ? `${typingUsers[0]} is typing...`
                  : `${typingUsers.length} users are typing...`}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <textarea
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              sseConnected
                ? 'Type your message... (Shift+Enter for new line)'
                : 'Connecting...'
            }
            disabled={!sseConnected}
            rows={3}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || !sseConnected}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Send
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div>
            {isComposing && (
              <span className="flex items-center gap-1">
                <TypingIndicator variant="dots" className="scale-75" />
                Typing...
              </span>
            )}
          </div>
          <div>
            {streamingMessages.size > 0 && (
              <span>{streamingMessages.size} active stream(s)</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreamingChatDemo;
