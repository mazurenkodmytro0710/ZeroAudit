export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { CloudTrailClient, LookupEventsCommand } from '@aws-sdk/client-cloudtrail'
import { CloudWatchClient, GetMetricStatisticsCommand } from '@aws-sdk/client-cloudwatch'
import { logger } from '@/lib/logger'

export async function GET(_req: NextRequest) {
  const region = process.env.AWS_REGION ?? 'eu-north-1'

  const cloudtrail = new CloudTrailClient({
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  })

  const cloudwatch = new CloudWatchClient({
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  })

  const since = new Date()
  since.setDate(since.getDate() - 90)

  logger.info('AWS: fetching CloudTrail + CloudWatch evidence')

  const results: Record<string, unknown> = {}

  try {
    const [iamEvents, loginEvents, s3Events] = await Promise.all([
      cloudtrail.send(new LookupEventsCommand({
        StartTime: since,
        EndTime: new Date(),
        LookupAttributes: [{ AttributeKey: 'EventSource', AttributeValue: 'iam.amazonaws.com' }],
        MaxResults: 50,
      })),
      cloudtrail.send(new LookupEventsCommand({
        StartTime: since,
        EndTime: new Date(),
        LookupAttributes: [{ AttributeKey: 'EventName', AttributeValue: 'ConsoleLogin' }],
        MaxResults: 50,
      })),
      cloudtrail.send(new LookupEventsCommand({
        StartTime: since,
        EndTime: new Date(),
        LookupAttributes: [{ AttributeKey: 'EventSource', AttributeValue: 's3.amazonaws.com' }],
        MaxResults: 50,
      })),
    ])

    const iamList = iamEvents.Events ?? []
    const loginList = loginEvents.Events ?? []

    const mfaLogins = loginList.filter((e) => {
      try {
        const detail = JSON.parse(e.CloudTrailEvent ?? '{}')
        return detail.additionalEventData?.MFAUsed === 'Yes'
      } catch { return false }
    })

    const userCreations = iamList.filter((e) => e.EventName === 'CreateUser')
    const userDeletions = iamList.filter((e) => e.EventName === 'DeleteUser')
    const policyChanges = iamList.filter((e) =>
      ['AttachUserPolicy', 'DetachUserPolicy', 'PutUserPolicy'].includes(e.EventName ?? '')
    )

    results.cloudtrail = {
      iamEventsTotal: iamList.length,
      userCreations: userCreations.length,
      userDeletions: userDeletions.length,
      policyChanges: policyChanges.length,
      consoleLogins: loginList.length,
      mfaLogins: mfaLogins.length,
      mfaPercentage: loginList.length > 0
        ? Math.round((mfaLogins.length / loginList.length) * 100)
        : 100,
      s3Events: (s3Events.Events ?? []).length,
      recentIamEvents: iamList.slice(0, 5).map((e) => ({
        name: e.EventName,
        user: e.Username,
        time: e.EventTime,
      })),
    }

    logger.info('AWS CloudTrail: fetched', results.cloudtrail as Record<string, unknown>)
  } catch (err) {
    logger.error('AWS CloudTrail: failed', { error: String(err) })
    results.cloudtrail = null
  }

  try {
    const endTime = new Date()
    const startTime = new Date()
    startTime.setDate(startTime.getDate() - 30)

    const dynamoErrors = await cloudwatch.send(new GetMetricStatisticsCommand({
      Namespace: 'AWS/DynamoDB',
      MetricName: 'SystemErrors',
      StartTime: startTime,
      EndTime: endTime,
      Period: 86400,
      Statistics: ['Sum'],
      Dimensions: [{ Name: 'TableName', Value: process.env.DYNAMODB_TABLE_NAME ?? 'soc2-autopilot' }],
    }))

    const successfulRequests = await cloudwatch.send(new GetMetricStatisticsCommand({
      Namespace: 'AWS/DynamoDB',
      MetricName: 'SuccessfulRequestLatency',
      StartTime: startTime,
      EndTime: endTime,
      Period: 86400,
      Statistics: ['Average'],
      Dimensions: [
        { Name: 'TableName', Value: process.env.DYNAMODB_TABLE_NAME ?? 'soc2-autopilot' },
        { Name: 'Operation', Value: 'PutItem' },
      ],
    }))

    const errorPoints = dynamoErrors.Datapoints ?? []
    const totalErrors = errorPoints.reduce((sum, p) => sum + (p.Sum ?? 0), 0)
    const latencyPoints = successfulRequests.Datapoints ?? []
    const avgLatency = latencyPoints.length > 0
      ? (latencyPoints.reduce((sum, p) => sum + (p.Average ?? 0), 0) / latencyPoints.length).toFixed(2)
      : null

    results.cloudwatch = {
      dynamoSystemErrors30d: totalErrors,
      avgLatencyMs: avgLatency,
      dataPointsCollected: latencyPoints.length,
      monitoringEnabled: true,
    }

    logger.info('AWS CloudWatch: fetched', results.cloudwatch as Record<string, unknown>)
  } catch (err) {
    logger.error('AWS CloudWatch: failed', { error: String(err) })
    results.cloudwatch = null
  }

  return NextResponse.json({ evidence: results })
}
