#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { RevelioStack } from './revelio-stack';

const app = new cdk.App();

// In a real deployment, you might pass env or context here.
// For now, we keep it minimal as the CDK stack is the deliverable.
new RevelioStack(app, 'RevelioStack', {});

