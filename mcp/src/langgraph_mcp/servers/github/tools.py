"""GitHub API tools for MCP server."""

from typing import Any, Dict, List
from github import Github, GithubException
import os


class GitHubTools:
    """GitHub API operations with authentication."""

    def __init__(self, token: str | None = None):
        """Initialize GitHub tools with authentication token.

        Args:
            token: GitHub personal access token. If None, uses GITHUB_TOKEN env var.
        """
        self.token = token or os.getenv("GITHUB_TOKEN")
        if not self.token:
            raise ValueError("GitHub token must be provided or set in GITHUB_TOKEN environment variable")

        self.github = Github(self.token)
        self.user = self.github.get_user()

    def list_repositories(self, username: str | None = None, sort: str = "updated",
                          limit: int = 30) -> Dict[str, Any]:
        """List repositories for a user.

        Args:
            username: GitHub username (default: authenticated user)
            sort: Sort order (created, updated, pushed, full_name)
            limit: Maximum number of repositories to return

        Returns:
            Dictionary with list of repositories
        """
        try:
            if username:
                user = self.github.get_user(username)
            else:
                user = self.user

            repos = user.get_repos(sort=sort)
            repo_list = []

            for i, repo in enumerate(repos):
                if i >= limit:
                    break

                repo_list.append({
                    "name": repo.name,
                    "full_name": repo.full_name,
                    "description": repo.description,
                    "private": repo.private,
                    "html_url": repo.html_url,
                    "stars": repo.stargazers_count,
                    "forks": repo.forks_count,
                    "language": repo.language,
                    "created_at": repo.created_at.isoformat() if repo.created_at else None,
                    "updated_at": repo.updated_at.isoformat() if repo.updated_at else None,
                })

            return {
                "success": True,
                "username": user.login,
                "repositories": repo_list,
                "count": len(repo_list),
            }
        except GithubException as e:
            return {"error": f"GitHub API error: {e.data.get('message', str(e))}", "success": False}
        except Exception as e:
            return {"error": str(e), "success": False}

    def get_repository(self, owner: str, repo_name: str) -> Dict[str, Any]:
        """Get detailed information about a repository.

        Args:
            owner: Repository owner username
            repo_name: Repository name

        Returns:
            Dictionary with repository details
        """
        try:
            repo = self.github.get_repo(f"{owner}/{repo_name}")

            return {
                "success": True,
                "name": repo.name,
                "full_name": repo.full_name,
                "description": repo.description,
                "private": repo.private,
                "html_url": repo.html_url,
                "clone_url": repo.clone_url,
                "default_branch": repo.default_branch,
                "stars": repo.stargazers_count,
                "watchers": repo.watchers_count,
                "forks": repo.forks_count,
                "open_issues": repo.open_issues_count,
                "language": repo.language,
                "topics": repo.get_topics(),
                "created_at": repo.created_at.isoformat() if repo.created_at else None,
                "updated_at": repo.updated_at.isoformat() if repo.updated_at else None,
                "pushed_at": repo.pushed_at.isoformat() if repo.pushed_at else None,
            }
        except GithubException as e:
            return {"error": f"GitHub API error: {e.data.get('message', str(e))}", "success": False}
        except Exception as e:
            return {"error": str(e), "success": False}

    def list_issues(self, owner: str, repo_name: str, state: str = "open",
                    limit: int = 30) -> Dict[str, Any]:
        """List issues for a repository.

        Args:
            owner: Repository owner username
            repo_name: Repository name
            state: Issue state (open, closed, all)
            limit: Maximum number of issues to return

        Returns:
            Dictionary with list of issues
        """
        try:
            repo = self.github.get_repo(f"{owner}/{repo_name}")
            issues = repo.get_issues(state=state)
            issue_list = []

            for i, issue in enumerate(issues):
                if i >= limit:
                    break

                # Skip pull requests (they appear in issues API)
                if issue.pull_request:
                    continue

                issue_list.append({
                    "number": issue.number,
                    "title": issue.title,
                    "state": issue.state,
                    "body": issue.body,
                    "user": issue.user.login if issue.user else None,
                    "labels": [label.name for label in issue.labels],
                    "comments": issue.comments,
                    "html_url": issue.html_url,
                    "created_at": issue.created_at.isoformat() if issue.created_at else None,
                    "updated_at": issue.updated_at.isoformat() if issue.updated_at else None,
                })

            return {
                "success": True,
                "repository": f"{owner}/{repo_name}",
                "state": state,
                "issues": issue_list,
                "count": len(issue_list),
            }
        except GithubException as e:
            return {"error": f"GitHub API error: {e.data.get('message', str(e))}", "success": False}
        except Exception as e:
            return {"error": str(e), "success": False}

    def create_issue(self, owner: str, repo_name: str, title: str, body: str | None = None,
                     labels: List[str] | None = None) -> Dict[str, Any]:
        """Create a new issue in a repository.

        Args:
            owner: Repository owner username
            repo_name: Repository name
            title: Issue title
            body: Issue body/description
            labels: List of label names to add

        Returns:
            Dictionary with created issue details
        """
        try:
            repo = self.github.get_repo(f"{owner}/{repo_name}")

            # Create issue
            issue = repo.create_issue(
                title=title,
                body=body or "",
                labels=labels or []
            )

            return {
                "success": True,
                "number": issue.number,
                "title": issue.title,
                "state": issue.state,
                "html_url": issue.html_url,
                "created_at": issue.created_at.isoformat() if issue.created_at else None,
                "message": f"Issue #{issue.number} created successfully",
            }
        except GithubException as e:
            return {"error": f"GitHub API error: {e.data.get('message', str(e))}", "success": False}
        except Exception as e:
            return {"error": str(e), "success": False}

    def list_pull_requests(self, owner: str, repo_name: str, state: str = "open",
                           limit: int = 30) -> Dict[str, Any]:
        """List pull requests for a repository.

        Args:
            owner: Repository owner username
            repo_name: Repository name
            state: PR state (open, closed, all)
            limit: Maximum number of PRs to return

        Returns:
            Dictionary with list of pull requests
        """
        try:
            repo = self.github.get_repo(f"{owner}/{repo_name}")
            prs = repo.get_pulls(state=state)
            pr_list = []

            for i, pr in enumerate(prs):
                if i >= limit:
                    break

                pr_list.append({
                    "number": pr.number,
                    "title": pr.title,
                    "state": pr.state,
                    "body": pr.body,
                    "user": pr.user.login if pr.user else None,
                    "head": pr.head.ref,
                    "base": pr.base.ref,
                    "mergeable": pr.mergeable,
                    "merged": pr.merged,
                    "labels": [label.name for label in pr.labels],
                    "comments": pr.comments,
                    "html_url": pr.html_url,
                    "created_at": pr.created_at.isoformat() if pr.created_at else None,
                    "updated_at": pr.updated_at.isoformat() if pr.updated_at else None,
                })

            return {
                "success": True,
                "repository": f"{owner}/{repo_name}",
                "state": state,
                "pull_requests": pr_list,
                "count": len(pr_list),
            }
        except GithubException as e:
            return {"error": f"GitHub API error: {e.data.get('message', str(e))}", "success": False}
        except Exception as e:
            return {"error": str(e), "success": False}

    def get_file_content(self, owner: str, repo_name: str, file_path: str,
                         branch: str | None = None) -> Dict[str, Any]:
        """Get the contents of a file from a repository.

        Args:
            owner: Repository owner username
            repo_name: Repository name
            file_path: Path to the file in the repository
            branch: Branch name (default: default branch)

        Returns:
            Dictionary with file content and metadata
        """
        try:
            repo = self.github.get_repo(f"{owner}/{repo_name}")

            # Get file content
            if branch:
                file_content = repo.get_contents(file_path, ref=branch)
            else:
                file_content = repo.get_contents(file_path)

            # Handle if it's a directory
            if isinstance(file_content, list):
                return {
                    "error": f"'{file_path}' is a directory, not a file",
                    "success": False
                }

            return {
                "success": True,
                "path": file_content.path,
                "name": file_content.name,
                "content": file_content.decoded_content.decode("utf-8"),
                "size": file_content.size,
                "sha": file_content.sha,
                "encoding": file_content.encoding,
                "html_url": file_content.html_url,
            }
        except GithubException as e:
            return {"error": f"GitHub API error: {e.data.get('message', str(e))}", "success": False}
        except Exception as e:
            return {"error": str(e), "success": False}

    def __del__(self):
        """Cleanup resources."""
        if hasattr(self, 'github'):
            # PyGithub doesn't require explicit cleanup
            pass
