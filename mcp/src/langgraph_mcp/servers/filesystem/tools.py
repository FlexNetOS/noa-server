"""Filesystem tools for MCP server."""

import os
import pathlib
import shutil
from typing import Any, Dict
import fnmatch


class FilesystemTools:
    """Secure filesystem operations with sandboxing."""

    def __init__(self, base_path: str | None = None):
        """Initialize filesystem tools with optional sandbox base path.

        Args:
            base_path: Base directory for sandboxing. If None, uses current directory.
        """
        self.base_path = pathlib.Path(base_path or os.getcwd()).resolve()

    def _validate_path(self, path: str) -> pathlib.Path:
        """Validate and resolve a path within the sandbox.

        Args:
            path: Path to validate

        Returns:
            Resolved absolute path

        Raises:
            ValueError: If path is outside sandbox
        """
        target = (self.base_path / path).resolve()

        # Ensure path is within sandbox
        try:
            target.relative_to(self.base_path)
        except ValueError:
            raise ValueError(f"Path '{path}' is outside allowed directory")

        return target

    def read_file(self, path: str, encoding: str = "utf-8") -> Dict[str, Any]:
        """Read file contents.

        Args:
            path: Relative path to file
            encoding: File encoding (default: utf-8)

        Returns:
            Dictionary with content and metadata
        """
        target = self._validate_path(path)

        if not target.exists():
            return {"error": f"File not found: {path}", "success": False}

        if not target.is_file():
            return {"error": f"Path is not a file: {path}", "success": False}

        try:
            content = target.read_text(encoding=encoding)
            stats = target.stat()

            return {
                "success": True,
                "path": str(target.relative_to(self.base_path)),
                "content": content,
                "size": stats.st_size,
                "modified": stats.st_mtime,
            }
        except Exception as e:
            return {"error": str(e), "success": False}

    def write_file(self, path: str, content: str, encoding: str = "utf-8",
                   create_dirs: bool = True) -> Dict[str, Any]:
        """Write content to file.

        Args:
            path: Relative path to file
            content: Content to write
            encoding: File encoding (default: utf-8)
            create_dirs: Create parent directories if they don't exist

        Returns:
            Dictionary with operation result
        """
        target = self._validate_path(path)

        try:
            if create_dirs:
                target.parent.mkdir(parents=True, exist_ok=True)

            target.write_text(content, encoding=encoding)
            stats = target.stat()

            return {
                "success": True,
                "path": str(target.relative_to(self.base_path)),
                "size": stats.st_size,
                "message": f"File written successfully: {path}",
            }
        except Exception as e:
            return {"error": str(e), "success": False}

    def list_directory(self, path: str = ".", pattern: str | None = None) -> Dict[str, Any]:
        """List directory contents.

        Args:
            path: Relative path to directory (default: current)
            pattern: Optional glob pattern to filter results

        Returns:
            Dictionary with list of entries
        """
        target = self._validate_path(path)

        if not target.exists():
            return {"error": f"Directory not found: {path}", "success": False}

        if not target.is_dir():
            return {"error": f"Path is not a directory: {path}", "success": False}

        try:
            entries = []
            for item in target.iterdir():
                if pattern and not fnmatch.fnmatch(item.name, pattern):
                    continue

                stats = item.stat()
                entries.append({
                    "name": item.name,
                    "path": str(item.relative_to(self.base_path)),
                    "type": "directory" if item.is_dir() else "file",
                    "size": stats.st_size if item.is_file() else None,
                    "modified": stats.st_mtime,
                })

            return {
                "success": True,
                "path": str(target.relative_to(self.base_path)),
                "entries": sorted(entries, key=lambda x: (x["type"] != "directory", x["name"])),
                "count": len(entries),
            }
        except Exception as e:
            return {"error": str(e), "success": False}

    def create_directory(self, path: str, parents: bool = True) -> Dict[str, Any]:
        """Create a directory.

        Args:
            path: Relative path to directory
            parents: Create parent directories if they don't exist

        Returns:
            Dictionary with operation result
        """
        target = self._validate_path(path)

        try:
            if target.exists():
                if target.is_dir():
                    return {
                        "success": True,
                        "path": str(target.relative_to(self.base_path)),
                        "message": "Directory already exists",
                        "created": False,
                    }
                else:
                    return {"error": f"Path exists but is not a directory: {path}", "success": False}

            target.mkdir(parents=parents, exist_ok=True)

            return {
                "success": True,
                "path": str(target.relative_to(self.base_path)),
                "message": f"Directory created successfully: {path}",
                "created": True,
            }
        except Exception as e:
            return {"error": str(e), "success": False}

    def delete_file(self, path: str, recursive: bool = False) -> Dict[str, Any]:
        """Delete a file or directory.

        Args:
            path: Relative path to file/directory
            recursive: If True, delete directories recursively

        Returns:
            Dictionary with operation result
        """
        target = self._validate_path(path)

        if not target.exists():
            return {"error": f"Path not found: {path}", "success": False}

        try:
            if target.is_dir():
                if not recursive:
                    return {
                        "error": "Path is a directory. Use recursive=True to delete directories",
                        "success": False
                    }
                shutil.rmtree(target)
                item_type = "directory"
            else:
                target.unlink()
                item_type = "file"

            return {
                "success": True,
                "path": str(path),
                "message": f"{item_type.capitalize()} deleted successfully",
                "type": item_type,
            }
        except Exception as e:
            return {"error": str(e), "success": False}

    def search_files(self, pattern: str, path: str = ".", recursive: bool = True) -> Dict[str, Any]:
        """Search for files matching a glob pattern.

        Args:
            pattern: Glob pattern to match (e.g., "*.py", "**/*.txt")
            path: Starting directory for search (default: current)
            recursive: Search recursively in subdirectories

        Returns:
            Dictionary with list of matching files
        """
        target = self._validate_path(path)

        if not target.exists():
            return {"error": f"Directory not found: {path}", "success": False}

        if not target.is_dir():
            return {"error": f"Path is not a directory: {path}", "success": False}

        try:
            matches = []
            search_pattern = f"**/{pattern}" if recursive else pattern

            for match in target.glob(search_pattern):
                if match.is_file():
                    stats = match.stat()
                    matches.append({
                        "name": match.name,
                        "path": str(match.relative_to(self.base_path)),
                        "size": stats.st_size,
                        "modified": stats.st_mtime,
                    })

            return {
                "success": True,
                "pattern": pattern,
                "search_path": str(target.relative_to(self.base_path)),
                "recursive": recursive,
                "matches": sorted(matches, key=lambda x: x["path"]),
                "count": len(matches),
            }
        except Exception as e:
            return {"error": str(e), "success": False}
