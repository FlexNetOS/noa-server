# PostgreSQL Migration Plan & Implementation

**Status**: Phase 1 Complete - Infrastructure Ready | Phase 2 In Progress - Service Migration

**Last Updated**: 2025-11-07

## Executive Summary

The NOA Server is transitioning from Supabase (cloud-hosted PostgreSQL) to a fully self-hosted PostgreSQL database. This document outlines the completed infrastructure, implementation status, and roadmap for migrating all 28+ service modules to use the new AsyncPG database client.

### Current Status

✅ **Phase 1 (Complete)**: Database Infrastructure
- AsyncPG client abstraction layer created
- PostgreSQL schema fully initialized (10 tables)
- 2 migrations successfully applied
- Database connection pooling implemented
- Backward compatibility maintained

⏳ **Phase 2 (In Progress)**: Service Migration
- Credential service migration planned
- 27 remaining service modules pending migration
- Integration tests to be created

🎯 **Phase 3 (Planned)**: Production Optimization
- Vector search with pgvector extension
- Performance optimization
- Full-text search enhancement

## Architecture Overview

### System Topology

```
┌─────────────────────────────────────────────────────────────┐
│                    NOA Server Services (28+)                 │
│  (credential_service, project_service, task_service, etc.)   │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌──────────────────┐    ┌──────────────────┐
│  AsyncPG Client  │    │ Supabase SDK     │
│  (New)           │    │ (Legacy)         │
└────────┬─────────┘    └────────┬─────────┘
         │                       │
         └───────────┬───────────┘
                     │
        ┌────────────▼────────────┐
        │  PostgreSQL 15          │
        │  (Local Docker)          │
        │  Port: 5432             │
        └─────────────────────────┘

Data Storage:
- 10 Core Tables
- 2 RPC Functions
- Full migration tracking
- UUID primary keys + timestamps on all tables
```

### Database Architecture

```
PostgreSQL 15 (noa_dev)
├── System Tables
│   ├── archon_migrations (tracking)
│   ├── archon_settings (encrypted config)
│   └── pgcrypto, pg_trgm extensions
│
├── Knowledge Base
│   ├── archon_sources (URLs, metadata)
│   ├── archon_crawled_pages (chunks + embeddings)
│   ├── archon_code_examples (code snippets)
│   ├── archon_page_metadata (full pages)
│   └── archon_document_versions (versioning)
│
├── Project Management
│   ├── archon_projects (containers)
│   ├── archon_tasks (hierarchical)
│   └── archon_project_sources (junctions)
│
└── RPC Functions
    ├── match_archon_crawled_pages_multi() [vector search]
    └── search_archon_pages_fts() [full-text search]
```

## Phase 1: Implementation Details

### 1. AsyncPG Database Client

**File**: `/home/deflex/noa-server/packages/archon/python/src/server/database/client.py` (310 lines)

#### Core Components

```python
class DatabaseConnectionPool:
    """Manages asyncpg connection pool with lifecycle management."""

    Configuration:
    - min_size: 5 connections
    - max_size: 20 connections
    - command_timeout: 60 seconds
    - idle_in_transaction_session_timeout: 30 seconds
    - Prepared statement caching: enabled
```

**Key Methods**:
- `initialize()` - Create connection pool
- `get_connection()` - Acquire connection from pool
- `close()` - Shutdown pool gracefully

```python
class DatabaseClient:
    """High-level async database operations."""

    CRUD Methods:
    - fetch(query, *args) → List[Dict]
    - fetchrow(query, *args) → Dict | None
    - execute(query, *args) → None
    - insert(table, data, returning="*") → Dict
    - insert_many(rows, table) → List[Dict]
    - update(table, data, where_clause) → Dict
    - delete(table, where_clause) → int

    Advanced Methods:
    - select(table, columns="*", where="") → List[Dict]
    - call_function(func_name, *args) → List[Dict]
    - transaction() → TransactionContext
    - table_exists(table_name) → bool
    - execute_migration(sql, name) → None
```

#### Connection Pool Example Usage

```python
from src.server.database import get_database_client

async def get_user_projects(user_id: str):
    db = await get_database_client()

    projects = await db.select(
        "archon_projects",
        where=f"created_by = '{user_id}'"
    )

    return projects

async def create_task_with_transaction(project_id: str, task_data: dict):
    db = await get_database_client()

    async with db.transaction():
        task = await db.insert("archon_tasks", {
            "project_id": project_id,
            **task_data
        })

        await db.insert("archon_project_sources", {
            "project_id": project_id,
            "source_id": task["id"]
        })

        return task
```

