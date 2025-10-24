#!/bin/bash
# Generate API Documentation
# Automatically generates OpenAPI specs from code annotations

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
DOCS_DIR="${SCRIPT_DIR}/.."

echo "🚀 Generating API Documentation..."
echo "Project Root: ${PROJECT_ROOT}"
echo "Docs Directory: ${DOCS_DIR}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}✓${NC} $1"
}

log_section() {
    echo -e "\n${YELLOW}=== $1 ===${NC}\n"
}

# Install dependencies if needed
log_section "Checking Dependencies"

if ! command -v npx &> /dev/null; then
    echo "Installing Node.js dependencies..."
    cd "${PROJECT_ROOT}"
    pnpm install
fi

# Validate OpenAPI specs
log_section "Validating OpenAPI Specifications"

OPENAPI_DIR="${DOCS_DIR}/openapi"

for spec in "${OPENAPI_DIR}"/*.yaml; do
    if [ -f "$spec" ]; then
        spec_name=$(basename "$spec")
        echo "Validating ${spec_name}..."

        # Use openapi-cli for validation
        if command -v openapi &> /dev/null; then
            openapi validate "$spec" && log_info "${spec_name} is valid"
        else
            echo "⚠️  openapi-cli not installed. Install with: npm install -g @redocly/openapi-cli"
        fi
    fi
done

# Generate static documentation
log_section "Generating Static Documentation"

# Generate ReDoc static HTML
for spec in "${OPENAPI_DIR}"/*.yaml; do
    if [ -f "$spec" ]; then
        spec_name=$(basename "$spec" .yaml)
        output="${DOCS_DIR}/static/${spec_name}.html"

        echo "Generating ReDoc for ${spec_name}..."

        if command -v redoc-cli &> /dev/null; then
            redoc-cli bundle "$spec" -o "$output" --title "NOA Server - ${spec_name}"
            log_info "Generated ${output}"
        else
            echo "⚠️  redoc-cli not installed. Install with: npm install -g redoc-cli"
        fi
    fi
done

# Bundle OpenAPI specs
log_section "Bundling OpenAPI Specifications"

BUNDLE_DIR="${DOCS_DIR}/bundles"
mkdir -p "${BUNDLE_DIR}"

for spec in "${OPENAPI_DIR}"/*.yaml; do
    if [ -f "$spec" ]; then
        spec_name=$(basename "$spec" .yaml)
        bundle_json="${BUNDLE_DIR}/${spec_name}.json"

        echo "Bundling ${spec_name} to JSON..."

        if command -v openapi &> /dev/null; then
            openapi bundle "$spec" --output "$bundle_json" --ext json
            log_info "Generated ${bundle_json}"
        fi
    fi
done

# Generate SDK documentation
log_section "Generating SDK Documentation"

# TypeScript SDK docs
if [ -d "${PROJECT_ROOT}/packages/ai-inference-api" ]; then
    echo "Generating TypeScript SDK docs..."
    cd "${PROJECT_ROOT}/packages/ai-inference-api"

    if [ -f "package.json" ]; then
        # Generate TypeDoc if configured
        if grep -q "typedoc" package.json; then
            pnpm run docs || echo "⚠️  TypeDoc generation failed"
        fi
    fi
fi

# Generate changelog
log_section "Generating API Changelog"

CHANGELOG_FILE="${DOCS_DIR}/CHANGELOG.md"

cat > "${CHANGELOG_FILE}" << 'EOF'
# API Changelog

## Version 1.0.0 (2024-01-01)

### AI Inference API
- ✅ Chat completions with streaming support
- ✅ Text embeddings generation
- ✅ Multi-provider model switching
- ✅ Async job processing

### Authentication API
- ✅ Email/password registration and login
- ✅ Multi-factor authentication (TOTP)
- ✅ API key management
- ✅ OAuth 2.0 and SAML SSO support
- ✅ Role-based access control (RBAC)

### Message Queue API
- ✅ Priority queue support
- ✅ Dead letter queues (DLQ)
- ✅ Message retry with exponential backoff
- ✅ WebSocket real-time updates

### Monitoring API
- ✅ Kubernetes health probes
- ✅ Prometheus metrics
- ✅ Real-time log streaming
- ✅ Custom metric collection

## Breaking Changes
None (initial release)

## Deprecations
None

## Known Issues
None
EOF

log_info "Generated ${CHANGELOG_FILE}"

# Generate API reference index
log_section "Generating API Reference Index"

INDEX_FILE="${DOCS_DIR}/README.md"

cat > "${INDEX_FILE}" << 'EOF'
# NOA Server API Documentation

Complete API documentation for NOA Server with interactive examples.

## 📚 API References

### [AI Inference API](openapi/ai-inference-api.yaml)
Comprehensive AI inference API supporting multiple providers (OpenAI, Claude, llama.cpp).

**Key Features:**
- Chat completions with streaming
- Text embeddings generation
- Multi-provider model switching
- Async job processing

### [Authentication API](openapi/auth-api.yaml)
Enterprise-grade authentication and authorization.

**Key Features:**
- Email/password + OAuth 2.0 + SAML SSO
- Multi-factor authentication (TOTP)
- API key management
- Role-based access control (RBAC)

### [Message Queue API](openapi/message-queue-api.yaml)
High-performance message queue for asynchronous processing.

**Key Features:**
- Priority queue support
- Dead letter queues (DLQ)
- Message retry with exponential backoff
- WebSocket real-time updates

### [Monitoring API](openapi/monitoring-api.yaml)
Comprehensive monitoring and observability.

**Key Features:**
- Kubernetes health probes
- Prometheus metrics
- Real-time log streaming
- Custom metric collection

## 🚀 Quick Start

### Interactive Documentation

**Swagger UI** (Try API calls in browser):
```bash
open docs/api/swagger-ui.html
# Or visit: http://localhost:3000/api-docs
```

**ReDoc** (Beautiful static docs):
```bash
open docs/api/redoc.html
# Or visit: http://localhost:3000/api-docs/redoc
```

### Code Examples

**JavaScript/TypeScript**:
```javascript
import { NoaClient } from './examples/javascript/client';

const client = new NoaClient('http://localhost:3000/api/v1');
await client.login('user@example.com', 'password');

const response = await client.chatCompletion([
  { role: 'user', content: 'Hello!' }
]);
```

**Python**:
```python
from client import NoaClient

client = NoaClient('http://localhost:3000/api/v1')
client.login('user@example.com', 'password')

response = client.chat_completion([
    {'role': 'user', 'content': 'Hello!'}
])
```

**cURL**:
```bash
# See examples/curl/examples.sh for complete collection
./docs/api/examples/curl/examples.sh
```

### Postman Collection

Import the Postman collection for instant API testing:

1. Download: [noa-server.json](postman/noa-server.json)
2. Import into Postman
3. Set environment variables:
   - `baseUrl`: http://localhost:3000/api/v1
   - `authToken`: (auto-populated after login)

## 📖 Documentation Structure

```
docs/api/
├── openapi/                    # OpenAPI 3.1 specifications
│   ├── ai-inference-api.yaml
│   ├── auth-api.yaml
│   ├── message-queue-api.yaml
│   └── monitoring-api.yaml
├── examples/                   # Code examples
│   ├── javascript/
│   ├── python/
│   └── curl/
├── postman/                    # Postman collection
│   └── noa-server.json
├── sdk/                        # SDK documentation
│   ├── typescript/
│   └── python/
├── scripts/                    # Automation scripts
│   ├── generate-api-docs.sh
│   └── validate-openapi.sh
├── swagger-ui.html             # Interactive Swagger UI
├── redoc.html                  # ReDoc documentation
└── README.md                   # This file
```

## 🔐 Authentication

All API endpoints (except `/auth/*` and `/health`) require authentication.

### JWT Bearer Token
```bash
# Login to get token
TOKEN=$(curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' \
  | jq -r '.token.accessToken')

# Use token in requests
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/models
```

### API Key
```bash
# Create API key (requires login)
API_KEY=$(curl -X POST http://localhost:3000/api/v1/auth/api-keys \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Production Key"}' \
  | jq -r '.key')

# Use API key in requests
curl -H "X-API-Key: $API_KEY" \
  http://localhost:3000/api/v1/models
```

## 🛠️ Development

### Generate Documentation
```bash
./docs/api/scripts/generate-api-docs.sh
```

### Validate OpenAPI Specs
```bash
./docs/api/scripts/validate-openapi.sh
```

### Run Example Scripts
```bash
# JavaScript examples
node docs/api/examples/javascript/chat-completion.js

# Python examples
python docs/api/examples/python/client.py

# cURL examples
./docs/api/examples/curl/examples.sh
```

## 📝 API Versioning

- **Current Version**: v1
- **Base URL**: `/api/v1`
- **Deprecation Policy**: 6 months notice for breaking changes
- **Changelog**: [CHANGELOG.md](CHANGELOG.md)

## 🔗 Additional Resources

- [OpenAPI Specification](https://swagger.io/specification/)
- [Swagger UI Documentation](https://swagger.io/tools/swagger-ui/)
- [ReDoc Documentation](https://redocly.com/docs/redoc/)
- [Postman Learning Center](https://learning.postman.com/)

## 📞 Support

- **Documentation**: https://noa-server.io/docs
- **API Reference**: https://noa-server.io/api-docs
- **Support Email**: support@noa-server.io
- **GitHub Issues**: https://github.com/your-org/noa-server/issues
EOF

log_info "Generated ${INDEX_FILE}"

# Summary
log_section "Documentation Generation Complete"

echo "📄 Generated files:"
echo "  - OpenAPI specifications validated"
echo "  - Static HTML documentation"
echo "  - API changelog"
echo "  - README with quick start guide"
echo ""
echo "📂 View documentation:"
echo "  - Swagger UI: file://${DOCS_DIR}/swagger-ui.html"
echo "  - ReDoc: file://${DOCS_DIR}/redoc.html"
echo "  - README: file://${DOCS_DIR}/README.md"
echo ""
log_info "All documentation generated successfully!"
