#!/bin/bash
# Simple Noa Server Launcher
# Starts LangGraph (Noa) and MCP servers

set -e

NOA_DIR="$HOME/noa-server"
VENV="$NOA_DIR/noa/venv/bin/activate"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Noa Server (LangGraph + MCP)${NC}"

# Check if venv exists
if [ ! -f "$VENV" ]; then
    echo "❌ Virtual environment not found at $VENV"
    echo "Run installation steps first"
    exit 1
fi

# Activate venv
source "$VENV"

# Start LangGraph dev server (port 8000)
echo -e "${GREEN}Starting LangGraph server on :8000...${NC}"
cd "$NOA_DIR/noa"
langgraph dev --port 8000 &
LANGGRAPH_PID=$!

# Start MCP server (port 8001)
echo -e "${GREEN}Starting MCP server on :8001...${NC}"
cd "$NOA_DIR/mcp"

# Check if MCP has a proper startup command
if [ -f "src/langgraph_mcp/__main__.py" ]; then
    python -m langgraph_mcp --port 8001 &
    MCP_PID=$!
elif command -v langgraph &> /dev/null; then
    # MCP might be run via langgraph too
    langgraph dev --port 8001 &
    MCP_PID=$!
else
    echo "⚠️  MCP startup command not found - please check MCP documentation"
    MCP_PID=""
fi

# Give servers time to start
sleep 3

echo ""
echo -e "${GREEN}✅ Noa Server Started!${NC}"
echo -e "  LangGraph: http://localhost:8000"
if [ -n "$MCP_PID" ]; then
    echo -e "  MCP:       http://localhost:8001"
fi
echo ""
echo "Press Ctrl+C to stop all servers"

# Trap to kill background processes on exit
trap "echo ''; echo 'Stopping servers...'; kill $LANGGRAPH_PID $MCP_PID 2>/dev/null; exit" INT TERM

# Wait for processes
wait
