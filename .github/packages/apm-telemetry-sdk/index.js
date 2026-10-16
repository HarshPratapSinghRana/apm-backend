/**
 * Company APM OpenTelemetry Telemetry SDK
 * Conforms to W3C Trace Context Specification (REC-trace-context)
 * Source: OpenTelemetry JS / W3C Distributed Tracing
 */

const crypto = require('crypto');

class ApmSpan {
  constructor(name, context = {}) {
    this.name = name;
    this.traceId = context.traceId || crypto.randomBytes(16).toString('hex');
    this.spanId = crypto.randomBytes(8).toString('hex');
    this.parentSpanId = context.parentSpanId || null;
    this.startTime = Date.now();
    this.attributes = { ...context.attributes };
    this.events = [];
    this.status = { code: 'UNSET' };
  }

  setAttribute(key, value) {
    this.attributes[key] = value;
    return this;
  }

  addEvent(name, attributes = {}) {
    this.events.push({ name, time: Date.now(), attributes });
    return this;
  }

  setStatus(code, message = '') {
    this.status = { code, message };
    return this;
  }

  end() {
    this.endTime = Date.now();
    this.durationMs = this.endTime - this.startTime;
    return this;
  }

  toTraceParent() {
    // Format: 00-{traceId}-{spanId}-01
    return `00-${this.traceId}-${this.spanId}-01`;
  }
}

class ApmTracer {
  constructor(serviceName, options = {}) {
    this.serviceName = serviceName;
    this.options = options;
  }

  startSpan(name, options = {}) {
    const span = new ApmSpan(name, {
      ...options,
      attributes: {
        'service.name': this.serviceName,
        'telemetry.sdk.name': 'company-apm-sdk',
        'telemetry.sdk.version': '1.0.0',
        ...options.attributes
      }
    });
    return span;
  }

  async traceAsync(name, fn, options = {}) {
    const span = this.startSpan(name, options);
    try {
      const result = await fn(span);
      span.setStatus('OK');
      return result;
    } catch (err) {
      span.setStatus('ERROR', err.message);
      span.addEvent('exception', { message: err.message, stack: err.stack });
      throw err;
    } finally {
      span.end();
    }
  }
}

module.exports = {
  ApmSpan,
  ApmTracer,
  createTracer: (serviceName, options) => new ApmTracer(serviceName, options)
};
