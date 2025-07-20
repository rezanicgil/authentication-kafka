import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsController } from './metrics.controller';
import { PrometheusService } from './prometheus.service';
import { MetricsInterceptor } from './metrics.interceptor';

@Module({
  controllers: [MetricsController],
  providers: [
    PrometheusService,
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
  exports: [PrometheusService],
})
export class MetricsModule {}
