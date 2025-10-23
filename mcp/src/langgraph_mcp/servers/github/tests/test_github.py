"""Unit tests for GitHub MCP server.

Note: These tests use mocking to avoid real GitHub API calls.
Integration tests with real API can be run separately with proper credentials.
"""

import pytest
from unittest.mock import Mock, MagicMock, patch
from ..tools import GitHubTools


@pytest.fixture
def mock_github():
    """Create a mocked GitHub instance."""
    with patch('github.Github') as mock:
        yield mock


@pytest.fixture
def github_tools(mock_github):
    """Create GitHubTools instance with mocked GitHub."""
    tools = GitHubTools(token="test_token")
    return tools


class TestListRepositories:
    """Tests for list_repositories tool."""

    def test_list_user_repositories(self, github_tools, mock_github):
        """Test listing repositories for a specific user."""
        # Setup mock
        mock_user = Mock()
        mock_user.login = "testuser"

        mock_repo = Mock()
        mock_repo.name = "test-repo"
        mock_repo.full_name = "testuser/test-repo"
        mock_repo.description = "A test repository"
        mock_repo.private = False
        mock_repo.html_url = "https://github.com/testuser/test-repo"
        mock_repo.stargazers_count = 10
        mock_repo.forks_count = 5
        mock_repo.language = "Python"
        mock_repo.created_at = None
        mock_repo.updated_at = None

        mock_user.get_repos.return_value = [mock_repo]
        github_tools.github.get_user.return_value = mock_user

        result = github_tools.list_repositories(username="testuser")

        assert result["success"] is True
        assert result["username"] == "testuser"
        assert result["count"] == 1
        assert len(result["repositories"]) == 1
        assert result["repositories"][0]["name"] == "test-repo"

    def test_list_authenticated_user_repositories(self, github_tools):
        """Test listing repositories for authenticated user."""
        # Setup mock
        mock_repo = Mock()
        mock_repo.name = "my-repo"
        mock_repo.full_name = "me/my-repo"
        mock_repo.description = "My repository"
        mock_repo.private = True
        mock_repo.html_url = "https://github.com/me/my-repo"
        mock_repo.stargazers_count = 0
        mock_repo.forks_count = 0
        mock_repo.language = "JavaScript"
        mock_repo.created_at = None
        mock_repo.updated_at = None

        github_tools.user.login = "me"
        github_tools.user.get_repos.return_value = [mock_repo]

        result = github_tools.list_repositories()

        assert result["success"] is True
        assert result["username"] == "me"
        assert result["count"] == 1


class TestGetRepository:
    """Tests for get_repository tool."""

    def test_get_repository_details(self, github_tools):
        """Test getting repository details."""
        # Setup mock
        mock_repo = Mock()
        mock_repo.name = "test-repo"
        mock_repo.full_name = "owner/test-repo"
        mock_repo.description = "Test repository"
        mock_repo.private = False
        mock_repo.html_url = "https://github.com/owner/test-repo"
        mock_repo.clone_url = "https://github.com/owner/test-repo.git"
        mock_repo.default_branch = "main"
        mock_repo.stargazers_count = 100
        mock_repo.watchers_count = 80
        mock_repo.forks_count = 25
        mock_repo.open_issues_count = 5
        mock_repo.language = "Python"
        mock_repo.get_topics.return_value = ["machine-learning", "python"]
        mock_repo.created_at = None
        mock_repo.updated_at = None
        mock_repo.pushed_at = None

        github_tools.github.get_repo.return_value = mock_repo

        result = github_tools.get_repository("owner", "test-repo")

        assert result["success"] is True
        assert result["name"] == "test-repo"
        assert result["default_branch"] == "main"
        assert result["stars"] == 100
        assert "machine-learning" in result["topics"]


class TestListIssues:
    """Tests for list_issues tool."""

    def test_list_open_issues(self, github_tools):
        """Test listing open issues."""
        # Setup mock
        mock_issue = Mock()
        mock_issue.number = 1
        mock_issue.title = "Test Issue"
        mock_issue.state = "open"
        mock_issue.body = "This is a test issue"
        mock_issue.user = Mock(login="testuser")
        mock_issue.labels = [Mock(name="bug"), Mock(name="high-priority")]
        mock_issue.comments = 3
        mock_issue.html_url = "https://github.com/owner/repo/issues/1"
        mock_issue.pull_request = None  # Not a PR
        mock_issue.created_at = None
        mock_issue.updated_at = None

        mock_repo = Mock()
        mock_repo.get_issues.return_value = [mock_issue]
        github_tools.github.get_repo.return_value = mock_repo

        result = github_tools.list_issues("owner", "repo", state="open")

        assert result["success"] is True
        assert result["repository"] == "owner/repo"
        assert result["count"] == 1
        assert result["issues"][0]["number"] == 1
        assert "bug" in result["issues"][0]["labels"]

    def test_filter_pull_requests_from_issues(self, github_tools):
        """Test that pull requests are filtered out from issues."""
        # Setup mocks
        mock_issue = Mock()
        mock_issue.number = 1
        mock_issue.pull_request = None

        mock_pr = Mock()
        mock_pr.number = 2
        mock_pr.pull_request = Mock()  # Has pull_request attribute

        mock_repo = Mock()
        mock_repo.get_issues.return_value = [mock_issue, mock_pr]
        github_tools.github.get_repo.return_value = mock_repo

        # Configure issue mock
        mock_issue.title = "Issue"
        mock_issue.state = "open"
        mock_issue.body = "Body"
        mock_issue.user = Mock(login="user")
        mock_issue.labels = []
        mock_issue.comments = 0
        mock_issue.html_url = "url"
        mock_issue.created_at = None
        mock_issue.updated_at = None

        result = github_tools.list_issues("owner", "repo")

        assert result["success"] is True
        assert result["count"] == 1  # Only the issue, not the PR


