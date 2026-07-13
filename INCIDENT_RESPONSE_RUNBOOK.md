# Incident Response Runbook — Yemen Telecom

## Severity Matrix

| Level | Label | Definition | Response |
|-------|-------|------------|----------|
| S1 | 🔴 Critical | Full outage, data loss, auth bypass | < 15min response, < 1h resolution |
| S2 | 🟠 High | Major feature degraded, partial outage | < 30min response, < 4h resolution |
| S3 | 🟡 Medium | Non-critical bug, cosmetic issue | < 2h response, < 24h resolution |
| S4 | 🟢 Low | Enhancement, minor issue | Next sprint |

## Detection Channels

| Channel | What we watch | Action |
|---------|--------------|--------|
| Render Dashboard | Service status, restart events | Log into dashboard.render.com |
| Render Logs | ERROR/WARN, OOM, timeouts | `Render_list_logs` via CLI |
| GitHub Actions | CI/CD failures, test flakes | `gh run list` |
| Health Endpoint | `/api/health` returns 200 | Prometheus / Uptime Robot |
| Discord Webhook | Deploy failure notifications | Auto-notify on CI/CD failure |
| Manual Reports | User-reported issues | Investigate + add alert |

## Runbook Procedures

### S1: Full Outage (site down, 5xx on health)

1. **Verify outage:**
   ```bash
   curl -s -o /dev/null -w "%{http_code}" https://yemen-telecom-api.onrender.com/api/health
   ```
2. **Check Render status:**
   - Open Render Dashboard → `yemen-telecom-api`
   - Is service suspended? (Free plan idle spin-down)
   - Is it actively deploying? Check latest deploy status
3. **Check recent logs:**
   - ERROR or FATAL entries
   - OOM killer messages (`Killed`, `Out of memory`)
   - Connection refused to database
4. **If suspended (free plan):**
   - Trigger a manual request to wake it up
   - Wait ~30s for cold start
   - Verify health returns 200
5. **If database connection failure:**
   - Check `DB_SSL_REJECT_UNAUTHORIZED` env var
   - Verify Supabase status at status.supabase.com
   - Check Render Postgres metrics
6. **If deploy failure:**
   - Rollback via RENDER_ROLLBACK_HOOK_URL
   - Or re-deploy previous known-good commit
   - Or force-push revert to main and trigger CI
7. **Escalate:** Contact sysadmin if > 15min unresolved

### S2: Major Feature Degradation

**Examples:** Login failures, SIM assignment broken, reports not loading

1. **Identify affected feature:**
   - Check render logs for ERROR matching route
   - Reproduce issue in test environment
2. **Check rate limiter hits:**
   - Are users hitting `429 Too Many Requests`?
   - Check IP-based limiter logs
3. **Check database:**
   - Connection pool exhaustion?
   - Slow queries? Enable `statement_timeout` logging
4. **Deploy fix:**
   - Create hotfix branch from main
   - Apply fix, push, verify CI
   - Manually trigger deploy via `workflow_dispatch`
5. **Notify users:** Via in-app banner or support channel

### S3: Non-Critical Bug

1. Log issue as GitHub issue with severity label
2. Assign to next sprint
3. Include reproduction steps and log snippets

### S4: Enhancement

1. Log as GitHub issue with enhancement label
2. Prioritize in backlog grooming

## Rollback Procedure

### Automated Rollback (CI/CD)

The deploy workflow has auto-rollback built in:
- If health check fails after deploy, the `Rollback` step triggers
- Requires `RENDER_ROLLBACK_HOOK_URL` secret to be set in GitHub
- Sends Discord notification on failure

### Manual Rollback

```bash
# 1. Revert to previous commit
git revert HEAD --no-edit
git push origin main

# 2. Or checkout known-good commit
git checkout <last-known-good-sha>
git push -f origin main

# 3. Trigger deploy manually
gh workflow run deploy.yml
```

### Database Rollback

> **Note:** No automated rollback scripts exist. Migrations are forward-only.
> To rollback a bad migration:
```sql
-- Manual reverse of migration (example)
-- ALTER TABLE xxx DROP COLUMN yyy;
-- Run by superuser only
```

## Key Contacts

| Role | Contact |
|------|---------|
| DevOps / Infrastructure | GitHub Issues |
| Backend Lead | @assignee in GH Issue |
| Frontend Lead | @assignee in GH Issue |
| Security | @assignee in GH Issue |

## Post-Mortem Template

```markdown
## Incident Post-Mortem

**Date:** YYYY-MM-DD
**Severity:** S1/S2/S3/S4
**Duration:** XX minutes
**Impact:** X users affected, Y features degraded

### Root Cause
[One paragraph]

### Timeline
- HH:MM — Detection
- HH:MM — Investigation started
- HH:MM — Root cause identified
- HH:MM — Fix applied
- HH:MM — Resolution confirmed

### Resolution
[What was done to fix]

### Preventive Actions
- [ ] Add monitoring alert
- [ ] Add test coverage
- [ ] Update runbook
```

## Security Incidents

### Credential Leak
1. Revoke leaked credential immediately
2. Rotate all secrets in Render Dashboard
3. Rotate JWT_SECRET, REFRESH_SECRET, CSRF_SECRET
4. Check GitHub logs for unauthorized access
5. Force logout all users (increment token version)

### Auth Bypass / IDOR
1. Take affected endpoint offline via rate limiter (set limit to 0)
2. Apply fix in hotfix branch
3. Audit all similar endpoints
4. Deploy hotfix

### SQL Injection
1. Verify all queries use parameterized `$1` syntax
2. Block offending IP via rate limiter
3. Apply fix

## Communication Templates

### Outage Notification (Internal)
```
🚨 [S1] OUTAGE — <brief description>
Impact: <what's broken>
Started: <time>
Status: Investigating / Fixing / Resolved
ETA: <expected resolution time>
```

### Status Update (External)
```
We are currently experiencing <issue>. Our team has been notified and is working on a fix.
Updates will be posted here: <GitHub issue URL>
```
