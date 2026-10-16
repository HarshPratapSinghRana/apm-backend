# Enterprise APM Telemetry Client Package

**Artifact Name**: `apm-telemetry-sdk`  
**Artifact Type**: `package`  
**Version**: `1.0.0`  
**Category**: `DevOps & Monitoring`  
**License**: `MIT`  
**Standards**: [W3C Trace Context Specification](https://www.w3.org/TR/trace-context/)

---

## Overview

The **Enterprise APM Telemetry SDK** is a lightweight, zero-dependency client package providing OpenTelemetry-compatible distributed tracing, span tracking, and structured correlation logging.

It guarantees compliant W3C `traceparent` headers (`00-{traceId}-{spanId}-01`) across microservice boundaries, enabling distributed context propagation and root-cause latency analysis.

---

## Key Features

- **W3C TraceContext**: Compliant 128-bit trace ID and 64-bit span ID generation.
- **Microservice Context Propagation**: Automatic header injection for outgoing HTTP requests.
- **Span Lifecycle**: Measure function execution durations, capture status codes, and record unhandled exception stack traces.
- **Zero Heavy Dependencies**: Pure Node.js runtime without external bloat.

---

## Quickstart

```javascript
const { createTracer } = require('@company-apm/telemetry-sdk');
const tracer = createTracer('order-service');

await tracer.traceAsync('process-checkout', async (span) => {
  span.setAttribute('order.amount', 49.99);
  span.setAttribute('customer.tier', 'gold');

  // Business logic here
  span.addEvent('payment_authorized');
});
```
