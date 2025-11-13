/**
 * Chat Completion Example - Fetch API
 * Basic example using native Fetch API
 */

const API_BASE_URL = 'http://localhost:3000/api/v1';
const API_KEY = 'your-api-key-here'; // Or use JWT token

async function chatCompletion() {
  try {
    const response = await fetch(`${API_BASE_URL}/inference/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant.',
          },
          {
            role: 'user',
            content: 'What is the capital of France?',
          },
        ],
        model: 'gpt-4',
        config: {
          temperature: 0.7,
          max_tokens: 1000,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API Error: ${error.error.message}`);
    }

    const data = await response.json();
    console.log('Response:', data.choices[0].message.content);
    console.log('Tokens used:', data.usage.total_tokens);

    return data;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

// Example with streaming
async function streamingChatCompletion() {
  const response = await fetch(`${API_BASE_URL}/inference/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      messages: [
        {
          role: 'user',
          content: 'Tell me a story about AI.',
        },
      ],
      model: 'gpt-3.5-turbo',
      config: {
        stream: true,
        temperature: 0.8,
      },
    }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n').filter((line) => line.trim() !== '');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          console.log('\nStream completed');
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices[0]?.delta?.content;
          if (content) {
            process.stdout.write(content);
          }
        } catch (e) {
          console.error('Parse error:', e);
        }
      }
    }
  }
}

// Run examples
if (require.main === module) {
  chatCompletion()
    .then(() => console.log('\n\nStarting streaming example...'))
    .then(() => streamingChatCompletion())
    .catch((error) => console.error('Fatal error:', error));
}

module.exports = { chatCompletion, streamingChatCompletion };
