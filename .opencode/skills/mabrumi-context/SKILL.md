---
name: mabrumi-context
description: Auto-save and restore conversation context. Use at START of every new session to restore state, and at END to save progress. Prevents context loss on restart.
---

# Mabrumi CRM - Context Memory Skill

## AT START OF EVERY SESSION

1. Read `D:\OpenCode_Projetos\mabrumi-crm-pro\.opencode\CONTEXT_STATE.md`
2. This file contains: last session summary, pending tasks, errors found, current state
3. Continue from where we left off - do NOT restart from scratch

## AT END OF SESSION (or before crash/restart)

Update `CONTEXT_STATE.md` with:

```markdown
# Context State - [DATE]

## Last Session Summary
- What was done
- What was found
- What was working/not working

## Pending Tasks
- [ ] Task 1
- [ ] Task 2

## Known Issues
- Issue 1: description
- Issue 2: description

## Project State
- Frontend: working/broken
- Backend: working/broken
- Database: working/broken

## Important Notes
- Any critical info for next session
```

## File Locations

- Context state: `.opencode/CONTEXT_STATE.md`
- Project context: `CONTEXT.md`
- This skill: `.opencode/skills/mabrumi-context/SKILL.md`

## Rules

1. NEVER assume what was done before - ALWAYS read CONTEXT_STATE.md first
2. NEVER make changes without understanding current state
3. ALWAYS update CONTEXT_STATE.md before ending session
4. If CONTEXT_STATE.md doesn't exist, create it and ask user what was happening
