#!/bin/bash

# TypeScript API Client Generator for Noa Server
# This script generates a TypeScript client from the OpenAPI specification

set -e

echo "🚀 Generating TypeScript API Client..."

# Check if openapi-generator-cli is installed
if ! command -v openapi-generator-cli &> /dev/null; then
    echo "📦 Installing openapi-generator-cli..."
    npm install -g @openapitools/openapi-generator-cli
fi

# Set directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPENAPI_SPEC="$SCRIPT_DIR/../../openapi.yaml"
OUTPUT_DIR="$SCRIPT_DIR/generated"

# Clean previous generation
if [ -d "$OUTPUT_DIR" ]; then
    echo "🧹 Cleaning previous generation..."
    rm -rf "$OUTPUT_DIR"
fi

# Generate TypeScript client
echo "⚙️  Generating client from OpenAPI spec..."
openapi-generator-cli generate \
    -i "$OPENAPI_SPEC" \
    -g typescript-axios \
    -o "$OUTPUT_DIR" \
    --additional-properties=\
npmName=@noa-server/api-client,\
npmVersion=1.0.0,\
supportsES6=true,\
withInterfaces=true,\
useSingleRequestParameter=true,\
withSeparateModelsAndApi=true

# Install dependencies
echo "📦 Installing dependencies..."
cd "$OUTPUT_DIR"
npm install

# Build the client
echo "🔨 Building TypeScript client..."
npm run build

echo "✅ TypeScript client generated successfully!"
echo "📁 Output directory: $OUTPUT_DIR"
echo ""
echo "Usage:"
echo "  import { Configuration, AuthenticationApi } from '@noa-server/api-client';"
echo ""
echo "  const config = new Configuration({"
echo "    basePath: 'https://api.noa-server.io/v1',"
echo "    accessToken: 'YOUR_ACCESS_TOKEN'"
echo "  });"
echo ""
echo "  const authApi = new AuthenticationApi(config);"
echo "  const response = await authApi.authLogin({ email, password });"