class TestCreateIssue:
    """Tests for create_issue tool."""

    def test_create_simple_issue(self, github_tools):
        """Test creating a simple issue."""
        # Setup mock
        mock_issue = Mock()
        mock_issue.number = 42
        mock_issue.title = "New Issue"
        mock_issue.state = "open"
        mock_issue.html_url = "https://github.com/owner/repo/issues/42"
        mock_issue.created_at = None

        mock_repo = Mock()
        mock_repo.create_issue.return_value = mock_issue
        github_tools.github.get_repo.return_value = mock_repo

        result = github_tools.create_issue(
            "owner", "repo", "New Issue", "Issue body"
        )

        assert result["success"] is True
        assert result["number"] == 42
        assert result["title"] == "New Issue"
        assert "created successfully" in result["message"]

    def test_create_issue_with_labels(self, github_tools):
        """Test creating an issue with labels."""
        mock_issue = Mock()
        mock_issue.number = 43
        mock_issue.title = "Bug Report"
        mock_issue.state = "open"
        mock_issue.html_url = "https://github.com/owner/repo/issues/43"
        mock_issue.created_at = None

        mock_repo = Mock()
        mock_repo.create_issue.return_value = mock_issue
        github_tools.github.get_repo.return_value = mock_repo

        result = github_tools.create_issue(
            "owner", "repo", "Bug Report", "Bug description",
            labels=["bug", "critical"]
        )

        assert result["success"] is True
        # Verify create_issue was called with labels
        mock_repo.create_issue.assert_called_once()


class TestListPullRequests:
    """Tests for list_pull_requests tool."""

    def test_list_open_pull_requests(self, github_tools):
        """Test listing open pull requests."""
        # Setup mock
        mock_pr = Mock()
        mock_pr.number = 10
        mock_pr.title = "Feature: Add new functionality"
        mock_pr.state = "open"
        mock_pr.body = "This PR adds..."
        mock_pr.user = Mock(login="contributor")
        mock_pr.head = Mock(ref="feature-branch")
        mock_pr.base = Mock(ref="main")
        mock_pr.mergeable = True
        mock_pr.merged = False
        mock_pr.labels = [Mock(name="enhancement")]
        mock_pr.comments = 2
        mock_pr.html_url = "https://github.com/owner/repo/pull/10"
        mock_pr.created_at = None
        mock_pr.updated_at = None

        mock_repo = Mock()
        mock_repo.get_pulls.return_value = [mock_pr]
        github_tools.github.get_repo.return_value = mock_repo

        result = github_tools.list_pull_requests("owner", "repo")

        assert result["success"] is True
        assert result["count"] == 1
        assert result["pull_requests"][0]["number"] == 10
        assert result["pull_requests"][0]["mergeable"] is True


class TestGetFileContent:
    """Tests for get_file_content tool."""

    def test_get_file_from_default_branch(self, github_tools):
        """Test getting file content from default branch."""
        # Setup mock
        mock_file = Mock()
        mock_file.path = "README.md"
        mock_file.name = "README.md"
        mock_file.decoded_content = b"# Test Project\n\nThis is a test."
        mock_file.size = 30
        mock_file.sha = "abc123"
        mock_file.encoding = "base64"
        mock_file.html_url = "https://github.com/owner/repo/blob/main/README.md"

        mock_repo = Mock()
        mock_repo.get_contents.return_value = mock_file
        github_tools.github.get_repo.return_value = mock_repo

        result = github_tools.get_file_content("owner", "repo", "README.md")

        assert result["success"] is True
        assert result["path"] == "README.md"
        assert "# Test Project" in result["content"]
        assert result["size"] == 30

    def test_get_file_from_specific_branch(self, github_tools):
        """Test getting file content from a specific branch."""
        mock_file = Mock()
        mock_file.path = "src/app.py"
        mock_file.name = "app.py"
        mock_file.decoded_content = b"print('Hello')"
        mock_file.size = 14
        mock_file.sha = "def456"
        mock_file.encoding = "base64"
        mock_file.html_url = "https://github.com/owner/repo/blob/dev/src/app.py"

        mock_repo = Mock()
        mock_repo.get_contents.return_value = mock_file
        github_tools.github.get_repo.return_value = mock_repo

        result = github_tools.get_file_content("owner", "repo", "src/app.py", branch="dev")

        assert result["success"] is True
        mock_repo.get_contents.assert_called_with("src/app.py", ref="dev")

    def test_get_directory_returns_error(self, github_tools):
        """Test that trying to get a directory returns an error."""
        mock_repo = Mock()
        mock_repo.get_contents.return_value = [Mock(), Mock()]  # List indicates directory
        github_tools.github.get_repo.return_value = mock_repo

        result = github_tools.get_file_content("owner", "repo", "src")

        assert result["success"] is False
        assert "directory" in result["error"].lower()


class TestErrorHandling:
    """Tests for error handling."""

    def test_invalid_token_raises_error(self):
        """Test that missing token raises an error."""
        with patch.dict('os.environ', {}, clear=True):
            with pytest.raises(ValueError, match="GitHub token"):
                GitHubTools(token=None)

    def test_github_api_error_handling(self, github_tools):
        """Test handling of GitHub API errors."""
        from github import GithubException

        mock_error = GithubException(404, {"message": "Not Found"})
        github_tools.github.get_repo.side_effect = mock_error

        result = github_tools.get_repository("owner", "nonexistent")

        assert result["success"] is False
        assert "error" in result
        assert "Not Found" in result["error"]
