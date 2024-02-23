import * as cdk from '@aws-cdk/core';
import { VpcStack } from './VpcStack';
import { RedisStack } from './RedisStack';
import { MongoStack } from './MongoStack';
import { RabbitMQStack } from './RabbitMQStack';
import { ExpressAppStack } from './ExpressAppStack';
import { WorkerStack } from './WorkerStack';

export class MyStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create VPC
    const vpcStack = new VpcStack(this, 'VpcStack');

    // Create Redis Service
    new RedisStack(this, 'RedisStack', vpcStack.vpc);

    // Create MongoDB Service
    new MongoStack(this, 'MongoStack', vpcStack.vpc);

    // Create RabbitMQ Service
    new RabbitMQStack(this, 'RabbitMQStack', vpcStack.vpc);

    // Create Express App Service
    new ExpressAppStack(this, 'ExpressAppStack', vpcStack.vpc);

    // Create Worker Service
    new WorkerStack(this, 'WorkerStack', vpcStack.vpc);
  }
}
