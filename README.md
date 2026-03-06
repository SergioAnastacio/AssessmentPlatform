# AssessmentPlatform

Repo objetivo para validar el flujo multiagente (OpenClaw).

## Auto-merge
Este repo soporta auto-merge cuando:
- la PR tiene el label `automerge`, y
- los checks requeridos (ej. `grader-ts`) están en verde.

### Crear PRs con label `automerge`
- PowerShell:
  - `./scripts/pr_create_automerge.ps1 -Title "..." -Body "..."`
- Bash:
  - `./scripts/pr_create_automerge.sh --title "..." --body "..."`
