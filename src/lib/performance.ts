import { webVitals } from '@vercel/analytics';

interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metricsBuffer: PerformanceMetric[] = [];
  private readonly bufferSize = 100;
  private readonly flushInterval = 5000; // 5 seconds

  private constructor() {
    this.setupWebVitals();
    this.setupPerformanceObserver();
    this.setupFlushInterval();
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private setupWebVitals(): void {
    webVitals.track((metric) => {
      this.addMetric({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
      });
    });
  }

  private setupPerformanceObserver(): void {
    if (typeof window === 'undefined') return;

    // Observe long tasks
    const longTaskObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        this.addMetric({
          name: 'long-task',
          value: entry.duration,
          rating: entry.duration > 100 ? 'poor' : 'needs-improvement',
          delta: entry.duration,
        });
      });
    });

    // Observe resource timing
    const resourceObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.initiatorType === 'fetch' || entry.initiatorType === 'xmlhttprequest') {
          this.addMetric({
            name: `api-${entry.name}`,
            value: entry.duration,
            rating: entry.duration > 1000 ? 'poor' : entry.duration > 500 ? 'needs-improvement' : 'good',
            delta: entry.duration,
          });
        }
      });
    });

    try {
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      resourceObserver.observe({ entryTypes: ['resource'] });
    } catch (error) {
      console.error('Performance observer setup failed:', error);
    }
  }

  private setupFlushInterval(): void {
    setInterval(() => this.flushMetrics(), this.flushInterval);
  }

  private addMetric(metric: PerformanceMetric): void {
    this.metricsBuffer.push(metric);
    
    if (this.metricsBuffer.length >= this.bufferSize) {
      this.flushMetrics();
    }
  }

  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;

    const metrics = [...this.metricsBuffer];
    this.metricsBuffer = [];

    try {
      await fetch('/api/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ metrics }),
      });
    } catch (error) {
      console.error('Failed to send metrics:', error);
      // Re-add failed metrics to the buffer
      this.metricsBuffer = [...metrics, ...this.metricsBuffer].slice(0, this.bufferSize);
    }
  }

  public trackCustomMetric(name: string, value: number): void {
    this.addMetric({
      name,
      value,
      rating: 'good', // Custom metrics default to 'good'
      delta: value,
    });
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance(); 