**Connection Management**:
```python
# Application startup
await DatabaseConnectionPool.initialize()

# Application shutdown
await shutdown_database()
```

### 2. Migration System

**File**: `/home/deflex/noa-server/packages/archon/python/src/server/database/migrations.py` (330+ lines)

#### Migration 001: Initial Schema

Creates 10 core tables with:
- UUID primary keys
- Automatic timestamp tracking (created_at, updated_at)
- Appropriate indexes for query performance
- JSONB columns for flexible metadata storage
- Foreign key constraints with CASCADE delete
- Encryption support for sensitive data

**Tables Created**:

1. **archon_migrations** (system)
   - Tracks which migrations have been applied
   - Prevents duplicate execution
   - Records duration and status

2. **archon_settings** (configuration)
   - Stores encrypted credentials (OpenAI API key, etc.)
   - Application configuration
   - Support for encrypted and plaintext values

3. **archon_sources** (knowledge base)
   - Web URLs, documents, resources
   - Source type tracking (webpage, pdf, code, etc.)
   - Crawl status and timestamps
   - Metadata for categorization

4. **archon_crawled_pages** (documents)
   - Chunked page content with embeddings
   - Tracks embedding dimension for vector search
   - Is_summary flag for abstraction levels
   - Foreign key to archon_sources

5. **archon_code_examples** (knowledge)
   - Programming language tracking
   - Code snippets with context
   - References to source documents

6. **archon_page_metadata** (full pages)
   - Complete page content and HTML
   - SEO metadata
   - Full-text search ready

7. **archon_projects** (management)
   - Project containers
   - Metadata for organization
   - Status tracking

8. **archon_tasks** (project tasks)
   - Hierarchical tasks (parent_id for subtasks)
   - Status, priority, assignment
   - Due dates and metadata
   - Indexes for common queries

9. **archon_project_sources** (relationships)
   - Many-to-many junction table
   - Links projects to knowledge sources
   - Unique constraint prevents duplicates

10. **archon_document_versions** (versioning)
    - Track document version history
    - Content snapshots
    - Version metadata

#### Migration 002: Vector Search Functions

Creates PostgreSQL RPC functions:

```sql
match_archon_crawled_pages_multi(
    query_embedding: double precision[],
    embedding_dimension: integer,
    match_count: integer = 10,
    filter: jsonb = '{}',
    search_type: text = NULL
) → TABLE(id UUID, source_id UUID, url VARCHAR, title VARCHAR, content TEXT, similarity FLOAT8)
```

**Purpose**: Vector similarity search for semantic retrieval
- Ready for pgvector extension in production
- Current implementation returns by recency (stub)
- Will use vector dot product or cosine similarity with pgvector

```sql
search_archon_pages_fts(
    search_query: text,
    match_count: integer = 10
) → TABLE(id UUID, source_id UUID, url VARCHAR, title VARCHAR, content TEXT)
```

**Purpose**: Full-text search across page content and titles
- Case-insensitive substring matching (ILIKE)
- Searches both title and content columns
- Returns results ordered by recency

#### Migration Manager API

```python
class MigrationManager:
    @classmethod
    async def initialize(cls) -> None:
        """Run all pending migrations."""
        # Checks archon_migrations table
        # Applies only new migrations
        # Tracks execution duration and status

    @classmethod
    async def reset(cls) -> None:
        """DROP all tables (dev/testing only)."""
        # Deletes tables in correct dependency order
        # Clears all data (use with caution!)

    @classmethod
    async def get_status(cls) -> dict:
        """Return migration status."""
        # Returns: {
        #   "total_migrations": 2,
        #   "applied_migrations": 2,
        #   "pending_migrations": 0,
        #   "applied": ["001_initial_schema", "002_vector_search_functions"],
        #   "pending": []
        # }
```

### 3. Database Initialization Script

**File**: `/home/deflex/noa-server/packages/archon/python/src/server/database/initialize.py` (95 lines)

One-command database setup:

```bash
# Initialize database with all migrations
python -m src.server.database.initialize

# Reset database (dev/testing - drops all tables)
python -m src.server.database.initialize reset
```

**Initialization Process**:
1. Initialize connection pool
2. Run all pending migrations
3. Verify all 10 tables exist
4. Report migration status
5. Gracefully shutdown pool

