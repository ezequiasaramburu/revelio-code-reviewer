import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class RevelioStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Phase 7 will flesh this out with:
    // - API Gateway + Lambda for the webhook
    // - SQS review queue + DLQ
    // - ECS Fargate worker service
    // - SSM Parameter Store for secrets
    // - IAM roles and CloudWatch log groups
  }
}

