# BRIEFING — 2026-06-24T17:24:00+02:00

## Mission
Evolve character sprites (Rumi, Zoey, Mira) to be visually sharper, more detailed, and expressive, and implement the electric lightning shield aura.

## 🔒 My Identity
- Archetype: Teamwork
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: /Users/marcocardoso/DEV/cloudcrush-local/.agents/sub_orch_sprite
- Original parent: parent
- Original parent conversation ID: ab1883a9-9ed3-44d3-b906-054a7e82b118

## 🔒 My Workflow
- **Pattern**: Project (Sub-orchestrator pattern)
- **Scope document**: /Users/marcocardoso/DEV/cloudcrush-local/.agents/sub_orch_sprite/SCOPE.md
1. **Decompose**: We run a single Explorer -> Worker -> Reviewer -> Challenger -> Auditor cycle because this is a single tightly-coupled milestone (Premium Character Sprite Evolution).
2. **Dispatch & Execute** (pick ONE):
   - **Direct (iteration loop)**: Spawn Explorer to analyze the drawing codebase, spawn Worker to execute enhancements, spawn Reviewers/Challengers/Auditors to verify correctness and integrity.
   - **Delegate (sub-orchestrator)**: N/A
3. **On failure** (in this order):
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (sub-orchestrators only, last resort)
4. **Succession**: Self-succeed at 16 spawns. Write handoff.md, spawn successor, exit.
- **Work items**:
  1. Character Sprite Evolution & Aura [pending]
- Current phase: 1
- Current focus: Planning and scope definition

## 🔒 Key Constraints
- Do not write, modify, or create source code files directly.
- Ensure no regression in game behavior.
- Integrity verification by Forensic Auditor must pass cleanly.
- Never reuse a subagent after it has delivered its handoff — always spawn fresh.

## Current Parent
- Conversation ID: ab1883a9-9ed3-44d3-b906-054a7e82b118
- Updated: not yet

## Key Decisions Made
- Executing single milestone via unified Explorer -> Worker -> Reviewer -> Challenger -> Auditor loop.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| explorer_1 | teamwork_preview_explorer | Explore sprite & aura design | completed | 305af357-d9b6-4222-8f62-3ceb59771108 |
| worker_1 | teamwork_preview_worker | Implement sprite & aura upgrades | in-progress | 2dcae209-00cf-4b32-a511-93dc0158969f |

## Succession Status
- Succession required: no
- Spawn count: 2 / 16
- Pending subagents: 2dcae209-00cf-4b32-a511-93dc0158969f
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: task-27
- Safety timer: none
- On succession: kill all timers before spawning successor
- On context truncation: run `manage_task(Action="list")` — re-create if missing

## Artifact Index
- /Users/marcocardoso/DEV/cloudcrush-local/.agents/sub_orch_sprite/BRIEFING.md — Agent briefing
- /Users/marcocardoso/DEV/cloudcrush-local/.agents/sub_orch_sprite/progress.md — Agent progress tracking
- /Users/marcocardoso/DEV/cloudcrush-local/.agents/sub_orch_sprite/ORIGINAL_REQUEST.md — Original request verbatim
