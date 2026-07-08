# Task 15: History + Settings

**Status:** NOT STARTED | **Slice:** 15/16 | **Depends on:** 02-organizations

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
- [ ] Add `deletedAt` (+ optional `purgeAfter`) to `User`
- [ ] Reuse `Organization.deletedAt` for org tombstoning (revert Slice 02 immediate hard delete to tombstone + purge)

#### Delete behavior (user + org)
- [ ] On delete: set `deletedAt` / `purgeAfter` (now + 24h), sign out, hide from lists/APIs/auth
- [ ] Block account deletion if user is sole owner of any org (must delete/transfer orgs first)
- [ ] Custom `ConfirmDialog` + password re-entry for account delete
- [ ] Update org delete copy: “deactivated now, permanently removed after 24 hours”

#### Recovery (within 24h)
- [ ] On login, if `user.deletedAt` set and within grace window → `/account/recover` (restore or continue deletion)
- [ ] Org recovery: owner can restore tombstoned org from org settings danger zone
- [ ] Auth guards: block deleted users from dashboard; allow recovery route only

#### Purge (after 24h)
- [ ] Shared `purgeExpiredEntities()` — hard-delete expired users and orgs
- [ ] Reuse existing cascade logic (members, teams, invites, invite notifications, avatar files)
- [ ] Cron: `GET /api/cron/purge-deleted` + Vercel Cron (or `pnpm db:purge-deleted` script)
- [ ] Audit events: `USER_DELETED`, `USER_RECOVERED`, `USER_PURGED`, `ORG_DELETED`, `ORG_RECOVERED`, `ORG_PURGED`

#### Tests
- [ ] Integration: delete → recover within 24h
- [ ] Integration: purge after grace window (mocked time)
- [ ] Block sole-owner account delete without org handoff

### `logAudit()` integrated across all prior slices

## Acceptance
docs/08-acceptance-criteria.md § 15

## Notes
- **Not in Slice 02.** Current org delete is immediate hard delete (acceptable until Slice 15).
- **Not in Slice 01.** Account deletion and recovery do not exist yet; only profile update today.
- Aligns with `docs/09-page-specifications.md` Settings tabs and `docs/00-product-prd.md` § 4.25.
