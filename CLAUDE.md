# Project Agent Routing

Every user request that asks Claude to execute work in this repository must be routed through the custom agent defined at `.claude/agents/agents-orchestrator.md`.

This routing is mandatory even when the user does not explicitly mention the orchestrator.

## Required Flow

1. Read `.claude/agents/agents-orchestrator.md`.
2. Treat `Agents Orchestrator` as the first decision maker for the request.
3. Let the orchestrator decide whether the request is simple enough for direct handling or whether it needs PM, architecture, developer, QA, security, or integration agents.
4. Do not modify code, create files, run implementation commands, or perform QA-sensitive actions until the orchestrator decision has been made.

## Exceptions

The only allowed direct actions before the orchestrator decision are:

- Reading project instructions and agent definitions.
- Inspecting files needed to understand whether orchestration is required.
- Reporting that orchestration cannot run because the agent definition or hook configuration is missing.

## Project Standards

Before generating or modifying code, docs, or artifacts, follow:

1. `IA_rules.md`
2. `STYLE_GUIDE.md`
3. `FOLDER_STRUCTURE.md`

If these standards conflict with the current implementation, treat the standards as the source of truth.
