# Task 01: Auth

**Status:** NOT STARTED | **Slice:** 1/16 | **Depends on:** Phase 0

## Goal
Full authentication: signup, login, forgot password, profile, dark mode default.

## Scope
### DB: `User` (theme preference)
### Server: Auth.js credentials, bcrypt, forgot-password token (dev: console log)
### UI: `/login`, `/register`, `/forgot-password`, profile in settings, protected `/dashboard/*`
### Middleware: redirect unauthenticated; redirect authenticated away from auth pages

## Files
```
features/auth/ — forms, actions, schemas, tests
lib/auth.ts, middleware.ts, app/api/auth/[...nextauth]/route.ts
```

## Acceptance
docs/08-acceptance-criteria.md § 01
