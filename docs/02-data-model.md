# Data Model

Enterprise decision intelligence schema. Implement in `prisma/schema.prisma`.

---

## Enums

```prisma
enum OrgRole { OWNER ADMIN ANALYST REVIEWER VIEWER }
enum ProjectType { MA VENDOR_DD AUDIT INVESTMENT INTERNAL }
enum DocumentStatus { PENDING PROCESSING READY FAILED }
enum DocumentType { PDF DOCX XLSX CSV PPTX TXT IMAGE OTHER }
enum DocumentClassification { FINANCIAL LEGAL TAX HR OPERATIONAL COMPLIANCE CONTRACT CORRESPONDENCE OTHER }
enum RiskSeverity { CRITICAL HIGH MEDIUM LOW }
enum RiskStatus { OPEN ACKNOWLEDGED RESOLVED DISMISSED }
enum TaskStatus { TODO IN_PROGRESS DONE CANCELLED }
enum TaskPriority { LOW MEDIUM HIGH URGENT CRITICAL }
enum ContradictionStatus { OPEN ACKNOWLEDGED RESOLVED DISMISSED }
enum MissingItemStatus { OPEN REQUESTED RESOLVED NOT_APPLICABLE }
enum AgentType { FINANCIAL LEGAL COMPLIANCE RISK FRAUD EXECUTIVE CONSENSUS }
enum ChatAgentType { GENERAL FINANCIAL LEGAL COMPLIANCE RISK FRAUD }
enum ChatMessageRole { USER ASSISTANT SYSTEM }
enum ConfidenceLevel { HIGH MEDIUM LOW INSUFFICIENT }
enum NotificationType { PROCESSING_COMPLETE RISK_FOUND TASK_ASSIGNED MENTION SYSTEM }
enum ReportType { EXECUTIVE BOARD INVESTMENT_MEMO AUDIT RISK_REGISTER ACTION_PLAN PPTX }
enum TimelineCategory { FUNDING HIRING ACQUISITION LAWSUIT LEADERSHIP REVENUE CONTRACT OTHER }
enum AuditAction { CREATE UPDATE DELETE LOGIN LOGOUT UPLOAD PROCESS SEARCH CHAT REPORT AGENT_RUN CONSENSUS SIMULATION }
```

## Tenancy

### User
- id, email (unique), name, passwordHash, image?, theme (dark|light), emailVerified?
- createdAt, updatedAt

### Organization
- id, name, slug (unique), description?, logoUrl?
- createdAt, updatedAt, deletedAt?

### OrganizationMember
- id, organizationId, userId, role (OrgRole)
- @@unique([organizationId, userId])

### Team
- id, organizationId, name, description?
- createdAt, updatedAt

### TeamMember
- id, teamId, userId
- @@unique([teamId, userId])

### Invite
- id, organizationId, email, role, token (unique), expiresAt, acceptedAt?, createdAt

### Workspace
- id, organizationId, name, slug, description?, teamId?
- createdAt, updatedAt, deletedAt?
- @@unique([organizationId, slug])

### Project
- id, workspaceId, name, slug, description?, type (ProjectType)
- targetCompany?, dealStatus?, tags (String[]), metadata (Json?)
- createdAt, updatedAt, deletedAt?
- @@unique([workspaceId, slug])

## Data Room

### Folder
- id, projectId, parentId?, name, path
- createdAt, updatedAt, deletedAt?
- Self-referential tree

### Document
- id, projectId, folderId?, name, originalName, mimeType, type (DocumentType)
- classification (DocumentClassification?), filePath, fileSize, pageCount?
- status (DocumentStatus), version (Int default 1), previousVersionId?
- contentHash?, duplicateOfId?, tags (String[])
- errorMessage?, processedAt?
- createdAt, updatedAt, deletedAt?
- @@index([projectId, folderId, deletedAt])

### DocumentVersion
- id, documentId, version, filePath, fileSize, uploadedById, createdAt

