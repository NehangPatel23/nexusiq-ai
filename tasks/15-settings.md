# Task 15: History + Settings

**Status:** DONE | **Slice:** 15/16 | **Depends on:** 02-organizations

## Goal
Audit history, project comparison, full settings hub, and deferred deletion with account recovery.

## Scope

### Audit log viewer with filters (user, action, date)
### Project comparison: side-by-side scores
### Settings shell + tabs
- `/dashboard/settings` layout with sub-nav (not redirect-only)
- **Profile** — name, avatar (exists; migrate into shell)
- **Security** — change password, active sessions (optional), **delete account**
- **Notifications** — in-app notification preferences
- **AI Models** — Ollama URL/model config
- **Appearance** — dark/light theme (`User.theme`)
- **Shortcuts** — keyboard shortcuts reference

### Deferred deletion + recovery (24h grace period)
Unified tombstone pattern for user accounts and organizations. Member removal and invite cancellation stay immediate hard deletes (access revocation, not recoverable entity deletion).

#### Schema
- [x] Add `deletedAt` (+ optional `purgeAfter`) to `User`
- [x] Reuse `Organization.deletedAt` for org tombstoning (revert Slice 02 immediate hard delete to tombstone + purge)

#### Delete behavior (user + org)
- [x] On delete: set `deletedAt` / `purgeAfter` (now + 24h), sign out, hide from lists/APIs/auth
- [x] Block account deletion if user is sole owner of any org (must delete/transfer orgs first)
- [x] Custom `ConfirmDialog` + password re-entry for account delete
- [x] Update org delete copy: “deactivated now, permanently removed after 24 hours”

#### Recovery (within 24h)
- [x] On login, if `user.deletedAt` set and within grace window → `/account/recover` (restore or continue deletion)
- [x] Org recovery: owner can restore tombstoned org from organizations list (Recently deactivated)
- [x] Auth guards: block deleted users from dashboard; allow recovery route only

#### Purge (after 24h)
- [x] Shared `purgeExpiredEntities()` — hard-delete expired users and orgs
- [x] Reuse existing cascade logic (members, teams, invites, invite notifications, avatar files)
- [x] Cron: `GET /api/cron/purge-deleted` + Vercel Cron (or `pnpm db:purge-deleted` script)
- [x] Audit events: `USER_DELETED`, `USER_RECOVERED`, `USER_PURGED`, `ORG_DELETED`, `ORG_RECOVERED`, `ORG_PURGED`

#### Tests
- [x] Integration: delete → recover within 24h
- [x] Integration: purge after grace window (mocked time)
- [x] Block sole-owner account delete without org handoff

### `logAudit()` integrated across all prior slices

## Acceptance
docs/08-acceptance-criteria.md § 15

## Notes
- AI Models: env vars always win when set; SystemSetting used on localhost when env unset. `OLLAMA_API_KEY` never exposed to the client.
- Aligns with `docs/09-page-specifications.md` Settings tabs and `docs/00-product-prd.md` § 4.25.
