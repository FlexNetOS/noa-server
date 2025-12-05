# MCP Platform UI Dashboard

Production-ready React/TypeScript dashboard for MCP Platform with all features consolidated from three previous versions.

## Features

### Consolidated from All Versions

- ✅ **Base Features** (from model_gateway_ui_bundle)
  - Request monitoring
  - Basic statistics
  - Gateway configuration

- ✅ **Upgrade 1 Features** (from model_gateway_ui_upgrade)
  - OpenTelemetry GenAI spans visualization
  - Structured output display
  - WebRTC/TURN realtime lane support

- ✅ **Upgrade 2 Features** (from model_gateway_ui_upgrade2)
  - SSE streaming support
  - Per-tenant token budgets
  - Real-time cost tracking
  - Trace links with APM integration
  - Tenant management

### New Enhancements

- 🆕 TypeScript throughout
- 🆕 Modern React patterns (hooks, context)
- 🆕 Dark mode support
- 🆕 Responsive design with Tailwind CSS
- 🆕 State management with Zustand
- 🆕 Data fetching with TanStack Query
- 🆕 Client-side routing with React Router
- 🆕 Accessible components

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **TanStack Query** - Data fetching
- **Recharts** - Data visualization
- **React Router** - Routing
- **Axios** - HTTP client

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test

# Lint code
npm run lint

# Type check
npm run type-check
```

## Environment Variables

Create a `.env` file:

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_WS_URL=ws://localhost:8080
VITE_APM_BASE=https://apm.example.com/trace/
VITE_ENABLE_DARK_MODE=true
```

## Project Structure

```
src/
├── components/          # React components
│   ├── common/         # Shared components
│   ├── layout/         # Layout components
│   ├── dashboard/      # Dashboard-specific
│   ├── gateway/        # Gateway-specific
│   ├── tenants/        # Tenant management
│   ├── costs/          # Cost tracking
│   ├── traces/         # Trace viewer
│   └── charts/         # Chart components
├── pages/              # Page components
│   ├── Dashboard.tsx
│   ├── Gateway.tsx
│   ├── Traces.tsx
│   ├── Costs.tsx
│   ├── Tenants.tsx
│   └── Settings.tsx
├── hooks/              # Custom React hooks
│   ├── useStats.ts
│   ├── useTraces.ts
│   ├── useTenants.ts
│   └── useWebSocket.ts
├── services/           # API services
│   ├── api.ts
│   └── websocket.ts
├── store/              # State management
│   ├── userStore.ts
│   ├── gatewayStore.ts
│   └── tenantStore.ts
├── utils/              # Utility functions
│   ├── format.ts
│   └── constants.ts
├── types/              # TypeScript types
│   └── index.ts
├── styles/             # Global styles
│   └── globals.css
├── App.tsx             # Main app component
└── main.tsx            # Entry point
```

## API Integration

The UI expects the following API endpoints from the gateway:

- `GET /api/stats` - Overall statistics
- `GET /api/traces` - Recent traces
- `GET /api/tenants` - List of tenants
- `GET /api/tenants/:id` - Tenant details
- `GET /api/tenants/:id/records` - Tenant records
- `GET /api/gateway/config` - Gateway configuration
- `PUT /api/gateway/config` - Update gateway config

## Features Roadmap

- [ ] Complete Gateway configuration UI
- [ ] Advanced trace viewer with flame graphs
- [ ] Cost analysis dashboards
- [ ] Tenant CRUD operations
- [ ] User authentication
- [ ] Role-based access control
- [ ] Real-time updates via WebSocket
- [ ] Export data to CSV/JSON
- [ ] Custom alerting rules
- [ ] Mobile app support

## License

MIT
