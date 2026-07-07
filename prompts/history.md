# Prompt: History

**Version:** 1.0.0  
**Feature:** history  
**Purpose:** Audit logging and history viewer

## Inputs
- Action type, entity type, entity ID, metadata
- User and organization context

## Outputs
- Immutable AuditLog entries

## Constraints
- Log from shared `logAudit()` helper
- Never delete or modify audit entries
- Paginated queries only

## Citation Rules
N/A
