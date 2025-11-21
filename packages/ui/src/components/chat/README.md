# Chat Interface Components

Production-grade React chat components with markdown rendering, code highlighting, message bubbles, and typing indicators.

## Features

- **Markdown Rendering**: Full GitHub Flavored Markdown support with `remark` and `remark-gfm`
- **Code Highlighting**: Syntax highlighting with `rehype-highlight` and Prism
- **Message Bubbles**: User/Assistant distinction with role-based styling
- **Typing Indicators**: Animated indicators for streaming responses (dots, pulse, wave)
- **Accessibility**: Full ARIA labels, keyboard navigation, screen reader support
- **Responsive Design**: Mobile-first, works on all screen sizes
- **Dark Mode**: Automatic dark mode support via CSS media queries
- **Animations**: Smooth Framer Motion animations
- **Auto-scroll**: Intelligent scroll-to-bottom on new messages
- **Message Actions**: Copy, edit, delete, regenerate functionality

## Components

### ChatInterface

Main chat interface container with message list and auto-scroll.

```tsx
import { ChatInterface, ChatMessage } from '@noa/ui/components/chat';

const messages: ChatMessage[] = [
  {
    id: '1',
    role: 'user',
    content: 'Hello!',
    timestamp: Date.now()
  },
  {
    id: '2',
    role: 'assistant',
    content: 'Hi! How can I help you today?',
    timestamp: Date.now(),
    model: 'gpt-4'
  }
];

<ChatInterface
  messages={messages}
  onSendMessage={(content) => console.log('Send:', content)}
  onDeleteMessage={(id) => console.log('Delete:', id)}
  onEditMessage={(id, content) => console.log('Edit:', id, content)}
  onCopyMessage={(msg) => console.log('Copy:', msg)}
  onRegenerateMessage={(id) => console.log('Regenerate:', id)}
  isLoading={false}
  showTimestamps={true}
  showModelInfo={true}
  enableMarkdown={true}
  autoScroll={true}
/>
```

### Message

Individual message bubble component.

```tsx
import { Message } from '@noa/ui/components/chat';

<Message
  message={{
    id: '1',
    role: 'assistant',
    content: '# Hello\n\nThis is **markdown** content!',
    timestamp: Date.now(),
    thinking: 'Let me think about this...',
    model: 'gpt-4'
  }}
  onCopy={(msg) => console.log('Copied:', msg)}
  onDelete={(id) => console.log('Delete:', id)}
  onEdit={(id, content) => console.log('Edit:', id, content)}
  onRegenerate={(id) => console.log('Regenerate:', id)}
  showTimestamp={true}
  showModelInfo={true}
  enableMarkdown={true}
/>
```

### MarkdownContent

Renders markdown with syntax highlighting.

```tsx
import { MarkdownContent } from '@noa/ui/components/chat';

<MarkdownContent
  content="# Hello\n\n```javascript\nconst x = 42;\n```"
/>
```

### CodeBlock

Syntax-highlighted code block with copy button.

```tsx
import { CodeBlock } from '@noa/ui/components/chat';

<CodeBlock
  code="const hello = 'world';"
  language="javascript"
  showLineNumbers={true}
/>
```

### TypingIndicator

Animated typing indicator for streaming responses.

```tsx
import { TypingIndicator } from '@noa/ui/components/chat';

<TypingIndicator variant="dots" />    // Bouncing dots
<TypingIndicator variant="pulse" />   // Pulsing dot
<TypingIndicator variant="wave" />    // Wave bars
```

### MessageActions

Action buttons for messages (copy, edit, delete, regenerate).

```tsx
import { MessageActions } from '@noa/ui/components/chat';

<MessageActions
  message={message}
  onCopy={() => console.log('Copy')}
  onDelete={() => console.log('Delete')}
  onEdit={() => console.log('Edit')}
  onRegenerate={() => console.log('Regenerate')}
/>
```

## Installation

```bash
# Install dependencies
pnpm add remark remark-gfm remark-breaks remark-rehype
pnpm add rehype-highlight rehype-stringify
pnpm add highlight.js prism-react-renderer
pnpm add framer-motion
```

## Styling

Import the CSS file in your app:

```tsx
import '@noa/ui/components/chat/styles.css';
```

Or use your own custom styles by targeting these classes:
- `.chat-interface`
- `.messages-container`
- `.message`, `.message-user`, `.message-assistant`
- `.message-header`, `.message-content`
- `.typing-indicator`
- `.code-block-wrapper`

## Accessibility

All components follow WCAG 2.1 AA guidelines:

- **Keyboard Navigation**: Full keyboard support for all interactive elements
- **Screen Readers**: Proper ARIA labels and roles
- **Focus Management**: Visible focus indicators
- **Reduced Motion**: Respects `prefers-reduced-motion` media query
- **Color Contrast**: Meets WCAG contrast ratios

## TypeScript

Full TypeScript support with exported types:

```typescript
import type {
  Message,
  ChatMessage,
  MessageRole,
  ChatInterfaceProps,
  MessageProps,
  CodeBlockProps,
  TypingIndicatorProps,
  MessageActionsProps
} from '@noa/ui/components/chat';
```

## Advanced Usage

### Streaming Responses

```tsx
const [messages, setMessages] = useState<ChatMessage[]>([]);

const handleStream = async (prompt: string) => {
  const streamingMessage: ChatMessage = {
    id: Date.now().toString(),
    role: 'assistant',
    content: '',
    isStreaming: true
  };

  setMessages(prev => [...prev, streamingMessage]);

  // Simulate streaming
  for (const chunk of streamChunks) {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === streamingMessage.id
          ? { ...msg, content: msg.content + chunk }
          : msg
      )
    );
  }

  // Mark as complete
  setMessages(prev =>
    prev.map(msg =>
      msg.id === streamingMessage.id
        ? { ...msg, isStreaming: false, timestamp: Date.now() }
        : msg
    )
  );
};
```

### Custom Themes

```css
.chat-interface {
  --background: #ffffff;
  --foreground: #0a0a0a;
  --muted: #f5f5f5;
  --muted-foreground: #737373;
  --primary: #0ea5e9;
  --primary-foreground: #ffffff;
}

@media (prefers-color-scheme: dark) {
  .chat-interface {
    --background: #0a0a0a;
    --foreground: #fafafa;
    --muted: #262626;
    --muted-foreground: #a3a3a3;
  }
}
```

### Error Handling

```tsx
<Message
  message={{
    id: '1',
    role: 'assistant',
    content: 'Failed to generate response',
    error: 'API rate limit exceeded. Please try again later.',
    timestamp: Date.now()
  }}
/>
```

### Thinking/Reasoning Content

```tsx
<Message
  message={{
    id: '1',
    role: 'assistant',
    content: 'The answer is 42',
    thinking: 'Let me analyze this step by step:\n1. First...\n2. Then...',
    timestamp: Date.now()
  }}
/>
```

## Performance

- **Code Splitting**: Components use dynamic imports for optimal bundle size
- **Memoization**: React.memo and useMemo for expensive operations
- **Virtual Scrolling**: Consider using `react-window` for 1000+ messages
- **Bundle Size**: ~45KB gzipped (including dependencies)

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Android)

## Reference Implementation

Based on the Svelte chat implementation from:
`/home/deflex/noa-server/packages/llama.cpp/tools/server/webui/src/lib/components/app/chat/`

## License

MIT
