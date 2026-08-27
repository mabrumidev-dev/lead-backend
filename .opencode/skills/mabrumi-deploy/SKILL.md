---
name: mabrumi-deploy
description: Use when deploying the Mabrumi CRM to Render. Covers build, push to GitHub, and verify Render deploy status. Also use when user says "deploy", "publicar", "subir", or "publicar no render".
---

# Mabrumi CRM - Deploy Skill

## Deploy Workflow

### Step 1: Build frontend
```powershell
cmd /c "npm run build"
```
Workdir: project root

### Step 2: Git commit and push
```powershell
& "C:\Program Files\Git\cmd\git.exe" add -A
& "C:\Program Files\Git\cmd\git.exe" commit -m "<commit message>"
& "C:\Program Files\Git\cmd\git.exe" push origin main
```

### Step 3: Verify deploy
- Render auto-deploys on push to main
- Check: https://lead-backend-rezr.onrender.com
- Ask user to test in incognito mode (Ctrl+Shift+N)

## Environment

- Git: `C:\Program Files\Git\cmd\git.exe`
- Author: `mabrumidev-dev <mabrumi.dev@gmail.com>`
- Remote: `https://github.com/mabrumidev-dev/lead-backend.git`
- Branch: `main`
- PowerShell: does NOT support `&&`. Use `;` or `cmd /c` for chaining.
- Render service: `lead-backend` (Docker runtime, Starter plan)

## Important Notes

- Docker builds on Render do NOT have access to env vars during `npm run build`
- Supabase config is injected at runtime via FastAPI HTML injection (`window.__SUPABASE_CONFIG__`)
- Chromium memory limit: Render Starter = 512MB. Keep scraper lean.
