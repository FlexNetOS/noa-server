/**
 * Chat Page
 * Chat interface with conversation list
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import ChatInterface from '../components/chat/ChatInterface';
import { useChatHistory } from '../hooks/useChatHistory';
import type { Message } from '../types/chat';

const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const { conversations, activeConversationId, setActiveConversation } = useChatHistory();
  const [messages, setMessages] = useState<Message[]>([]);

  const handleSendMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, newMessage]);

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'This is a simulated response. Connect to your AI backend to enable real conversations.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    }, 1000);
  };

  const handleNewConversation = () => {
    const conversationId = Date.now().toString();
    navigate(`/chat/${conversationId}`);
  };

  return (
    <div className="page-container h-full flex flex-col">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Chat</h1>
            <p className="page-description">
              AI-powered conversations
            </p>
          </div>
          <button
            onClick={handleNewConversation}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            New Chat
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 mt-6 overflow-hidden">
        {/* Conversation list */}
        <aside className="w-64 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-y-auto">
          <div className="p-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Recent Conversations
            </h2>
            <div className="space-y-2">
              {conversations.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No conversations yet
                </p>
              ) : (
                conversations.map((conv) => (
                  <Link
                    key={conv.id}
                    to={`/chat/${conv.id}`}
                    className={`block p-3 rounded-lg transition-colors ${
                      conv.id === activeConversationId
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="text-sm font-medium truncate">
                      {conv.title}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(conv.updatedAt).toLocaleDateString()}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </aside>

        {/* Chat interface */}
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-4">
              <ChatInterface
                messages={messages}
                onSendMessage={handleSendMessage}
                showTimestamps
                enableMarkdown
              />
            </div>

            {/* Input area */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const input = form.elements.namedItem('message') as HTMLInputElement;
                  if (input.value.trim()) {
                    handleSendMessage(input.value);
                    input.value = '';
                  }
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  name="message"
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
