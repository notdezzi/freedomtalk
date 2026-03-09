# Beads (bd)

> Git-backed issue tracker for AI-supervised coding workflows.
> Dolt-powered CLI with formulas, molecules, and multi-agent coordination.

## Quick Start

Install:
```bash
brew install beads
```

Initialize:
```bash
cd your-project && bd init --quiet
```

## Essential Commands

```bash
bd create "Title" -t bug -p 1 --json      # Create issue
bd list --status open --json              # List issues
bd show bd-42 --json                      # Show details
bd update bd-42 --claim                   # Start work
bd close bd-42 --reason "Done"            # Close issue
bd ready --json                           # Show unblocked work
bd sync                                   # Sync to git
```

## For AI Agents

- Always use `--json` for programmatic access
- Always include `--description` when creating issues
- Use `--deps discovered-from:<id>` to link found issues
- Run `bd sync` at end of every session

## Key Concepts

- **Issues**: Work items with priorities (0-4), types (bug/feature/task/epic/chore)
- **Dependencies**: `blocks` (affects ready queue), `parent-child`, `discovered-from`, `related`
- **Formulas**: Declarative workflow templates (TOML/JSON)
- **Molecules**: Work graphs from formulas
- **Gates**: Async coordination (human/timer/github)
- **Wisps**: Ephemeral workflows (don't sync to git)

## Recovery

Quick fixes for common issues:

- Database Corruption: `git checkout HEAD~1 -- .beads/`
- Merge Conflicts: Resolve JSONL conflicts, then `bd sync`
- Circular Dependencies: `bd doctor` (diagnose only, NEVER --fix)
- Sync Failures: `bd sync --import-only`

Full runbooks: https://steveyegge.github.io/beads/recovery/

## Session Close Protocol

Before ending any AI session:
1. `bd sync` - push changes to git
2. `bd status` - verify clean state
3. Resolve conflicts before closing

WARNING: Skipping sync causes data loss in multi-agent workflows.

## Documentation

- Full docs: https://steveyegge.github.io/beads/
- CLI reference: https://steveyegge.github.io/beads/cli-reference
- Agent guide: https://steveyegge.github.io/beads/integrations/claude-code
- Complete LLM context: https://steveyegge.github.io/beads/llms-full.txt

## Links

- GitHub: https://github.com/steveyegge/beads
- npm: https://www.npmjs.com/package/@beads/bd
- PyPI (MCP): https://pypi.org/project/beads-mcp/




Essential Commands for Agents
Creating Issues
# Always include description for context
bd create "Fix authentication bug" \
  --description="Login fails with special characters in password" \
  -t bug -p 1 --json

# Link discovered issues
bd create "Found SQL injection" \
  --description="User input not sanitized in query builder" \
  --deps discovered-from:bd-42 --json

Working on Issues
# Find ready work
bd ready --json

# Start work
bd update bd-42 --claim --json

# Complete work
bd close bd-42 --reason "Fixed in commit abc123" --json

Querying
# List open issues
bd list --status open --json

# Show issue details
bd show bd-42 --json

# Check blocked issues
bd blocked --json

Syncing
# ALWAYS run at session end
bd sync

Best Practices
Always Use --json
bd list --json          # Parse programmatically
bd create "Task" --json # Get issue ID from output
bd show bd-42 --json    # Structured data

Always Include Descriptions
# Good
bd create "Fix auth bug" \
  --description="Login fails when password contains quotes" \
  -t bug -p 1 --json

# Bad - no context for future work
bd create "Fix auth bug" -t bug -p 1 --json

Link Related Work
# When you discover issues during work
bd create "Found related bug" \
  --deps discovered-from:bd-current --json

Sync Before Session End
# ALWAYS run before ending
bd sync

Plugin (Optional)
For enhanced UX with slash commands:

# In Claude Code
/plugin marketplace add steveyegge/beads
/plugin install beads
# Restart Claude Code

Adds slash commands:

/beads:ready - Show ready work
/beads:create - Create issue
/beads:show - Show issue
/beads:update - Update issue
/beads:close - Close issue
Troubleshooting
Context not injected
# Check hook setup
bd setup claude --check

# Manually prime
bd prime

Changes not syncing
# Force sync
bd sync

# Check system health
bd doctor

Database not found
# Initialize beads
bd init --quiet