**Sample Output**:
```
============================================================
ARCHON DATABASE INITIALIZATION
============================================================

📦 Initializing connection pool...

🔄 Running migrations...
  Applying initial schema migration...
  ✅ 001_initial_schema applied
  Applying vector search functions...
  ✅ 002_vector_search_functions applied

📊 Verifying database schema...
  ✓ archon_migrations
  ✓ archon_settings
  ✓ archon_sources
  ✓ archon_crawled_pages
  ✓ archon_code_examples
  ✓ archon_page_metadata
  ✓ archon_projects
  ✓ archon_tasks
  ✓ archon_project_sources
  ✓ archon_document_versions

📝 Migration status:
  Total migrations: 2
  Applied: 2
  Pending: 0

  Applied migrations:
    - 001_initial_schema
    - 002_vector_search_functions

============================================================
✅ DATABASE INITIALIZATION SUCCESSFUL
============================================================
```

### 4. Backward Compatibility

**File**: `/home/deflex/noa-server/packages/archon/python/src/server/services/client_manager.py`

**Dual-Backend Support**:

```python
def get_backend_type() -> str:
    """Detect which database backend is configured."""
    database_url = os.getenv("DATABASE_URL")
    supabase_url = os.getenv("SUPABASE_URL")

    if database_url and "postgres" in database_url.lower():
        return "asyncpg"  # Use PostgreSQL
    elif supabase_url:
        return "supabase"  # Use Supabase
    else:
        return "asyncpg" if ASYNCPG_AVAILABLE else "supabase"

# Services can check backend type
if get_backend_type() == "asyncpg":
    db = await get_database_client()  # AsyncPG
else:
    db = await get_supabase_client()  # Supabase SDK
```

**Fallback Logic**:
- If PostgreSQL connection fails, services continue in degraded mode
- Supabase SDK still available for backward compatibility
- No breaking changes to existing code

## Phase 2: Service Migration Roadmap

### Current State

**Services Not Yet Migrated**: 28+ modules

```
credential_service.py
project_service.py
task_service.py
source_service.py
crawled_page_service.py
code_example_service.py
page_metadata_service.py
document_version_service.py
search_service.py
rag_service.py
embedding_service.py
... and 17 more
```

### Migration Strategy

#### Step 1: Credential Service (Priority 1)

**Current Implementation** (Supabase SDK):
```python
async def load_all_credentials():
    supabase = await get_supabase_client()
    response = supabase.table("archon_settings").select("*").execute()
    return response.data
```

**New Implementation** (AsyncPG):
```python
async def load_all_credentials():
    db = await get_database_client()
    settings = await db.select("archon_settings")

    # Decrypt encrypted settings
    for setting in settings:
        if setting["is_encrypted"] and setting["encrypted_value"]:
            setting["value"] = decrypt_value(setting["encrypted_value"])

    return settings
```

**Migration Checklist**:
- [ ] Replace all `get_supabase_client()` calls with `get_database_client()`
- [ ] Convert `.table().select().execute()` to `db.select()`
- [ ] Update `.table().insert().execute()` to `db.insert()`
- [ ] Update `.table().update().eq().execute()` to `db.update()`
- [ ] Update `.table().delete().eq().execute()` to `db.delete()`
- [ ] Add encryption/decryption logic for sensitive fields
- [ ] Update unit tests
- [ ] Test with local PostgreSQL

#### Step 2: Core Data Services

**Priority Order**:
1. source_service.py (knowledge base)
2. crawled_page_service.py (document chunks)
3. code_example_service.py (code snippets)
4. page_metadata_service.py (full pages)
5. project_service.py (projects)
6. task_service.py (tasks)
7. document_version_service.py (versioning)

**Migration Pattern**:
```python
# OLD (Supabase SDK)
async def get_sources():
    supabase = await get_supabase_client()
    response = supabase.table("archon_sources").select("*").execute()
    return response.data

async def create_source(data):
    supabase = await get_supabase_client()
    response = supabase.table("archon_sources").insert(data).execute()
    return response.data[0]

# NEW (AsyncPG)
async def get_sources():
    db = await get_database_client()
    return await db.select("archon_sources")

async def create_source(data):
    db = await get_database_client()
    return await db.insert("archon_sources", data)
```

#### Step 3: Search Services

**Priority Order**:
1. search_service.py (full-text search)
2. embedding_service.py (vector embeddings)
3. rag_service.py (retrieval-augmented generation)

