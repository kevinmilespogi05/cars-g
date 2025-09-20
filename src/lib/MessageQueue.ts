import { ChatMessage } from '../types';

interface QueuedMessage {
  id: string;
  conversationId: string;
  content: string;
  messageType: string;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

class MessageQueue {
  private queue: QueuedMessage[] = [];
  private processing = false;
  private maxQueueSize = 100;
  private retryDelay = 1000; // 1 second
  private maxRetryDelay = 10000; // 10 seconds

  constructor(
    private onSendMessage: (message: QueuedMessage) => Promise<boolean>,
    private onMessageSent: (messageId: string) => void,
    private onMessageFailed: (messageId: string, error: string) => void
  ) {}

  addMessage(
    id: string,
    conversationId: string,
    content: string,
    messageType: string = 'text'
  ): void {
    // Prevent queue overflow
    if (this.queue.length >= this.maxQueueSize) {
      const oldestMessage = this.queue.shift();
      if (oldestMessage) {
        this.onMessageFailed(oldestMessage.id, 'Queue overflow');
      }
    }

    const message: QueuedMessage = {
      id,
      conversationId,
      content,
      messageType,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: 3
    };

    this.queue.push(message);
    this.processQueue();
  }

  removeMessage(messageId: string): void {
    this.queue = this.queue.filter(msg => msg.id !== messageId);
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const message = this.queue[0];
      
      try {
        const success = await this.onSendMessage(message);
        
        if (success) {
          this.queue.shift();
          this.onMessageSent(message.id);
        } else {
          await this.handleFailedMessage(message);
        }
      } catch (error) {
        await this.handleFailedMessage(message, error instanceof Error ? error.message : 'Unknown error');
      }
    }

    this.processing = false;
  }

  private async handleFailedMessage(message: QueuedMessage, error?: string): Promise<void> {
    message.retryCount++;

    if (message.retryCount >= message.maxRetries) {
      this.queue.shift();
      this.onMessageFailed(message.id, error || 'Max retries exceeded');
      return;
    }

    // Exponential backoff
    const delay = Math.min(
      this.retryDelay * Math.pow(2, message.retryCount - 1),
      this.maxRetryDelay
    );

    await new Promise(resolve => setTimeout(resolve, delay));
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  getQueueStatus(): { size: number; processing: boolean } {
    return {
      size: this.queue.length,
      processing: this.processing
    };
  }

  clearQueue(): void {
    this.queue = [];
  }
}

export { MessageQueue, QueuedMessage };
