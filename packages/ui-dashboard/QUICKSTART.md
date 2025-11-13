# Quick Start Guide - Claude Suite Dashboard

## Installation & Setup

### 1. Install Dependencies

```bash
cd /home/deflex/noa-server/packages/ui-dashboard
npm install
cd server
npm install
cd ..
```

### 2. Start the Backend API Server

In one terminal:

```bash
cd /home/deflex/noa-server/packages/ui-dashboard/server
npm start
```

This starts the API server on `http://localhost:8080` with WebSocket support.

### 3. Start the Frontend Dashboard

In another terminal:

```bash
cd /home/deflex/noa-server/packages/ui-dashboard
npm run dev
```

This starts the Vite dev server on `http://localhost:3000`.

### 4. Access the Dashboard

Open your browser to:

- **Dashboard**: http://localhost:3000
- **API Health**: http://localhost:8080/health

## Features Overview

### Real-time Monitoring

- Auto-refresh every 5 seconds (toggleable)
- WebSocket for live updates
- Performance metrics charts

### Agent Management

- View all active agents
- Pause/resume agents
- Monitor CPU and memory usage
- Track task counts and response times

### Task Queue

- View pending and running tasks
- Monitor task progress
- Cancel running tasks
- Filter by priority and status

### System Health

- CPU, memory, disk usage
- Network metrics
- Service status indicators
- MCP, Neural, Swarm, Hooks status

### Agent Swarm Visualization

- Interactive network graph
- Real-time agent status
- Connection visualization
- Color-coded by status

### Performance Charts

- Response time trends
- Throughput metrics
- Real-time updates

### Neural Processing

- GPU utilization
- VRAM usage
- Inference statistics
- Model accuracy

### Truth Gate Status

- Queen Seraphina verification
- Accuracy percentage
- Pass/fail status

## Production Build

```bash
# Build the dashboard
npm run build

# Preview the build
npm run preview
```

## Environment Configuration

Create `.env` in the dashboard root:

```env
VITE_API_URL=http://localhost:8080/api
VITE_WS_URL=ws://localhost:8080
```

## Troubleshooting

### Port Already in Use

If port 3000 or 8080 is in use:

```bash
# Frontend
PORT=3001 npm run dev

# Backend
PORT=8081 npm start
```

Update `.env` accordingly.

### API Connection Issues

The dashboard will fall back to static file-based data if the API is
unavailable. Check:

- Backend server is running
- Firewall settings
- CORS configuration

### WebSocket Connection Failed

- Ensure backend server is running
- Check browser console for errors
- Verify WebSocket endpoint in `.env`

## Development Tips

### Hot Module Replacement

Vite supports HMR - changes to React components will update instantly.

### TypeScript Errors

Run type checking:

```bash
npm run build
```

### Component Development

Components are in `src/components/`. Each is self-contained with props
interface.

### State Management

Global state is managed via Zustand in `src/services/store.ts`.

### API Integration

Update `src/services/api.ts` to connect to real MCP endpoints.

## Next Steps

1. Connect to real Claude-Flow MCP endpoints
2. Implement authentication
3. Add user preferences persistence
4. Create custom dashboard layouts
5. Add export/reporting features
