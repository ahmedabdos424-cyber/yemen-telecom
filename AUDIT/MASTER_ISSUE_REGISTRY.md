# MASTER ISSUE REGISTRY — Yemen Telecom (CORRECTED)

## Audit Date: 2026-06-24
## Correction: Secrets ARE in git history (commit d784c83)

---

| ID | Severity | File | Evidence | Impact | Root Cause | Recommendation | Status |
|----|----------|------|----------|--------|------------|----------------|--------|
| SEC-001 | **CRITICAL** | APK_LOGIN_ROOT_CAUSE_ANALYSIS.md (git history) | Firebase private key in committed markdown | Firebase project compromise | Secret embedded in diagnostic file | Rotate + clean git history | **OPEN** |
| SEC-002 | **CRITICAL** | APK_LOGIN_ROOT_CAUSE_ANALYSIS.md (git history) | DB credentials in committed markdown | Database compromise | Secret embedded in diagnostic file | Rotate + clean git history | **OPEN** |
| SEC-003 | **CRITICAL** | APK_LOGIN_ROOT_CAUSE_ANALYSIS.md (git history) | JWT/CSRF/Refresh secrets in committed markdown | Token forgery | Secret embedded in diagnostic file | Rotate + clean git history | **OPEN** |
| SEC-004 | **HIGH** | .env:8-10 | Weak sequential secrets (a1b2c3...) | Weak credentials | Dev-only pattern | Rotate to strong secrets | **OPEN** |
| SEC-005 | HIGH | src/api/client.ts:16 | Hardcoded production API URL | Info disclosure | No env variable | Use env variable | OPEN |
| SEC-006 | HIGH | src/services/tokenStorage.ts:55-60 | Tokens in localStorage | XSS token theft | Design choice | Migrate to httpOnly cookies | OPEN |
| SEC-007 | HIGH | firestore.rules:4-6 | Any auth user reads/writes all | Data breach | Over-permissive rules | Add role-based rules | OPEN |
| SEC-008 | HIGH | storage.rules:4-6 | Any auth user reads/writes all | File overwrite | Over-permissive rules | Add path-based rules | OPEN |
| SEC-009 | MEDIUM | server/src/index.ts:81 | CORS allows all in dev mode | Cross-origin attacks | Dev convenience | Restrict in staging | OPEN |
| SEC-010 | MEDIUM | server/src/routes/sellers.ts:34 | GET /sellers manual auth check | Auth bypass risk | Inconsistent middleware | Add requireRole | OPEN |
| SEC-011 | HIGH | server/src/routes/users.ts:32-50 | Account delete no token blacklist | Post-delete access | Missing step | Blacklist tokens on delete | OPEN |
| SEC-012 | HIGH | server/src/routes/admin.ts:172-199 | Backup exposes full DB via URL | Data exfiltration | Design | Add download auth | OPEN |
| SEC-013 | MEDIUM | server/src/routes/agents.ts:40 | 4-byte random password | Weak passwords | Insufficient entropy | Use 8+ bytes | OPEN |
| SEC-015 | MEDIUM | server/src/index.ts:59,61 | CSP unsafe-inline | XSS risk | Vite/Tailwind requirement | Implement nonce-based CSP | OPEN |
| SEC-017 | MEDIUM | src/types.ts:84-85 | Password field in Seller type | Password leakage | Backend returns creds | Remove from type | OPEN |
| SEC-018 | HIGH | Multiple routes | No audit logging | No forensic trail | Not implemented | Add audit_log inserts | OPEN |
| SEC-019 | HIGH | .env:6, server/.env:10 | SSL verification disabled | MITM on DB conn | Config choice | Enable SSL verification | OPEN |
| SEC-020 | MEDIUM | server/src/middleware/auth.ts | Session timeout not enforced | Persistent sessions | Setting not wired | Check in middleware | OPEN |
| BL-001 | HIGH | src/hooks/useAgentSellerState.ts:72-101 | SIM activation creates duplicates | Data inconsistency | Optimistic update bug | Rollback on failure | OPEN |
| BL-004 | MEDIUM | server/src/routes/sellers.ts:224-253 | Balance update non-atomic | Race condition | No transaction | Use atomic increment | OPEN |
| BL-005 | MEDIUM | server/src/routes/distributions.ts:91-126 | No stock check on approval | Overselling | Missing validation | Add stock check | OPEN |
| BE-002 | HIGH | server/src/index.ts:170-180 | Maintenance check every request | Performance | No caching | Cache with TTL | OPEN |
| BE-003 | HIGH | server/src/routes/sellers.ts:289-313 | Seller delete not in transaction | Partial delete | Missing transaction | Wrap in transaction | OPEN |
| FE-001 | HIGH | src/hooks/useAgentSellerState.ts:89-101 | Optimistic update no rollback | Phantom data | No error handling | Add rollback | OPEN |
| FE-004 | MEDIUM | src/components/LoginScreen.tsx:101 | Login hardcodes manager role | Agent/seller can't login | UI limitation | Add role selection | OPEN |
| FE-006 | HIGH | src/api/client.ts:23-24,83-104 | Token refresh race condition | Multiple refreshes | Partial impl | Complete dedup | OPEN |
| FG-001 | MEDIUM | system_settings table | 2FA not implemented | Security setting unused | Feature gap | Implement 2FA | OPEN |
| FG-006 | HIGH | system_settings table | Failed login tracking not implemented | Brute force | Feature gap | Add tracking | OPEN |
| FG-011 | MEDIUM | src/components/ActivateSimForm.tsx:301 | ICCID OCR not connected | Manual entry only | Incomplete feature | Connect OCR | OPEN |
| PR-001 | **CRITICAL** | APK_LOGIN_ROOT_CAUSE_ANALYSIS.md (git history) | Secrets in git history | System compromise | Diagnostic file committed | Rotate + clean history | **OPEN** |
| PR-002 | HIGH | — | No automated backups | Data loss risk | No scheduler | Add pg_cron or cron job | OPEN |
| PR-003 | HIGH | server/src/index.ts:154-156 | Health check incomplete | Silent failures | Partial check | Check all deps | OPEN |
| PR-008 | MEDIUM | render.yaml:7 | Render free plan | Cold starts | Cost | Upgrade plan | OPEN |
| AND-001 | HIGH | android/app/build.gradle:69-76 | google-services.json missing | Firebase Android broken | Missing config | Add config file | OPEN |
| AND-003 | MEDIUM | AndroidManifest.xml:5 | allowBackup=true | Data extraction | Default setting | Set to false | OPEN |