**Migration Pattern**:
```python
# Utilize new RPC functions
async def vector_search(embedding: List[float], match_count: int = 10):
    db = await get_database_client()
    results = await db.call_function(
        "match_archon_crawled_pages_multi",
        embedding,           # query_embedding
        len(embedding),      # embedding_dimension
        match_count         # match_count
    )
    return results

async def full_text_search(query: str, match_count: int = 10):
    db = await get_database_client()
    results = await db.call_function(
        "search_archon_pages_fts",
        query,              # search_query
        match_count        # match_count
    )
    return results
```

### Migration Progress Tracker

```
✅ Phase 1: Infrastructure
  ✓ AsyncPG client created
  ✓ Migration system implemented
  ✓ 10 tables created
  ✓ 2 RPC functions created
  ✓ Connection pooling configured

⏳ Phase 2: Service Migration
  ⏳ 1. credential_service.py
  ⏳ 2. source_service.py
  ⏳ 3. crawled_page_service.py
  ⏳ 4. code_example_service.py
  ⏳ 5. page_metadata_service.py
  ⏳ 6. project_service.py
  ⏳ 7. task_service.py
  ⏳ 8. document_version_service.py
  ⏳ 9. search_service.py
  ⏳ 10. embedding_service.py
  ⏳ 11. rag_service.py
  ... (17 more services)

🎯 Phase 3: Production Optimization
  ⏳ pgvector extension setup
  ⏳ Performance optimization
  ⏳ Full-text search tuning
  ⏳ Connection pooling tuning
  ⏳ Load testing
```

## Phase 3: Production Optimization

### Vector Search with pgvector

**Current State**: Stub implementation returns by recency
**Target State**: Real semantic similarity search

```sql
-- Install pgvector extension (production)
CREATE EXTENSION vector;

-- Add embedding column to archon_crawled_pages
ALTER TABLE archon_crawled_pages ADD COLUMN embedding vector(1536);

-- Create vector index (approximate nearest neighbor)
CREATE INDEX ON archon_crawled_pages USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Updated RPC function
CREATE OR REPLACE FUNCTION match_archon_crawled_pages_multi(
    query_embedding vector(1536),
    match_count INTEGER DEFAULT 10,
    filter JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
    id UUID,
    source_id UUID,
    url VARCHAR,
    title VARCHAR,
    content TEXT,
    similarity float8
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        archon_crawled_pages.id,
        archon_crawled_pages.source_id,
        archon_crawled_pages.url,
        archon_crawled_pages.title,
        archon_crawled_pages.content,
        (archon_crawled_pages.embedding <=> query_embedding) AS similarity
    FROM archon_crawled_pages
    WHERE archon_crawled_pages.metadata @> filter
    ORDER BY archon_crawled_pages.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;
```

### Performance Tuning

**Connection Pool Optimization**:
```python
# Adjust based on load testing
min_size = 10      # Increase for high concurrency
max_size = 50      # Increase for peak loads
command_timeout = 120  # Increase for long queries
```

**Query Optimization**:
```python
# Use prepared statements
async def get_user_tasks(user_id: str):
    db = await get_database_client()

    # AsyncPG automatically prepares statements
    tasks = await db.fetch(
        """
        SELECT * FROM archon_tasks
        WHERE assigned_to = $1 AND status != $2
        ORDER BY due_date ASC
        """,
        user_id,
        "closed"
    )

    return tasks
```

**Index Strategy**:
- All foreign key columns indexed
- Status columns indexed (common filters)
- Timestamp columns indexed (range queries)
- Created_at indexed (sort operations)

## Configuration

### Environment Variables

**Development** (`.env`):
```bash
# Local PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/noa_dev

# Fallback Supabase (legacy)
SUPABASE_URL=https://archon-local-dev.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...

# Service ports
ARCHON_SERVER_PORT=8181
ARCHON_MCP_PORT=8051
ARCHON_UI_PORT=3737
```

**Production** (recommended):
```bash
# Cloud PostgreSQL (AWS RDS, Azure Database, etc.)
DATABASE_URL=postgresql://user:password@host:5432/noa_prod

# Optional: Keep Supabase for certain features
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...

# Enhanced logging
LOG_LEVEL=INFO
LOGFIRE_TOKEN=...
```

## API Reference

### AsyncPG Client Usage