### DocumentChunk
- id, documentId, chunkIndex, content, tokenCount
- embedding (vector), searchVector (tsvector)?
- pageNumber?, sectionTitle?, metadata (Json?)
- createdAt
- @@unique([documentId, chunkIndex])

## Knowledge Graph

### Entity
- id, projectId, name, type, metadata (Json?)
- createdAt, updatedAt

### EntityRelation
- id, projectId, sourceEntityId, targetEntityId, relationType, confidence
- sourceChunkId?, createdAt

## AI Intelligence

### AgentRun
- id, projectId, agentType (AgentType), status, inputParams (Json?)
- output (Json), score (Float?), confidence (ConfidenceLevel?)
- citations (Json?), startedAt, completedAt?, error?

### ConsensusRun
- id, projectId, agentRunIds (String[]), finalRecommendation (Text)
- decisionConfidence (ConfidenceLevel), agreements (Json), conflicts (Json)
- resolutionRationale (Text), citations (Json?), createdAt

### Finding (unified agent output)
- id, projectId, agentType, agentRunId?, category, title, description
- severity?, score?, sourceChunkId?, documentId?, metadata (Json?)
- status (RiskStatus default OPEN), createdAt, updatedAt

### Contradiction
- id, projectId, subject, factType, valueA, valueB
- documentAId, chunkAId, documentBId, chunkBId
- explanation, severity, status (ContradictionStatus), createdAt

### MissingItem
- id, projectId, category, title, description, expectedType?
- framework?, followUpText?, status (MissingItemStatus), createdAt

### SimulationRun
- id, projectId, scenarioName, parameters (Json)
- baselineScores (Json), simulatedScores (Json), delta (Json)
- recommendation?, createdAt

## User Features

### Chat, ChatMessage
- Chat: id, projectId, userId, title?, agentType (ChatAgentType, default GENERAL), pinned, createdAt, updatedAt
- ChatMessage: id, chatId, role (ChatMessageRole), content, citations (Json?), confidence?, createdAt
- Chat `@@index([projectId, userId, updatedAt])`; ChatMessage `@@index([chatId, createdAt])`
- Both cascade with their parent; chat access is owner-scoped within the project organization

### SavedSearch
- id, projectId, userId, name, query, filters (Json), mode, createdAt

### Report
- id, projectId, userId, title, reportType (ReportType), content (Text)
- format?, filePath?, metadata (Json?), createdAt, updatedAt

### TimelineEvent
- id, projectId, title, description?, eventDate, category (TimelineCategory)
- sourceChunkId?, documentId?, isManual, createdAt, updatedAt
- @@index([projectId, eventDate])

### Task (Action Plan)
- id, projectId, title, description?, assigneeId?, status, priority
- dueDate?, impact?, findingId?, documentId?
- createdAt, updatedAt, deletedAt?

### Notification
- id, userId, type (NotificationType), title, body, link?, readAt?, archivedAt?, createdAt
- @@index([userId, readAt])
- @@index([userId, archivedAt])

### AuditLog
- id, organizationId, userId?, action (AuditAction), entityType, entityId?
- metadata (Json?), ipAddress?, createdAt

### SystemSetting
- id, key (unique), value (Json), updatedAt

## Indexes & Extensions

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE INDEX ON document_chunks USING gin(search_vector);
CREATE INDEX ON document_chunks USING ivfflat(embedding vector_cosine_ops);
```

## Soft Delete

Default `deletedAt: null` on: Organization, Workspace, Project, Document, Folder, Task.

## Relations Summary

```
User ←→ OrganizationMember, TeamMember, Notification
Organization → Team, Workspace, AuditLog, Invite
Workspace → Project
Project → Folder → Document → DocumentChunk
Project → Entity, EntityRelation, AgentRun, ConsensusRun, Finding
Project → Contradiction, MissingItem, SimulationRun
Project → Chat, SavedSearch, Report, TimelineEvent, Task
```

See [03-api-contracts.md](./03-api-contracts.md).
