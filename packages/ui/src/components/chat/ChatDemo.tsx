/**
 * ChatDemo Component
 * Example usage of the ChatInterface component with streaming support
 */

import React, { useState, useCallback } from 'react';
import ChatInterface from './ChatInterface';
import type { ChatMessage } from '../../types/chat';
import './styles.css';

const ChatDemo: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant. How can I help you today?',
      timestamp: Date.now() - 60000,
      model: 'gpt-4'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = useCallback(async (content: string) => {
    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Simulate API call with streaming
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: generateResponse(content),
        timestamp: Date.now(),
        model: 'gpt-4',
        thinking: 'Analyzing the question and formulating a response...'
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  }, []);

  const handleDeleteMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  }, []);

  const handleEditMessage = useCallback((messageId: string, newContent: string) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId
          ? { ...msg, content: newContent, timestamp: Date.now() }
          : msg
      )
    );
  }, []);

  const handleCopyMessage = useCallback((message: ChatMessage) => {
    console.log('Copied message:', message);
  }, []);

  const handleRegenerateMessage = useCallback((messageId: string) => {
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1) return;

    const previousMessage = messages[messageIndex - 1];

    if (!previousMessage || previousMessage.role !== 'user') return;

    // Remove the message to regenerate
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
    setIsLoading(true);

    // Generate new response
    setTimeout(() => {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: generateResponse(previousMessage.content),
        timestamp: Date.now(),
        model: 'gpt-4',
        thinking: 'Regenerating response with a different approach...'
      };

      setMessages(prev => [...prev, newMessage]);
      setIsLoading(false);
    }, 1000);
  }, [messages]);

  return (
    <div className="demo-container">
      <div className="demo-header">
        <h1>Chat Interface Demo</h1>
        <p>Production-grade React chat with markdown, code highlighting, and streaming</p>
      </div>

      <ChatInterface
        messages={messages}
        onSendMessage={handleSendMessage}
        onDeleteMessage={handleDeleteMessage}
        onEditMessage={handleEditMessage}
        onCopyMessage={handleCopyMessage}
        onRegenerateMessage={handleRegenerateMessage}
        isLoading={isLoading}
        showTimestamps={true}
        showModelInfo={true}
        enableMarkdown={true}
        autoScroll={true}
      />

      <div className="demo-footer">
        <button onClick={() => handleSendMessage('Tell me a joke')}>
          Ask for a joke
        </button>
        <button onClick={() => handleSendMessage('Show me some code examples')}>
          Code examples
        </button>
        <button onClick={() => setMessages([])}>
          Clear chat
        </button>
      </div>
    </div>
  );
};

// Helper function to generate sample responses
function generateResponse(userMessage: string): string {
  const lowerMessage = userMessage.toLowerCase();

  if (lowerMessage.includes('joke')) {
    return `Sure! Here's a programming joke:

Why do programmers prefer dark mode?

Because light attracts bugs! 🐛`;
  }

  if (lowerMessage.includes('code')) {
    return `Here are some code examples:

## JavaScript Example

\`\`\`javascript
// React component with hooks
import React, { useState, useEffect } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    document.title = \`Count: \${count}\`;
  }, [count]);

  return (
    <div>
      <h1>Count: {count}</h1>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}
\`\`\`

## Python Example

\`\`\`python
# List comprehension with filtering
numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
even_squares = [x**2 for x in numbers if x % 2 == 0]
print(even_squares)  # [4, 16, 36, 64, 100]
\`\`\`

## TypeScript Example

\`\`\`typescript
// Generic type with constraints
interface HasId {
  id: number;
}

function findById<T extends HasId>(items: T[], id: number): T | undefined {
  return items.find(item => item.id === id);
}

const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' }
];

const user = findById(users, 1);
\`\`\``;
  }

  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return `Hello! 👋 I'm here to help. You can ask me about:

- **Code examples** in various languages
- **Programming jokes** to lighten the mood
- **Technical questions** about development
- **Markdown formatting** and styling

What would you like to know?`;
  }

  return `I received your message: "${userMessage}"

I'm a demo assistant, so my responses are limited. Try asking me for:
- A joke
- Code examples
- Saying hello

Or you can edit/delete messages to see those features in action!`;
}

export default ChatDemo;