---

## SEVERITY DISTRIBUTION (Corrected)

| Severity | Count | Notes |
|----------|-------|-------|
| **CRITICAL** | **5** | SEC-001, SEC-002, SEC-003, PR-001 (git exposure) |
| **HIGH** | **15** | SEC-004, SEC-005, SEC-006, SEC-007, SEC-008, SEC-011, SEC-012, SEC-018, SEC-019, BL-001, BE-002, BE-003, FE-001, FE-006, FG-006, PR-002, PR-003, AND-001 |
| **MEDIUM** | **13** | SEC-009, SEC-010, SEC-013, SEC-015, SEC-017, SEC-020, BL-004, BL-005, FE-004, FG-001, FG-011, PR-008, AND-003 |
| **LOW** | **0** | — |
| **TOTAL** | **33** | — |

---

## KEY CORRECTIONS FROM PREVIOUS AUDITS

| Previous Claim | Actual Finding | Error |
|----------------|----------------|-------|
| "Secrets NOT in git" | Secrets in commit d784c83 | CRITICAL ERROR |
| "No git history rewrite needed" | Rewrite REQUIRED | CRITICAL ERROR |
| "Force push not needed" | Force push REQUIRED | CRITICAL ERROR |
| "Team re-clone not needed" | Re-clone REQUIRED | CRITICAL ERROR |
| "0 CRITICAL issues" | 5 CRITICAL issues | CRITICAL ERROR |
| "SEC-001: REVISED (MEDIUM)" | SEC-001 is CRITICAL | CRITICAL ERROR |

---

## EVIDENCE

```bash
# Find commit with secrets
$ git log --all -p -S "sRPzEKEfR3uaeM" --oneline
d784c83 debug login failure and render deployment verification

# Verify secrets in file
$ git show d784c83:APK_LOGIN_ROOT_CAUSE_ANALYSIS.md | Select-String "sRPzEKEfR3uaeM"
| `DB_PASSWORD` | `sRPzEKEfR3uaeM#` |

# Verify all 5 secrets
$ git show d784c83:APK_LOGIN_ROOT_CAUSE_ANALYSIS.md | Select-String -Pattern "sRPzEKEfR3uaeM|de641af851b9|51be9abbf216|3d17e0edbe38|MIIEvQIBADAN"
| `DB_PASSWORD` | `sRPzEKEfR3uaeM#` |
| `JWT_SECRET` | `de641af851b92094edb251cb10ad1dbb260ebb4f6955c5607a619c44e3b9f079` |
| `REFRESH_SECRET` | `51be9abbf216d2b895b63ef0f665f0f98effb2186005543d1140c087266cdfef` |
| `CSRF_SECRET` | `3d17e0edbe38a7fa847b4ad54fa1ef17e42f8fa32fce727e4172b2cd7e2ce681` |
| `FIREBASE_PRIVATE_KEY` | `-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhki...\n-----END PRIVATE KEY-----\n` |
```
