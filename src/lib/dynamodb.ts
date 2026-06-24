import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// I went back and forth on whether to use a single DocumentClient instance
// or create one per request. Chose singleton because Lambda cold starts
// were adding ~200ms on every API call during testing. Not perfect but
// good enough for now.
const client = new DynamoDBClient({
  // eu-north-1 specifically because that's where my DynamoDB table is —
  // learned the hard way that if region doesn't match you get a generic
  // "ResourceNotFoundException" with no helpful message
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
  },
});

export const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME!;
