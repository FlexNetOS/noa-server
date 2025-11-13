/**
 * Conversation Page
 * Individual conversation view with deep linking
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import ChatInterface from '../components/chat/ChatInterface';
import { useChatHistory } from '../hooks/useChatHistory';
import { useRouteState } from '../hooks/useRouteState';
import type { Message } from '../types/chat';

const ConversationPage: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { getConversation, setActiveConversation } = useChatHistory();
  const [messages, setMessages] = useState<Message[]>([]);

  // Sync search filter with URL
  const [searchQuery, setSearchQuery] = useRouteState('search', {
    defaultValue: '',
  });

  // Load conversation
  useEffect(() => {
    if (!conversationId) return;

    setActiveConversation(conversationId);
    const conversation = getConversation(conversationId);

    if (conversation) {
      setMessages(conversation.messages);
    } else {
      // New conversation
      setMessages([]);
    }
  }, [conversationId, setActiveConversation, getConversation]);

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
        content: 'This is a simulated response for conversation ' + conversationId,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    }, 1000);
  };

  const handleDeleteConversation = () => {
    if (confirm('Delete this conversation?')) {
      // TODO: Implement delete
      navigate('/chat');
    }
  };

  const filteredMessages = searchQuery
    ? messages.filter((msg) =>
        msg.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  return (
    <div className="page-container h-full flex flex-col">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/chat"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
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
                <path d="m15 18-6-6 6-6" />
              </svg>
            </Link>
            <div>
              <h1 className="page-title">Conversation</h1>
              <p className="page-description">ID: {conversationId}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="search"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleDeleteConversation}
              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Delete conversation"
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
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 mt-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="flex-1 overflow-y-auto p-4">
            {searchQuery && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Showing {filteredMessages.length} of {messages.length} messages
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="ml-2 underline hover:no-underline"
                    >
                      Clear search
                    </button>
                  )}
                </p>
              </div>
            )}
            <ChatInterface
              messages={filteredMessages}
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
  );
};

export default ConversationPage;
