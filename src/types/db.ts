// Single-table design — everything in one DynamoDB table.
// Spent a good chunk of time on this schema. The key insight was
// that all queries are always scoped to an org, so ORG#<orgId>
// as PK naturally isolates tenant data without extra filtering.

// GSI1: ORG#orgId#CONTROL#controlId / collectedAt
// → "give me all CC6.1 evidence sorted by time"
//
// GSI2: ORG#orgId#STATUS#coverageStatus / controlId
// → "give me all missing controls for this org"
//
// Tried putting status in a different attribute first but you can't
// filter on non-key attributes efficiently in DynamoDB without GSI.

interface BaseEntity {
  PK: string;
  SK: string;
  entityType: string;
  createdAt: string;
  updatedAt: string;
}

export interface Organization extends BaseEntity {
  entityType: 'ORGANIZATION';
  orgName: string;
  plan: 'starter' | 'pro';
  auditPeriodStart: string;
  auditPeriodEnd: string;
}

export interface Integration extends BaseEntity {
  entityType: 'INTEGRATION';
  provider: 'github' | 'jira' | 'okta';
  encryptedAccessToken: string;
  status: 'active' | 'error';
  lastSyncAt: string;
  GSI1PK: string;
  GSI1SK: string;
}

export interface EvidenceArtifact extends BaseEntity {
  entityType: 'EVIDENCE_ARTIFACT';
  controlId: string;
  artifactType: 'commit' | 'pr' | 'log' | 'policy';
  sourceUrl: string;
  rawData: string;
  aiClassification: string;
  coverageStatus: 'covered' | 'partial' | 'missing';
  collectedAt: string;
  expiresAt: string;
  GSI1PK: string;
  GSI1SK: string;
  GSI2PK: string;
  GSI2SK: string;
}

export interface AgentRun extends BaseEntity {
  entityType: 'AGENT_RUN';
  status: 'running' | 'completed' | 'failed';
  controlsProcessed: number;
  gapsFound: number;
  agentMemory: string;
}
