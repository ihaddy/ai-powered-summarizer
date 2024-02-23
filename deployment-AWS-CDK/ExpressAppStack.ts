import * as cdk from '@aws-cdk/core';
import * as ecsPatterns from '@aws-cdk/aws-ecs-patterns';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecs from '@aws-cdk/aws-ecs';
import * as dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file

export class ExpressAppStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, vpc: ec2.IVpc, props?: cdk.StackProps) {
    super(scope, id, props);

    // Read DNS names from environment variables
    const mongoDnsName = process.env.MONGO_DNS_NAME!;
    const redisDnsName = process.env.REDIS_DNS_NAME!;
    const rabbitMqDnsName = process.env.RABBITMQ_DNS_NAME!;

    // Create a Fargate service for Express App
    new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'ExpressAppService', {
      vpc,
      taskImageOptions: {
        image: ecs.ContainerImage.fromAsset('./server'),
        environment: {
          MONGODB_URI: `mongodb://${mongoDnsName}:27017/AIsummarizer`,
          REDISHOST: `${redisDnsName}:6379`,
          RABBITMQ_URL: `amqp://${rabbitMqDnsName}`
        }
      },
      memoryLimitMiB: 512,
      desiredCount: 1,
      listenerPort: 3002
    });
  }
}
