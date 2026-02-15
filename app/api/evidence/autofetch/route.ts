import { NextRequest, NextResponse } from "next/server";
import { assertTenantAccess } from "@/app/utils/tenantIsolation";

const CLOUDTRAIL_UNAUTHORIZED_EVENTS = [
  {
    eventVersion: "1.08",
    eventSource: "iam.amazonaws.com",
    eventName: "AssumeRole",
    awsRegion: "us-east-1",
    eventTime: "2026-02-14T18:21:44Z",
    userIdentity: {
      type: "IAMUser",
      arn: "arn:aws:iam::123456789012:user/devops-automation",
      accountId: "123456789012",
      userName: "devops-automation",
    },
    sourceIPAddress: "203.0.113.41",
    userAgent: "aws-cli/2.15.0",
    errorCode: "AccessDenied",
    errorMessage: "Unauthorized Access Denied",
    requestParameters: {
      roleArn: "arn:aws:iam::123456789012:role/ProductionSecurityRole",
    },
  },
  {
    eventVersion: "1.08",
    eventSource: "s3.amazonaws.com",
    eventName: "GetObject",
    awsRegion: "us-west-2",
    eventTime: "2026-02-14T18:24:09Z",
    userIdentity: {
      type: "AssumedRole",
      arn: "arn:aws:sts::123456789012:assumed-role/ci-agent/session-4421",
      accountId: "123456789012",
      userName: "ci-agent",
    },
    sourceIPAddress: "198.51.100.22",
    userAgent: "aws-sdk-js/3.x",
    errorCode: "AccessDenied",
    errorMessage: "Unauthorized Access Denied",
    requestParameters: {
      bucketName: "prod-sensitive-audit-logs",
      key: "vaultbank/2026/02/14/ledger-export.json",
    },
  },
];

export async function GET(request: NextRequest) {
  const activeTenantUuid = request.headers.get("x-tenant-id");
  const targetTenantUuidFromHeader = request.headers.get("x-target-tenant-id");
  const targetTenantUuidFromQuery = request.nextUrl.searchParams.get("tenantUuid");
  const targetTenantUuid = targetTenantUuidFromHeader ?? targetTenantUuidFromQuery;

  if (targetTenantUuid && !assertTenantAccess(activeTenantUuid, targetTenantUuid)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Tenant isolation violation: cross-tenant evidence fetch blocked.",
      },
      { status: 403 },
    );
  }

  return NextResponse.json({
    ok: true,
    source: "Simulated AWS CloudTrail",
    pingedAt: new Date().toISOString(),
    filter: "Unauthorized Access Denied",
    events: CLOUDTRAIL_UNAUTHORIZED_EVENTS,
  });
}
