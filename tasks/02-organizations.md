# Task 02: Organizations

**Status:** NOT STARTED | **Slice:** 2/16 | **Depends on:** 01-auth

## Goal
Multi-tenant orgs with teams, roles, permissions, invites, in-app notifications.

## Scope
### DB: Organization, OrganizationMember, Team, TeamMember, Invite, Notification
### Roles: Owner, Admin, Analyst, Reviewer, Viewer
### Server: CRUD, invite flow, `requireOrgRole()` helper, notification on invite/process complete
### UI: Org list, settings, members table, teams, invite form, notifications bell + dropdown

## Acceptance
docs/08-acceptance-criteria.md § 02
