# Unused Variable Cleanup Script

This directory contains an intelligent script for cleaning up unused variables in TypeScript files.

## Scripts

### `cleanup-unused.ts`

Intelligent TypeScript-aware cleanup script that handles:
- **Unused imports**: Removes completely
- **Destructured props**: Prefixes with underscore
- **Function parameters**: Prefixes with underscore
- **Event handlers**: Prefixes with underscore
- **Type imports**: Removes from import list

## Usage

```bash
# Dry-run mode (default) - shows what would change
pnpm cleanup:unused

# Live mode - actually applies changes
pnpm cleanup:unused:live

# Quiet mode - minimal output
pnpm cleanup:unused:quiet
```

## How It Works

1. **Parsing**: Runs `pnpm typecheck` and parses TS6133/TS6196 errors
2. **Classification**: Determines if variable is import, parameter, prop, etc.
3. **Smart Fixing**:
   - Imports → Remove from import statement or entire line
   - Parameters → Prefix with `_` (required for function signature)
   - Props → Prefix with `_` (required for destructuring)
   - Variables → Prefix with `_` (safer than removal)
4. **Verification**: Counts errors before/after to ensure improvement
5. **Backup**: Creates backups in `.cleanup-backups/` before changes

## Example Output

```
🔍 Starting Unused Variable Cleanup
Mode: DRY RUN
Project: /home/deflex/noa-server/packages/ui

📊 Initial TypeScript errors: 31

🔎 Parsing unused variable errors...
Found 28 unused variable errors

📁 Files to process: 21

📄 Processing: src/components/chat/MarkdownContent.tsx
   Errors: 1

  Processing: MarkdownContent.tsx:13
    Variable: CodeBlock
    Action: remove-import
    Before: import CodeBlock from './CodeBlock';
    After:
   ✅ Fixed: 1 changes

...

============================================================
📋 CLEANUP SUMMARY REPORT
============================================================
Mode:                LIVE
Total Errors Found:  28
Files Processed:     21
Files Fixed:         18
Changes Made:        24
Errors Before:       31
Errors After:        16
Errors Reduced:      15
============================================================
```

## Remaining Manual Fixes

TypeScript doesn't recognize underscore-prefixed variables as "intentionally unused", so these require manual fixes:

### 1. Remove Truly Unused Props

```typescript
// Before
export function Component({ _prop, usedProp }: Props) {

// After - completely remove unused prop
export function Component({ usedProp }: Props) {
```

### 2. Fix Type Imports

```typescript
// Before
import type { UsedType, _UnusedType } from './types';

// After
import type { UsedType } from './types';
```

### 3. Use `@ts-expect-error` for Required Parameters

```typescript
// When parameter is required by interface but not used
function handler(
  // @ts-expect-error - required by interface but not used
  _event: Event,
  data: Data
) {
  console.log(data);
}
```

## Safety Features

- **Dry-run default**: Always test before applying
- **File backups**: All modified files backed up to `.cleanup-backups/`
- **Error counting**: Verifies changes reduce errors
- **File-by-file**: Processes one file at a time for easier debugging
- **No batch operations**: Avoids sed/awk that can break code

## Limitations

1. **TypeScript noUnusedParameters**: Doesn't ignore underscore-prefixed variables
2. **Complex destructuring**: May not handle all edge cases
3. **Inline type imports**: Partial support for `import { type X }` syntax

## Recovery

If something goes wrong:

```bash
# Restore from backups
cp -r .cleanup-backups/src/* src/

# Or restore specific file
cp .cleanup-backups/src/path/to/file.tsx src/path/to/file.tsx
```

## Integration with CI

Add to your package.json:

```json
{
  "scripts": {
    "precommit": "pnpm cleanup:unused:live && pnpm typecheck"
  }
}
```

## Contributing

To improve the script:

1. Add new patterns to `isFunctionParameter()` or `isDestructuredProp()`
2. Enhance import removal logic in `fixUnusedImport()`
3. Add support for new TypeScript error codes
4. Improve type import handling

## License

Part of the NOA Server UI package.
