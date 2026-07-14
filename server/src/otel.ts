/**
 * OpenTelemetry Setup
 * Initializes OTel SDK for distributed tracing and metrics.
 * Falls back gracefully when OTEL_EXPORTER_OTLP_ENDPOINT is not set.
 */
import { logger } from './logger';

let tracerProvider: any = null;
let meterProvider: any = null;

export function initOpenTelemetry() {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) {
    logger.info('[OTEL] No OTEL_EXPORTER_OTLP_ENDPOINT set — tracing disabled');
    return;
  }

  try {
    const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
    const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
    const { Resource } = require('@opentelemetry/resources');
    const { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } = require('@opentelemetry/semantic-conventions');
    const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');

    const resource = new Resource({
      [ATTR_SERVICE_NAME]: 'yemen-telecom-api',
      [ATTR_SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
      'deployment.environment': process.env.NODE_ENV || 'development',
    });

    const traceExporter = new OTLPTraceExporter({
      url: `${endpoint}/v1/traces`,
      headers: process.env.OTEL_EXPORTER_OTLP_HEADERS
        ? Object.fromEntries(
            process.env.OTEL_EXPORTER_OTLP_HEADERS.split(',').map((h) => h.split('='))
          )
        : {},
    });

    tracerProvider = new NodeTracerProvider({
      resource,
      spanProcessors: [new BatchSpanProcessor(traceExporter)],
    });
    tracerProvider.register();

    logger.info(`[OTEL] Tracing initialized → ${endpoint}`);
  } catch (err: any) {
    logger.warn(`[OTEL] Failed to initialize tracing: ${err.message}`);
  }
}

export function initMetrics() {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) return;

  try {
    const { MeterProvider } = require('@opentelemetry/sdk-metrics');
    const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
    const { Resource } = require('@opentelemetry/resources');
    const { ATTR_SERVICE_NAME } = require('@opentelemetry/semantic-conventions');
    const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');

    const resource = new Resource({
      [ATTR_SERVICE_NAME]: 'yemen-telecom-api',
    });

    const metricExporter = new OTLPMetricExporter({
      url: `${endpoint}/v1/metrics`,
    });

    meterProvider = new MeterProvider({
      resource,
      readers: [
        new PeriodicExportingMetricReader({
          exporter: metricExporter,
          exportIntervalMillis: 30000,
        }),
      ],
    });

    logger.info(`[OTEL] Metrics initialized → ${endpoint}`);
  } catch (err: any) {
    logger.warn(`[OTEL] Failed to initialize metrics: ${err.message}`);
  }
}

export function getTracer() {
  if (!tracerProvider) return null;
  try {
    const { trace } = require('@opentelemetry/api');
    return trace.getTracer('yemen-telecom-api');
  } catch {
    return null;
  }
}

export function getMeter() {
  if (!meterProvider) return null;
  try {
    const { metrics } = require('@opentelemetry/api');
    return metrics.getMeter('yemen-telecom-api');
  } catch {
    return null;
  }
}