```python
from src.server.database import get_database_client, shutdown_database

# Get database client (async)
async def example():
    db = await get_database_client()

    # SELECT
    users = await db.select("archon_settings", where="category = 'user'")
    user = await db.fetchrow("SELECT * FROM archon_settings WHERE key = $1", "openai_key")

    # INSERT
    result = await db.insert("archon_settings", {
        "key": "new_key",
        "value": "new_value",
        "category": "config"
    })

    # UPDATE
    await db.update("archon_settings",
        {"value": "updated"},
        where_clause="key = 'new_key'"
    )

    # DELETE
    count = await db.delete("archon_settings", where_clause="key = 'new_key'")

    # TRANSACTION
    async with db.transaction():
        task = await db.insert("archon_tasks", {...})
        await db.insert("archon_project_sources", {...})

    # RPC FUNCTION CALL
    results = await db.call_function("search_archon_pages_fts", "python", 10)

    # Shutdown (application exit)
    await shutdown_database()
```

## Troubleshooting

### Connection Issues

**Problem**: `asyncpg.exceptions.CannotConnectNowError`
```python
# Solution: Ensure PostgreSQL is running
docker-compose -f docker-compose.dev.yml up postgres
```

**Problem**: `asyncpg.exceptions.UndefinedTableError: relation "archon_migrations" does not exist`
```python
# Solution: Run migrations
python -m src.server.database.initialize
```

### Migration Issues

**Problem**: `ProgrammingError: column "name" does not exist`
```python
# Cause: Trying to check migrations before first migration created table
# Solution: Already fixed in code - special case for initial schema migration
```

### Performance Issues

**Problem**: Slow queries with large datasets
```python
# Solution: Use indexes and pagination
results = await db.fetch("""
    SELECT * FROM archon_crawled_pages
    WHERE source_id = $1
    ORDER BY created_at DESC
    LIMIT 50 OFFSET $2
""", source_id, offset)
```

## Testing

### Unit Tests

```python
# tests/test_database.py
import pytest
from src.server.database import get_database_client, DatabaseConnectionPool

@pytest.fixture
async def db_client():
    await DatabaseConnectionPool.initialize()
    yield await get_database_client()
    await DatabaseConnectionPool.close()

@pytest.mark.asyncio
async def test_insert_select(db_client):
    # Insert
    result = await db_client.insert("archon_settings", {
        "key": "test_key",
        "value": "test_value"
    })
    assert result["key"] == "test_key"

    # Select
    settings = await db_client.select("archon_settings", where="key = 'test_key'")
    assert len(settings) == 1
    assert settings[0]["value"] == "test_value"
```

### Integration Tests

```bash
# Run with local PostgreSQL
docker-compose -f docker-compose.dev.yml up postgres

# Run tests
pytest tests/integration/
```

## Breaking Changes

### From Supabase SDK to AsyncPG

1. **Connection Pattern**:
   ```python
   # OLD
   supabase = await get_supabase_client()
   result = supabase.table("table").select("*").execute()

   # NEW
   db = await get_database_client()
   result = await db.select("table")
   ```

2. **Error Handling**:
   ```python
   # OLD - Supabase returns response with .data
   response = supabase.table("table").insert(data).execute()
   if response.error:
       raise Exception(response.error)

   # NEW - AsyncPG raises exceptions directly
   try:
       result = await db.insert("table", data)
   except asyncpg.UniqueViolationError:
       raise DuplicateKeyError()
   ```

3. **NULL Handling**:
   ```python
   # OLD - Supabase returns None as JSON null
   # NEW - AsyncPG returns Python None directly
   ```

## Future Enhancements

### Short Term (1-2 weeks)
- [ ] Complete credential_service migration
- [ ] Migrate 7 core data services
- [ ] Integration test suite
- [ ] Performance benchmarking

### Medium Term (1 month)
- [ ] Complete all 28 service migrations
- [ ] Production PostgreSQL deployment
- [ ] pgvector extension setup
- [ ] Load testing and optimization

### Long Term (2-3 months)
- [ ] Read replicas for scaling
- [ ] Caching layer (Redis)
- [ ] Sharding strategy for large datasets
- [ ] Disaster recovery procedures
- [ ] Full-text search with custom dictionaries

## Conclusion

The PostgreSQL migration infrastructure is now complete and ready for service migration. The AsyncPG client provides a modern, efficient async interface with connection pooling, transaction support, and RPC function capabilities.

All services can now be gradually migrated from Supabase SDK to AsyncPG without breaking existing functionality, thanks to the dual-backend support architecture.

**Next Steps**:
1. Start with credential_service.py migration
2. Follow up with core data services
3. Complete search services migration
4. Perform end-to-end testing
5. Deploy to production PostgreSQL

**Estimated Timeline**: 3-4 weeks for complete service migration with testing and optimization.

---

**Document Status**: Phase 1 Complete, Phase 2 Ready to Start
**For Questions or Updates**: See `/home/deflex/noa-server/CLAUDE.md` for project management and coordination
