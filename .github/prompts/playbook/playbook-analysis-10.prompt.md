---
name: playbook-analysis-10
description: "Event Taxonomy  Naming Convention: entity_action  Categories:  user_login  user_signup  product_view  cart_add  order_create  system_error  api_response  Sample"
---

You are a senior data engineer and product analytics expert.

Task:
Define telemetry and event-tracking schemas to capture granular user interactions for product analytics and proactive error monitoring.

System Context:
**Provide product name, platform(s), domain, and key features**
**Provide user types and high-level user journey (e.g., onboarding, login, search, checkout)**

Requirements:

**Event Taxonomy**
• Define a standardized naming convention for events (e.g., entity_action)
• Categorize events into user events, system events, error events, and performance events
• Ensure naming consistency across all platforms (web, mobile, backend)
• Support extensibility for future features

**Event Schema Definition**
For each event, define:
• Event name
• Description of what the event captures
• Trigger condition (when the event fires)
• Platform (web, mobile, backend, API)

**Event Properties:**
• user_id (string / UUID)
• session_id (string)
• timestamp (ISO 8601 format)
• feature_name (string)
• action_source (UI / API / background job)
• additional properties:
• **Add custom property 1 (type + description)**
• **Add custom property 2 (type + description)**

**Standard Metadata (applies to all events)**
• app_version (string)
• device_type (string)
• OS_version (string)
• location (optional)
• network_type (WiFi / Cellular / Offline)

**Error Tracking Schema**
Define a structured schema for capturing errors:
• error_type (client / server / network)
• error_code (string / number)
• error_message (string)
• stack_trace (optional)
• impacted_feature (string)
• severity (low / medium / high / critical)
• retry_attempt (number)

**Performance Monitoring Events**
Capture system performance metrics such as:
• API response time
• page load time
• latency
• throughput

Example fields:
• response_time_ms (number)
• request_id (string)
• endpoint_name (string)

**Data Governance & Best Practices**
• Ensure idempotent event tracking (avoid duplicates)
• Avoid unnecessary PII collection and ensure compliance
• Maintain consistent schema versioning
• Implement data validation checks
• Define retention and archival policies
• Ensure low-latency ingestion for real-time analytics

**Output Requirements**
• Event taxonomy structure
• At least 5–7 sample event definitions
• JSON schema examples for events
• Error event schema example
• Performance event schema example
• Recommendations for implementation tools (e.g., Segment, Mixpanel, GA4, Datadog)

**Optional Custom Inputs**
• Analytics tool preference: **Provide tool (e.g., Mixpanel / GA4 / Amplitude / Custom)**
• Data warehouse: **Provide warehouse (e.g., Snowflake / BigQuery / Redshift)**
• Real-time analytics requirement: **Yes / No**
• Compliance requirements: **Provide (e.g., GDPR / HIPAA / None)**

Constraints:
• Design for distributed systems
• Handle high event volume (millions of events per day)
• Ensure scalability and low-latency ingestion
• Support schema evolution without breaking pipelines
• Avoid vague or generic definitions
