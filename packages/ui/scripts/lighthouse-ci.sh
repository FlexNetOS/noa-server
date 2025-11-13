#!/bin/bash
# Run Lighthouse CI for performance monitoring

set -e

echo "🔍 Running Lighthouse CI..."

# Ensure dependencies are installed
if ! command -v lhci &> /dev/null; then
  echo "📦 Installing @lhci/cli..."
  npm install -g @lhci/cli
fi

# Build the application
echo "🏗️  Building application..."
npm run build

# Start preview server in background
echo "🚀 Starting preview server..."
npm run preview &
SERVER_PID=$!

# Wait for server to be ready
echo "⏳ Waiting for server to be ready..."
sleep 5

# Run Lighthouse CI
echo "📊 Running Lighthouse audits..."
lhci autorun || {
  echo "⚠️  Lighthouse CI failed, but continuing..."
}

# Kill the preview server
echo "🛑 Stopping preview server..."
kill $SERVER_PID 2>/dev/null || true

# Display results
if [ -f "./docs/lhci-report.html" ]; then
  echo "✅ Lighthouse CI completed!"
  echo "📄 Report available at: ./docs/lhci-report.html"
else
  echo "⚠️  Lighthouse CI completed, but no report was generated"
fi

echo ""
echo "Performance targets:"
echo "  • Performance:     ≥90"
echo "  • Accessibility:   ≥90"
echo "  • Best Practices:  ≥90"
echo "  • SEO:             ≥80"
echo "  • PWA:             ≥80"
