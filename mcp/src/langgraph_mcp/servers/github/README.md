# GitHub MCP Server

GitHub API operations exposed through the Model Context Protocol (MCP).

## Features

- **Repository Management**: List and inspect repositories
- **Issue Tracking**: List and create issues
- **Pull Request Monitoring**: Track PR status and details
- **File Access**: Read file contents from repositories
- **Authenticated Access**: Uses GitHub personal access token

## Tools

### `list_repositories`

List repositories for a GitHub user.

**Parameters:**

- `username` (string, optional): GitHub username (default: authenticated user)
- `sort` (string, optional): Sort order (created, updated, pushed, full_name)
- `limit` (integer, optional): Maximum number of repositories (default: 30)

**Example:**

```json
{
  "username": "octocat",
  "sort": "updated",
  "limit": 10
}
```

### `get_repository`

Get detailed information about a repository.

**Parameters:**

- `owner` (string, required): Repository owner
- `repo_name` (string, required): Repository name

**Example:**

```json
{
  "owner": "octocat",
  "repo_name": "Hello-World"
}
```

### `list_issues`

List issues for a repository.

**Parameters:**

- `owner` (string, required): Repository owner
- `repo_name` (string, required): Repository name
- `state` (string, optional): Issue state (open, closed, all)
- `limit` (integer, optional): Maximum number of issues (default: 30)

**Example:**

```json
{
  "owner": "octocat",
  "repo_name": "Hello-World",
  "state": "open",
  "limit": 20
}
```

### `create_issue`

Create a new issue in a repository.

**Parameters:**

- `owner` (string, required): Repository owner
- `repo_name` (string, required): Repository name
- `title` (string, required): Issue title
- `body` (string, optional): Issue description
- `labels` (array, optional): Issue labels

**Example:**

```json
{
  "owner": "octocat",
  "repo_name": "Hello-World",
  "title": "Bug: Application crashes on startup",
  "body": "When launching the application...",
  "labels": ["bug", "critical"]
}
```

### `list_pull_requests`

List pull requests for a repository.

**Parameters:**

- `owner` (string, required): Repository owner
- `repo_name` (string, required): Repository name
- `state` (string, optional): PR state (open, closed, all)
- `limit` (integer, optional): Maximum number of PRs (default: 30)

**Example:**

```json
{
  "owner": "octocat",
  "repo_name": "Hello-World",
  "state": "open"
}
```

### `get_file_content`

Get the contents of a file from a repository.

**Parameters:**

- `owner` (string, required): Repository owner
- `repo_name` (string, required): Repository name
- `file_path` (string, required): Path to file
- `branch` (string, optional): Branch name (default: default branch)

**Example:**

```json
{
  "owner": "octocat",
  "repo_name": "Hello-World",
  "file_path": "README.md",
  "branch": "main"
}
```

## Configuration

Set your GitHub personal access token using the `GITHUB_TOKEN` environment
variable:

```bash
export GITHUB_TOKEN=ghp_your_token_here
```

### Creating a Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Click "Generate new token"
3. Select scopes:
   - `repo` - Full control of private repositories
   - `read:org` - Read org and team membership
   - `user` - Read user profile data
4. Generate and save the token securely

## Security

- Uses authenticated GitHub API requests
- Token is required for all operations
- Respects GitHub API rate limits
- No credential storage (uses env var)
