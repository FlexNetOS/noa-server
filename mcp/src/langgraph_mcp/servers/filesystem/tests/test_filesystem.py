"""Unit tests for Filesystem MCP server."""

import pytest
import tempfile
import pathlib
from ..tools import FilesystemTools


@pytest.fixture
def temp_dir():
    """Create a temporary directory for testing."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield pathlib.Path(tmpdir)


@pytest.fixture
def fs_tools(temp_dir):
    """Create FilesystemTools instance with temp directory."""
    return FilesystemTools(str(temp_dir))


class TestReadFile:
    """Tests for read_file tool."""

    def test_read_existing_file(self, fs_tools, temp_dir):
        """Test reading an existing file."""
        test_file = temp_dir / "test.txt"
        test_content = "Hello, World!"
        test_file.write_text(test_content)

        result = fs_tools.read_file("test.txt")

        assert result["success"] is True
        assert result["content"] == test_content
        assert result["path"] == "test.txt"
        assert "size" in result
        assert "modified" in result

    def test_read_nonexistent_file(self, fs_tools):
        """Test reading a non-existent file."""
        result = fs_tools.read_file("nonexistent.txt")

        assert result["success"] is False
        assert "error" in result
        assert "not found" in result["error"].lower()

    def test_read_directory_as_file(self, fs_tools, temp_dir):
        """Test trying to read a directory as a file."""
        subdir = temp_dir / "subdir"
        subdir.mkdir()

        result = fs_tools.read_file("subdir")

        assert result["success"] is False
        assert "error" in result

    def test_path_traversal_prevention(self, fs_tools):
        """Test that path traversal is prevented."""
        with pytest.raises(ValueError, match="outside allowed directory"):
            fs_tools.read_file("../../../etc/passwd")


class TestWriteFile:
    """Tests for write_file tool."""

    def test_write_new_file(self, fs_tools, temp_dir):
        """Test writing a new file."""
        content = "Test content"
        result = fs_tools.write_file("new_file.txt", content)

        assert result["success"] is True
        assert result["path"] == "new_file.txt"

        # Verify file was created
        written_file = temp_dir / "new_file.txt"
        assert written_file.exists()
        assert written_file.read_text() == content

    def test_write_with_directory_creation(self, fs_tools, temp_dir):
        """Test writing a file with automatic directory creation."""
        result = fs_tools.write_file("nested/dir/file.txt", "content", create_dirs=True)

        assert result["success"] is True

        # Verify file and directories were created
        written_file = temp_dir / "nested" / "dir" / "file.txt"
        assert written_file.exists()

    def test_overwrite_existing_file(self, fs_tools, temp_dir):
        """Test overwriting an existing file."""
        test_file = temp_dir / "test.txt"
        test_file.write_text("original")

        result = fs_tools.write_file("test.txt", "updated")

        assert result["success"] is True
        assert test_file.read_text() == "updated"


class TestListDirectory:
    """Tests for list_directory tool."""

    def test_list_empty_directory(self, fs_tools):
        """Test listing an empty directory."""
        result = fs_tools.list_directory(".")

        assert result["success"] is True
        assert result["entries"] == []
        assert result["count"] == 0

    def test_list_directory_with_files(self, fs_tools, temp_dir):
        """Test listing a directory with files and subdirectories."""
        # Create test structure
        (temp_dir / "file1.txt").write_text("content1")
        (temp_dir / "file2.py").write_text("content2")
        (temp_dir / "subdir").mkdir()

        result = fs_tools.list_directory(".")

        assert result["success"] is True
        assert result["count"] == 3

        # Directories should come first
        assert result["entries"][0]["type"] == "directory"
        assert result["entries"][0]["name"] == "subdir"

        # Then files alphabetically
        file_entries = [e for e in result["entries"] if e["type"] == "file"]
        assert len(file_entries) == 2

    def test_list_directory_with_pattern(self, fs_tools, temp_dir):
        """Test listing directory with pattern filter."""
        (temp_dir / "file1.txt").write_text("content1")
        (temp_dir / "file2.py").write_text("content2")
        (temp_dir / "file3.txt").write_text("content3")

        result = fs_tools.list_directory(".", pattern="*.txt")

        assert result["success"] is True
        assert result["count"] == 2
        assert all(e["name"].endswith(".txt") for e in result["entries"])

    def test_list_nonexistent_directory(self, fs_tools):
        """Test listing a non-existent directory."""
        result = fs_tools.list_directory("nonexistent")

        assert result["success"] is False
        assert "error" in result


class TestCreateDirectory:
    """Tests for create_directory tool."""

    def test_create_simple_directory(self, fs_tools, temp_dir):
        """Test creating a simple directory."""
        result = fs_tools.create_directory("new_dir")

        assert result["success"] is True
        assert result["created"] is True
        assert (temp_dir / "new_dir").is_dir()

    def test_create_nested_directories(self, fs_tools, temp_dir):
        """Test creating nested directories."""
        result = fs_tools.create_directory("a/b/c", parents=True)

        assert result["success"] is True
        assert result["created"] is True
        assert (temp_dir / "a" / "b" / "c").is_dir()

    def test_create_existing_directory(self, fs_tools, temp_dir):
        """Test creating a directory that already exists."""
        (temp_dir / "existing").mkdir()

        result = fs_tools.create_directory("existing")

        assert result["success"] is True
        assert result["created"] is False
        assert "already exists" in result["message"].lower()

    def test_create_directory_over_file(self, fs_tools, temp_dir):
        """Test creating a directory where a file exists."""
        (temp_dir / "file.txt").write_text("content")

        result = fs_tools.create_directory("file.txt")

        assert result["success"] is False
        assert "error" in result


class TestDeleteFile:
    """Tests for delete_file tool."""

    def test_delete_file(self, fs_tools, temp_dir):
        """Test deleting a file."""
        test_file = temp_dir / "test.txt"
        test_file.write_text("content")

        result = fs_tools.delete_file("test.txt")

        assert result["success"] is True
        assert result["type"] == "file"
        assert not test_file.exists()

    def test_delete_empty_directory_recursive(self, fs_tools, temp_dir):
        """Test deleting an empty directory."""
        test_dir = temp_dir / "test_dir"
        test_dir.mkdir()

        result = fs_tools.delete_file("test_dir", recursive=True)

        assert result["success"] is True
        assert result["type"] == "directory"
        assert not test_dir.exists()

    def test_delete_directory_without_recursive_flag(self, fs_tools, temp_dir):
        """Test that deleting a directory without recursive flag fails."""
        test_dir = temp_dir / "test_dir"
        test_dir.mkdir()

        result = fs_tools.delete_file("test_dir", recursive=False)

        assert result["success"] is False
        assert "recursive" in result["error"].lower()
        assert test_dir.exists()

    def test_delete_nonexistent_file(self, fs_tools):
        """Test deleting a non-existent file."""
        result = fs_tools.delete_file("nonexistent.txt")

        assert result["success"] is False
        assert "error" in result


class TestSearchFiles:
    """Tests for search_files tool."""

    def test_search_simple_pattern(self, fs_tools, temp_dir):
        """Test searching with a simple pattern."""
        (temp_dir / "file1.txt").write_text("content")
        (temp_dir / "file2.py").write_text("content")
        (temp_dir / "file3.txt").write_text("content")

        result = fs_tools.search_files("*.txt", ".")

        assert result["success"] is True
        assert result["count"] == 2
        assert all(m["name"].endswith(".txt") for m in result["matches"])

    def test_search_recursive(self, fs_tools, temp_dir):
        """Test recursive search."""
        (temp_dir / "file1.txt").write_text("content")
        (temp_dir / "subdir").mkdir()
        (temp_dir / "subdir" / "file2.txt").write_text("content")
        (temp_dir / "subdir" / "deep").mkdir()
        (temp_dir / "subdir" / "deep" / "file3.txt").write_text("content")

        result = fs_tools.search_files("*.txt", ".", recursive=True)

        assert result["success"] is True
        assert result["count"] == 3
        assert result["recursive"] is True

    def test_search_non_recursive(self, fs_tools, temp_dir):
        """Test non-recursive search."""
        (temp_dir / "file1.txt").write_text("content")
        (temp_dir / "subdir").mkdir()
        (temp_dir / "subdir" / "file2.txt").write_text("content")

        result = fs_tools.search_files("*.txt", ".", recursive=False)

        assert result["success"] is True
        assert result["count"] == 1
        assert result["recursive"] is False

    def test_search_no_matches(self, fs_tools, temp_dir):
        """Test search with no matches."""
        (temp_dir / "file1.txt").write_text("content")

        result = fs_tools.search_files("*.py", ".")

        assert result["success"] is True
        assert result["count"] == 0
        assert result["matches"] == []

    def test_search_nonexistent_directory(self, fs_tools):
        """Test searching in a non-existent directory."""
        result = fs_tools.search_files("*.txt", "nonexistent")

        assert result["success"] is False
        assert "error" in result
