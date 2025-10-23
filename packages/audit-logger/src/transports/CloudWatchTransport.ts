import {
  CloudWatchLogsClient,
  PutLogEventsCommand,
  CreateLogStreamCommand,
  DescribeLogStreamsCommand,
} from '@aws-sdk/client-cloudwatch-logs';

import { ITransport } from './ITransport';

/**
 * AWS CloudWatch Logs transport
 */
export class CloudWatchTransport implements ITransport {
  private client: CloudWatchLogsClient;
  private sequenceToken: string | undefined;

  constructor(
    private config: {
      region: string;
      logGroupName: string;
      logStreamName: string;
      accessKeyId?: string;
      secretAccessKey?: string;
    }
  ) {
    const clientConfig: any = {
      region: config.region,
    };

    if (config.accessKeyId && config.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      };
    }

    this.client = new CloudWatchLogsClient(clientConfig);
  }

  async initialize(): Promise<void> {
    // Check if log stream exists, create if not
    try {
      const command = new DescribeLogStreamsCommand({
        logGroupName: this.config.logGroupName,
        logStreamNamePrefix: this.config.logStreamName,
      });

      const response = await this.client.send(command);
      const stream = response.logStreams?.find(
        (s) => s.logStreamName === this.config.logStreamName
      );

      if (stream) {
        this.sequenceToken = stream.uploadSequenceToken;
      } else {
        // Create log stream
        await this.createLogStream();
      }
    } catch (error) {
      // Log group might not exist - attempt to create log stream anyway
      await this.createLogStream();
    }
  }

  async write(formattedEvent: string): Promise<void> {
    const command = new PutLogEventsCommand({
      logGroupName: this.config.logGroupName,
      logStreamName: this.config.logStreamName,
      logEvents: [
        {
          timestamp: Date.now(),
          message: formattedEvent,
        },
      ],
      sequenceToken: this.sequenceToken,
    });

    try {
      const response = await this.client.send(command);
      this.sequenceToken = response.nextSequenceToken;
    } catch (error: any) {
      // Handle sequence token mismatch
      if (error.name === 'InvalidSequenceTokenException') {
        // Extract expected token from error and retry
        const expectedToken = error.expectedSequenceToken;
        this.sequenceToken = expectedToken;

        const retryCommand = new PutLogEventsCommand({
          ...command.input,
          sequenceToken: expectedToken,
        });

        const response = await this.client.send(retryCommand);
        this.sequenceToken = response.nextSequenceToken;
      } else {
        throw error;
      }
    }
  }

  async close(): Promise<void> {
    this.client.destroy();
  }

  private async createLogStream(): Promise<void> {
    const command = new CreateLogStreamCommand({
      logGroupName: this.config.logGroupName,
      logStreamName: this.config.logStreamName,
    });

    await this.client.send(command);
  }
}
