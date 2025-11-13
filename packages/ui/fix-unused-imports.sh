#!/bin/bash
# Script to fix common unused import/variable patterns

cd /home/deflex/noa-server/packages/ui

# Fix unused React imports in remaining files
find src -name "*.tsx" -type f -exec sed -i 's/^import React, { /import { /g' {} \;
find src -name "*.tsx" -type f -exec sed -i 's/^import React from .react.;$//' {} \;

# Fix unused variables by prefixing with underscore
find src -name "*.ts" -o -name "*.tsx" -type f -exec sed -i 's/(\([a-zA-Z_][a-zA-Z0-9_]*\)) =>/(_\1) =>/g' {} \;

echo "Fixed unused imports and variables"
