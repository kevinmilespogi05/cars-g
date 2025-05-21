import { queryClient } from './queryClient';

interface QueuedOperation {
  id: string;
  timestamp: number;
  queryKey: string[];
  operation: 'create' | 'update' | 'delete';
  endpoint: string;
  data?: any;
}

class BackgroundSync {
  private static instance: BackgroundSync;
  private operationQueue: QueuedOperation[] = [];
  private isProcessing = false;
  private storageKey = 'background_sync_queue';

  private constructor() {
    this.loadQueue();
    window.addEventListener('online', this.processQueue.bind(this));
  }

  public static getInstance(): BackgroundSync {
    if (!BackgroundSync.instance) {
      BackgroundSync.instance = new BackgroundSync();
    }
    return BackgroundSync.instance;
  }

  private loadQueue(): void {
    const savedQueue = localStorage.getItem(this.storageKey);
    if (savedQueue) {
      this.operationQueue = JSON.parse(savedQueue);
    }
  }

  private saveQueue(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.operationQueue));
  }

  public async queueOperation(
    queryKey: string[],
    operation: 'create' | 'update' | 'delete',
    endpoint: string,
    data?: any
  ): Promise<void> {
    const queuedOperation: QueuedOperation = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      queryKey,
      operation,
      endpoint,
      data,
    };

    this.operationQueue.push(queuedOperation);
    this.saveQueue();

    // Optimistically update the cache
    await this.updateQueryCache(queuedOperation);

    if (navigator.onLine) {
      this.processQueue();
    }
  }

  private async updateQueryCache(operation: QueuedOperation): Promise<void> {
    const queryData = queryClient.getQueryData(operation.queryKey);

    if (!queryData) return;

    switch (operation.operation) {
      case 'create':
        if (Array.isArray(queryData)) {
          queryClient.setQueryData(operation.queryKey, [...queryData, operation.data]);
        }
        break;
      case 'update':
        if (Array.isArray(queryData)) {
          queryClient.setQueryData(operation.queryKey, 
            queryData.map(item => 
              item.id === operation.data.id ? operation.data : item
            )
          );
        }
        break;
      case 'delete':
        if (Array.isArray(queryData)) {
          queryClient.setQueryData(operation.queryKey,
            queryData.filter(item => item.id !== operation.data.id)
          );
        }
        break;
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || !navigator.onLine || this.operationQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const operations = [...this.operationQueue];
      this.operationQueue = [];
      this.saveQueue();

      await Promise.all(
        operations.map(async (operation) => {
          try {
            await this.executeOperation(operation);
          } catch (error) {
            console.error(`Failed to process operation: ${operation.id}`, error);
            // Re-queue failed operations
            this.operationQueue.push(operation);
          }
        })
      );

      if (this.operationQueue.length > 0) {
        this.saveQueue();
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async executeOperation(operation: QueuedOperation): Promise<void> {
    const { endpoint, data, operation: type } = operation;

    switch (type) {
      case 'create':
        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        break;
      case 'update':
        await fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        break;
      case 'delete':
        await fetch(endpoint, { method: 'DELETE' });
        break;
    }

    // Invalidate related queries to refetch fresh data
    await queryClient.invalidateQueries({ queryKey: operation.queryKey });
  }
}

export const backgroundSync = BackgroundSync.getInstance(); 