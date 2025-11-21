#!/bin/bash

echo "====================================="
echo "Backend Integration Verification"
echo "====================================="
echo ""

# Check frontend files
echo "Checking Frontend Files..."
FILES=(
  "src/services/aiProvider.ts"
  "src/hooks/useAIProvider.ts"
  "src/hooks/useFileSharing.ts"
  "src/components/chat/ModelSelector.tsx"
  "src/components/chat/ParameterControls.tsx"
  "src/components/files/ShareDialog.tsx"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "✓ $file"
  else
    echo "✗ $file (MISSING)"
  fi
done

echo ""
echo "Checking Backend Files..."
BACKEND_FILES=(
  "server/database.js"
  "server/routes/share.js"
  "server/middleware/shareAuth.js"
  "server/package.json"
  "server/api-server.js"
)

for file in "${BACKEND_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "✓ $file"
  else
    echo "✗ $file (MISSING)"
  fi
done

echo ""
echo "Checking Documentation..."
DOCS=(
  "docs/BACKEND_INTEGRATION.md"
  "docs/QUICK_START_BACKEND.md"
  "docs/IMPLEMENTATION_SUMMARY.md"
)

for doc in "${DOCS[@]}"; do
  if [ -f "$doc" ]; then
    echo "✓ $doc"
  else
    echo "✗ $doc (MISSING)"
  fi
done

echo ""
echo "Checking Dependencies..."
cd server
if [ -f "package.json" ]; then
  echo "Package.json exists"
  echo "Required dependencies:"
  grep -E "better-sqlite3|jsonwebtoken|bcrypt|express-rate-limit" package.json && echo "✓ All required dependencies listed"
else
  echo "✗ server/package.json not found"
fi

echo ""
echo "====================================="
echo "Verification Complete"
echo "====================================="
echo ""
echo "Next Steps:"
echo "1. cd server && npm install"
echo "2. npm start"
echo "3. Test with: curl http://localhost:8080/health"
