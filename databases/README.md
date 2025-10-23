Database relocation directory

Purpose:

- Centralize all database files used across the workspace under `noa-server/databases/` to keep the server self-contained and simplify backups.
- Preserve original paths by creating symlinks back to the original locations.

How to use:

- Dry run: ./noa-server/tools/relocate_databases.sh
- Apply: ./noa-server/tools/relocate_databases.sh --apply

Outputs:

- INVENTORY.md: Mapping table of original → relocated path, with sizes and SHA-256 hashes.

Caveats:

- Script excludes common vendor/cache directories and existing `noa-server/databases`.
- If a file is already a symlink, it is skipped.
