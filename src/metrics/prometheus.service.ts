import { Injectable } from '@nestjs/common';
import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class PrometheusService {
  private readonly httpRequestTotal: Counter<string>;
  private readonly httpRequestDuration: Histogram<string>;
  private readonly activeConnections: Gauge<string>;
  private readonly kafkaMessages: Counter<string>;

  constructor() {
    // Collect default metrics
    collectDefaultMetrics({ register });

    // Custom metrics
    this.httpRequestTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [register],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route'],
      buckets: [0.1, 0.5, 1, 2, 5],
      registers: [register],
    });

    this.activeConnections = new Gauge({
      name: 'active_connections',
      help: 'Number of active connections',
      registers: [register],
    });

    this.kafkaMessages = new Counter({
      name: 'kafka_messages_total',
      help: 'Total number of Kafka messages processed',
      labelNames: ['topic', 'status'],
      registers: [register],
    });
  }

  incrementHttpRequests(method: string, route: string, statusCode: number) {
    this.httpRequestTotal.inc({
      method,
      route,
      status_code: statusCode.toString(),
    });
  }

  observeHttpDuration(method: string, route: string, duration: number) {
    this.httpRequestDuration.observe(
      { method, route },
      duration,
    );
  }

  setActiveConnections(count: number) {
    this.activeConnections.set(count);
  }

  incrementKafkaMessages(topic: string, status: 'success' | 'error') {
    this.kafkaMessages.inc({ topic, status });
  }

  async getMetrics(): Promise<string> {
    return register.metrics();
  }
}