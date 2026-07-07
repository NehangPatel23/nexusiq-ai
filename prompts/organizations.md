# Prompt: Organizations

**Version:** 1.0.0  
**Feature:** organizations  
**Purpose:** Multi-tenant organization management

## Inputs
- Organization name, description
- Member email, role for invites

## Outputs
- Organization records with slug
- Membership with role assignment

## Constraints
- Creator becomes OWNER
- Slug unique globally or per-user org list
- Soft delete only
- Invite tokens expire in 7 days

## Citation Rules
N/A
