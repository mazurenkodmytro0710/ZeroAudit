import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../lib/dynamodb';
import type { AgentRun, EvidenceArtifact, Integration, Organization } from '../types/db';

export async function createOrganization(
  org: Omit<Organization, 'PK' | 'SK' | 'entityType' | 'createdAt' | 'updatedAt'>
): Promise<Organization> {
  const orgId = crypto.randomUUID();
  const now = new Date().toISOString();

  const item: Organization = {
    PK: `ORG#${orgId}`,
    SK: 'METADATA',
    entityType: 'ORGANIZATION',
    createdAt: now,
    updatedAt: now,
    ...org,
  };

  try {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
        ConditionExpression: 'attribute_not_exists(PK)',
      })
    );
  } catch (e) {
    throw new Error(`[createOrganization] DynamoDB error: ${(e as Error).message}`);
  }

  return item;
}

export async function saveIntegration(
  integration: Omit<Integration, 'entityType' | 'createdAt' | 'updatedAt'>
): Promise<Integration> {
  const now = new Date().toISOString();

  const item: Integration = {
    ...integration,
    entityType: 'INTEGRATION',
    createdAt: now,
    updatedAt: now,
  };

  try {
    await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
  } catch (e) {
    throw new Error(`[saveIntegration] DynamoDB error: ${(e as Error).message}`);
  }

  return item;
}

export async function saveEvidenceArtifact(
  artifact: Omit<EvidenceArtifact, 'entityType' | 'createdAt' | 'updatedAt'>
): Promise<EvidenceArtifact> {
  const now = new Date().toISOString();

  const item: EvidenceArtifact = {
    ...artifact,
    entityType: 'EVIDENCE_ARTIFACT',
    createdAt: now,
    updatedAt: now,
  };

  try {
    await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
  } catch (e) {
    throw new Error(`[saveEvidenceArtifact] DynamoDB error: ${(e as Error).message}`);
  }

  return item;
}

export async function getEvidenceByControl(
  orgId: string,
  controlId: string
): Promise<EvidenceArtifact[]> {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :gsi1pk',
        ExpressionAttributeValues: {
          ':gsi1pk': `ORG#${orgId}#CONTROL#${controlId}`,
        },
      })
    );

    return (result.Items ?? []) as EvidenceArtifact[];
  } catch (e) {
    throw new Error(`[getEvidenceByControl] DynamoDB error: ${(e as Error).message}`);
  }
}

export async function getGapsByOrg(orgId: string): Promise<EvidenceArtifact[]> {
  const queryByStatus = (status: 'missing' | 'partial') =>
    docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI2',
        KeyConditionExpression: 'GSI2PK = :gsi2pk',
        ExpressionAttributeValues: {
          ':gsi2pk': `ORG#${orgId}#STATUS#${status}`,
        },
      })
    );

  try {
    const [missing, partial] = await Promise.all([
      queryByStatus('missing'),
      queryByStatus('partial'),
    ]);

    return [
      ...((missing.Items ?? []) as EvidenceArtifact[]),
      ...((partial.Items ?? []) as EvidenceArtifact[]),
    ];
  } catch (e) {
    throw new Error(`[getGapsByOrg] DynamoDB error: ${(e as Error).message}`);
  }
}

export async function createAgentRun(orgId: string, runId: string): Promise<AgentRun> {
  const now = new Date().toISOString();

  const item: AgentRun = {
    PK: `ORG#${orgId}`,
    SK: `AGENTRUN#${runId}`,
    entityType: 'AGENT_RUN',
    status: 'running',
    controlsProcessed: 0,
    gapsFound: 0,
    agentMemory: '{}',
    createdAt: now,
    updatedAt: now,
  };

  try {
    await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
  } catch (e) {
    throw new Error(`[createAgentRun] DynamoDB error: ${(e as Error).message}`);
  }

  return item;
}

export async function updateAgentRun(
  orgId: string,
  runId: string,
  updates: Partial<Pick<AgentRun, 'status' | 'controlsProcessed' | 'gapsFound' | 'agentMemory'>>
): Promise<void> {
  const now = new Date().toISOString();

  const setParts: string[] = ['#updatedAt = :updatedAt'];
  const ExpressionAttributeNames: Record<string, string> = { '#updatedAt': 'updatedAt' };
  const ExpressionAttributeValues: Record<string, unknown> = { ':updatedAt': now };

  for (const [key, value] of Object.entries(updates) as [keyof typeof updates, unknown][]) {
    if (value !== undefined) {
      setParts.push(`#${key} = :${key}`);
      ExpressionAttributeNames[`#${key}`] = key;
      ExpressionAttributeValues[`:${key}`] = value;
    }
  }

  try {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `ORG#${orgId}`, SK: `AGENTRUN#${runId}` },
        UpdateExpression: `SET ${setParts.join(', ')}`,
        ExpressionAttributeNames,
        ExpressionAttributeValues,
      })
    );
  } catch (e) {
    throw new Error(`[updateAgentRun] DynamoDB error: ${(e as Error).message}`);
  }
}

export async function getAgentRun(orgId: string, runId: string): Promise<AgentRun | null> {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: `ORG#${orgId}`, SK: `AGENTRUN#${runId}` },
      })
    );
    return (result.Item as AgentRun) ?? null;
  } catch (e) {
    throw new Error(`[getAgentRun] DynamoDB error: ${(e as Error).message}`);
  }
}

export async function getAllEvidenceByOrg(orgId: string): Promise<EvidenceArtifact[]> {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        ExpressionAttributeValues: {
          ':pk': `ORG#${orgId}`,
          ':prefix': 'EVIDENCE#',
        },
      })
    )
    return (result.Items ?? []) as EvidenceArtifact[]
  } catch (e) {
    throw new Error(`[getAllEvidenceByOrg] DynamoDB error: ${(e as Error).message}`)
  }
}

export async function getIntegrationsByOrg(orgId: string): Promise<Integration[]> {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
        ExpressionAttributeValues: {
          ':pk': `ORG#${orgId}`,
          ':skPrefix': 'INTEGRATION#',
        },
      })
    );
    return (result.Items ?? []) as Integration[];
  } catch (e) {
    throw new Error(`[getIntegrationsByOrg] DynamoDB error: ${(e as Error).message}`);
  }
}
