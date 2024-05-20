import * as cdk from '@aws-cdk/core';
import * as ecsPatterns from '@aws-cdk/aws-ecs-patterns';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecs from '@aws-cdk/aws-ecs';

export class RabbitMQStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, vpc: ec2.IVpc, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a Fargate service for RabbitMQ
    new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'RabbitMQService', {
      vpc,
      taskImageOptions: {
        image: ecs.ContainerImage.fromRegistry('rabbitmq:3-management')
      },
      memoryLimitMiB: 512,
      desiredCount: 1,
      listenerPort: 15672
    });
  }
}
