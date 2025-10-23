export const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AI Inference API',
      version: '1.0.0',
      description: 'REST API for AI model inference and management',
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
    ],
  },
  apis: ['./src/routes/*.ts'], // Paths to files containing OpenAPI definitions
};