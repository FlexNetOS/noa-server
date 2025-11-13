#!/bin/bash
# Generate documentation dependency graph
# Output: docs/DEPENDENCY_GRAPH.md with Mermaid diagram

set -euo pipefail

PROJECT_ROOT="/home/deflex/noa-server"
CATALOG_FILE="${PROJECT_ROOT}/docs/.catalog.json"
OUTPUT_FILE="${PROJECT_ROOT}/docs/DEPENDENCY_GRAPH.md"

echo "📊 Generating documentation dependency graph..."
echo ""

# Check if catalog exists
if [[ ! -f "${CATALOG_FILE}" ]]; then
    echo "❌ Error: Documentation catalog not found"
    exit 1
fi

# Initialize output file
cat > "${OUTPUT_FILE}" <<'EOF'
# Documentation Dependency Graph

Generated: DATE

This graph shows relationships between documentation files based on internal links.

## Graph Legend

- **Nodes**: Documentation files
- **Edges**: Links between files
- **Colors**:
  - 🔵 Blue: API Documentation
  - 🟢 Green: Architecture Documentation
  - 🟡 Yellow: Package Documentation
  - 🟠 Orange: Operations/Runbooks
  - 🔴 Red: Other Documentation

## Interactive Graph

```mermaid
graph TD
GRAPH_CONTENT
```

## Statistics

- Total nodes: TOTAL_NODES
- Total edges: TOTAL_EDGES
- Orphaned docs (no links): ORPHANED
- Most referenced doc: MOST_REFERENCED
- Most linking doc: MOST_LINKING

## Orphaned Documentation

Files with no incoming or outgoing links:

ORPHANED_LIST

## Hub Documentation

Files with the most connections:

HUB_LIST

EOF

# Extract dependency data
TEMP_DIR="/tmp/dep-graph-$$"
mkdir -p "${TEMP_DIR}"

NODES_FILE="${TEMP_DIR}/nodes.txt"
EDGES_FILE="${TEMP_DIR}/edges.txt"
STATS_FILE="${TEMP_DIR}/stats.txt"

echo "🔍 Analyzing dependencies..."

# Track statistics
declare -A incoming_links
declare -A outgoing_links
declare -A node_ids
total_nodes=0
total_edges=0

# Process all files
while IFS= read -r file_entry; do
    filepath=$(echo "$file_entry" | jq -r '.absolute_path')
    rel_path=$(echo "$file_entry" | jq -r '.path')
    title=$(echo "$file_entry" | jq -r '.title')
    category=$(echo "$file_entry" | jq -r '.category')

    # Generate node ID
    node_id="node${total_nodes}"
    node_ids["$rel_path"]="$node_id"
    ((total_nodes++)) || true

    # Determine color based on category
    color=""
    case "$category" in
        api-docs) color="#4A90E2" ;;
        architecture) color="#50C878" ;;
        package-*) color="#FFD700" ;;
        runbooks|deployment|monitoring) color="#FF8C00" ;;
        *) color="#DC143C" ;;
    esac

    # Create node
    echo "${node_id}[\"${title}\"]" >> "${NODES_FILE}"
    echo "style ${node_id} fill:${color},stroke:#333,stroke-width:2px" >> "${NODES_FILE}"

    # Initialize link counters
    incoming_links["$rel_path"]=0
    outgoing_links["$rel_path"]=0

done < <(jq -c '.files[]' "${CATALOG_FILE}")

echo "  Processed ${total_nodes} nodes"

# Process dependencies
echo "🔗 Analyzing links..."

