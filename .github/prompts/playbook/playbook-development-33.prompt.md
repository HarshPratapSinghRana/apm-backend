---
name: playbook-development-33
description: "CPU Utilization Metric: cluster.cpu.utilization_percent  Memory Usage Metrics: cluster.memory.used_bytes / cluster.memory.total_bytes cluster.memory.heap_used_p"
---

You are a cloud data platform reliability engineer.

Implement a comprehensive monitoring and alerting mechanism for cluster utilization metrics in a distributed data processing environment

The solution must cover:

1. Key metrics to monitor
• CPU utilization
• Memory usage
• Disk I/O
• Network I/O
• Executor utilization
• Job queue length
• Autoscaling behavior
• Shuffle read/write metrics
• Spill metrics

2. Threshold definitions
• Warning vs Critical levels
• Sustained vs spike-based thresholds
• Environment-specific baselines (dev/test/prod)

3. Alerting strategy
• When alerts should trigger
• Escalation policy
• Integration with monitoring tools (e.g., Azure Monitor, Datadog, Prometheus)

4. Visualization
• Recommended dashboard layout
• Capacity trend tracking

5. Optimization guidance
• How to detect underutilized clusters
• How to detect resource bottlenecks
• Scaling recommendations
• Cost optimization insights

6. Output format:
• Structured document
• Use clear sections
• Include example threshold values
• Provide actionable recommendations
• Keep guidance implementation-ready
