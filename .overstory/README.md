# .overstory/

This directory is managed by [overstory](https://github.com/jayminwest/overstory) — a multi-agent orchestration system for Claude Code.

Overstory turns a single Claude Code session into a multi-agent team by spawning worker agents in git worktrees via tmux, coordinating them through a custom SQLite mail system, and merging their work back with tiered conflict resolution.

## Key Commands

- `ov init`          — Initialize this directory
- `ov status`        — Show active agents and state
- `ov sling <id>`    — Spawn a worker agent
- `ov mail check`    — Check agent messages
- `ov merge`         — Merge agent work back
- `ov dashboard`     — Live TUI monitoring
- `ov doctor`        — Run health checks

## Structure

- `config.yaml`             — Project configuration
- `agent-manifest.json`     — Agent registry
- `hooks.json`              — Claude Code hooks config
- `agent-defs/`             — Agent definition files (.md)
- `specs/`                  — Task specifications
- `agents/`                 — Per-agent state and identity
- `worktrees/`              — Git worktrees (gitignored)
- `logs/`                   — Agent logs (gitignored)
