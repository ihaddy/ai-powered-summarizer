import * as cdk from '@aws-cdk/core';
import * as ecsPatterns from '@aws-cdk/aws-ecs-patterns';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecs from '@aws-cdk/aws-ecs';

export class WorkerStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, vpc: ec2.IVpc, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a Fargate service for Worker
    new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'WorkerService', {
      vpc,
      taskImageOptions: {
        image: ecs.ContainerImage.fromAsset('./worker'),
        environment: {
          RABBITMQ_URL: 'amqp://rabbitmq'
        }
      },
      memoryLimitMiB: 512, // Adjust based on requirements
      desiredCount: 1, // Adjust based on requirements
      listenerPort: 80
    });
  }
}
