#!/bin/bash

# Python API Client Generator for Noa Server
# This script generates a Python client from the OpenAPI specification

set -e

echo "🚀 Generating Python API Client..."

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

# Generate Python client
echo "⚙️  Generating client from OpenAPI spec..."
openapi-generator-cli generate \
    -i "$OPENAPI_SPEC" \
    -g python \
    -o "$OUTPUT_DIR" \
    --additional-properties=\
packageName=noa_server_api,\
packageVersion=1.0.0,\
projectName=noa-server-api-client,\
packageUrl=https://github.com/deflex/noa-server

# Create virtual environment
echo "🐍 Creating virtual environment..."
cd "$OUTPUT_DIR"
python3 -m venv venv
source venv/bin/activate

# Install dependencies
echo "📦 Installing dependencies..."
pip install -r requirements.txt

# Install in development mode
echo "🔧 Installing package in development mode..."
pip install -e .

echo "✅ Python client generated successfully!"
echo "📁 Output directory: $OUTPUT_DIR"
echo ""
echo "Usage:"
echo "  from noa_server_api import Configuration, ApiClient, AuthenticationApi"
echo ""
echo "  configuration = Configuration("
echo "      host='https://api.noa-server.io/v1',"
echo "      access_token='YOUR_ACCESS_TOKEN'"
echo "  )"
echo ""
echo "  with ApiClient(configuration) as api_client:"
echo "      auth_api = AuthenticationApi(api_client)"
echo "      response = auth_api.auth_login({'email': email, 'password': password})"
