import { Injectable, Logger, Inject, forwardRef, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PubSub, Subscription, Message } from '@google-cloud/pubsub';
import { MailService } from '../mail/mail.service';
import { SyncGateway } from './sync.gateway';

interface WatchState {
  historyId: string;
  expiration: number;
}

@Injectable()
export class SyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SyncService.name);
  private watchStates = new Map<string, WatchState>();
  private pubsub: PubSub;
  private subscription: Subscription | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    @Inject(forwardRef(() => SyncGateway))
    private readonly syncGateway: SyncGateway,
  ) {
    const projectId = this.configService.get<string>('gcp.projectId');
    this.pubsub = new PubSub({ projectId });
  }

  async onModuleInit() {
    await this.startPullSubscriber();
  }

  onModuleDestroy() {
    this.stopPullSubscriber();
  }

  /**
   * Start listening to the Pub/Sub pull subscription for Gmail notifications.
   */
  private async startPullSubscriber(): Promise<void> {
    const subscriptionName = this.configService.get<string>('gcp.pubsubSubscription');

    if (!subscriptionName) {
      this.logger.warn('No Pub/Sub subscription configured, skipping pull subscriber');
      return;
    }

    try {
      this.subscription = this.pubsub.subscription(subscriptionName);

      // Verify the subscription exists
      const [exists] = await this.subscription.exists();
      if (!exists) {
        this.logger.error(`Pub/Sub subscription "${subscriptionName}" does not exist`);
        return;
      }

      this.subscription.on('message', (message: Message) => {
        this.handlePubSubMessage(message);
      });

      this.subscription.on('error', (error) => {
        this.logger.error(`Pub/Sub subscription error: ${error.message}`);
      });

      this.logger.log(`📡 Listening on Pub/Sub subscription: ${subscriptionName}`);
    } catch (error) {
      this.logger.error(`Failed to start pull subscriber: ${error}`);
    }
  }

  private stopPullSubscriber(): void {
    if (this.subscription) {
      this.subscription.removeAllListeners();
      this.subscription.close();
      this.subscription = null;
      this.logger.log('Pub/Sub subscriber stopped');
    }
  }

  /**
   * Handle incoming Pub/Sub message from Gmail.
   */
  private async handlePubSubMessage(message: Message): Promise<void> {
    try {
      const data = JSON.parse(message.data.toString('utf-8'));
      const userEmail = data.emailAddress;
      const historyId = data.historyId;

      this.logger.log(`📬 Gmail notification for: ${userEmail} (historyId: ${historyId})`);

      // Acknowledge the message immediately to prevent redelivery
      message.ack();

      // Process the notification
      await this.processNotification(userEmail, historyId);
    } catch (error) {
      this.logger.error(`Failed to process Pub/Sub message: ${error}`);
      // Nack to retry later
      message.nack();
    }
  }

  async setupWatchForUser(userEmail: string): Promise<void> {
    try {
      const result = await this.mailService.setupWatch(userEmail);
      this.watchStates.set(userEmail, {
        historyId: result.historyId,
        expiration: parseInt(result.expiration, 10),
      });
      this.logger.log(`Watch setup for ${userEmail}, historyId: ${result.historyId}`);
    } catch (error) {
      this.logger.error(`Failed to setup watch for ${userEmail}: ${error}`);
    }
  }

  async processNotification(userEmail: string, historyId: string): Promise<void> {
    const watchState = this.watchStates.get(userEmail);
    if (!watchState) {
      this.logger.warn(`No watch state for ${userEmail}, skipping notification`);
      return;
    }

    try {
      const changes = await this.mailService.getHistoryChanges(
        userEmail,
        watchState.historyId,
      );

      // Fetch and send new emails
      for (const messageId of changes.newMessages) {
        const email = await this.mailService.getEmail(userEmail, messageId);
        this.syncGateway.sendNewEmail(userEmail, email);
      }

      // Update history ID
      this.watchStates.set(userEmail, {
        ...watchState,
        historyId: changes.historyId,
      });

      this.logger.log(`Processed ${changes.newMessages.length} new message(s) for ${userEmail}`);
    } catch (error) {
      this.logger.error(`Failed to process notification for ${userEmail}: ${error}`);
    }
  }

  getWatchState(userEmail: string): WatchState | undefined {
    return this.watchStates.get(userEmail);
  }

  setHistoryId(userEmail: string, historyId: string): void {
    const existing = this.watchStates.get(userEmail);
    if (existing) {
      existing.historyId = historyId;
    }
  }
}
