# Prompt: Auth

**Version:** 1.0.0  
**Feature:** auth  
**Purpose:** Guide implementation of email/password authentication

## Inputs
- User registration data (name, email, password)
- Login credentials (email, password)

## Outputs
- Session cookie via Auth.js
- Authenticated user context in server components

## Constraints
- Auth.js with Credentials provider only
- bcrypt password hashing (cost factor 12)
- No paid auth providers
- Session strategy: JWT or database (prefer database for simplicity)

## Implementation Notes
- Middleware protects all `/dashboard/*` routes
- Redirect authenticated users away from `/login` and `/register`
- Form validation with Zod: email format, password min 8 chars

## Citation Rules
N/A — non-AI feature