while IFS= read -r file_entry; do
    rel_path=$(echo "$file_entry" | jq -r '.path')
    dependencies=$(echo "$file_entry" | jq -r '.dependencies[]' 2>/dev/null || true)

    source_id="${node_ids[$rel_path]}"

    while IFS= read -r dep; do
        [[ -z "$dep" ]] && continue

        # Resolve dependency path
        dep_dir=$(dirname "$rel_path")
        if [[ "$dep" = /* ]]; then
            dep_path="${dep#/}"
        else
            dep_path="${dep_dir}/${dep}"
        fi

        # Normalize path
        dep_path=$(echo "$dep_path" | sed 's|/\./|/|g' | sed 's|/[^/]*/\.\./|/|g')

        # Check if target exists in our nodes
        if [[ -n "${node_ids[$dep_path]:-}" ]]; then
            target_id="${node_ids[$dep_path]}"

            # Create edge
            echo "${source_id} --> ${target_id}" >> "${EDGES_FILE}"

            # Update statistics
            ((outgoing_links["$rel_path"]++)) || true
            ((incoming_links["$dep_path"]++)) || true
            ((total_edges++)) || true
        fi
    done <<< "$dependencies"

done < <(jq -c '.files[]' "${CATALOG_FILE}")

echo "  Found ${total_edges} edges"

# Find orphaned docs
echo "🔎 Finding orphaned documentation..."
orphaned_count=0
orphaned_list=""

for path in "${!node_ids[@]}"; do
    in=${incoming_links[$path]:-0}
    out=${outgoing_links[$path]:-0}

    if [[ $in -eq 0 ]] && [[ $out -eq 0 ]]; then
        orphaned_list="${orphaned_list}- \`${path}\`\n"
        ((orphaned_count++)) || true
    fi
done

# Find most referenced docs
most_referenced=""
most_referenced_count=0
for path in "${!incoming_links[@]}"; do
    count=${incoming_links[$path]}
    if [[ $count -gt $most_referenced_count ]]; then
        most_referenced="$path"
        most_referenced_count=$count
    fi
done

# Find most linking docs
most_linking=""
most_linking_count=0
for path in "${!outgoing_links[@]}"; do
    count=${outgoing_links[$path]}
    if [[ $count -gt $most_linking_count ]]; then
        most_linking="$path"
        most_linking_count=$count
    fi
done

# Generate hub list (top 10 most connected)
hub_list=""
{
    for path in "${!incoming_links[@]}"; do
        in=${incoming_links[$path]}
        out=${outgoing_links[$path]}
        total=$((in + out))
        echo "${total}|${path}|${in}|${out}"
    done
} | sort -t'|' -k1 -rn | head -10 | while IFS='|' read -r total path in out; do
    hub_list="${hub_list}- \`${path}\` (${in} incoming, ${out} outgoing)\n"
done

# Assemble Mermaid graph
echo "📝 Generating Mermaid diagram..."
{
    cat "${NODES_FILE}" 2>/dev/null || true
    echo ""
    cat "${EDGES_FILE}" 2>/dev/null || true
} > "${TEMP_DIR}/graph.txt"

graph_content=$(cat "${TEMP_DIR}/graph.txt")

# Update output file
sed -i "s/DATE/$(date "+%Y-%m-%d %H:%M:%S")/" "${OUTPUT_FILE}"
sed -i "s/TOTAL_NODES/${total_nodes}/" "${OUTPUT_FILE}"
sed -i "s/TOTAL_EDGES/${total_edges}/" "${OUTPUT_FILE}"
sed -i "s/ORPHANED/${orphaned_count}/" "${OUTPUT_FILE}"
sed -i "s|MOST_REFERENCED|\`${most_referenced}\` (${most_referenced_count} references)|" "${OUTPUT_FILE}"
sed -i "s|MOST_LINKING|\`${most_linking}\` (${most_linking_count} links)|" "${OUTPUT_FILE}"
sed -i "s|GRAPH_CONTENT|${graph_content}|" "${OUTPUT_FILE}"
sed -i "s|ORPHANED_LIST|${orphaned_list:-No orphaned documentation}|" "${OUTPUT_FILE}"
sed -i "s|HUB_LIST|${hub_list}|" "${OUTPUT_FILE}"

echo "📄 Dependency graph saved to: ${OUTPUT_FILE}"

# Cleanup
rm -rf "${TEMP_DIR}"

echo ""
echo "📊 Graph Statistics:"
echo "  - Total nodes: ${total_nodes}"
echo "  - Total edges: ${total_edges}"
echo "  - Orphaned docs: ${orphaned_count}"
echo "  - Most referenced: ${most_referenced} (${most_referenced_count})"
echo "  - Most linking: ${most_linking} (${most_linking_count})"
echo ""
echo "🎉 Dependency graph generation complete!"
