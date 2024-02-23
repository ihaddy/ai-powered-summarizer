import * as cdk from '@aws-cdk/core';
import * as ecsPatterns from '@aws-cdk/aws-ecs-patterns';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecs from '@aws-cdk/aws-ecs';

export class RedisStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, vpc: ec2.IVpc, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a Fargate service for Redis
    new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'RedisService', {
      vpc,
      taskImageOptions: {
        image: ecs.ContainerImage.fromRegistry('redis:latest')
      },
      memoryLimitMiB: 512,
      desiredCount: 1,
      listenerPort: 6379
    });
  }
}
