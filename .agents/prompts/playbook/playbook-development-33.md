---
name: playbook-development-33
title: "Monitor cluster utilization metrics"
type: prompt
category: "Prompt Playbook"
subcategory: "Development & Implementation"
stage: "Development"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "development"]
description: "CPU Utilization Metric: cluster.cpu.utilization_percent  Memory Usage Metrics: cluster.memory.used_bytes / cluster.memory.total_bytes cluster.memory.heap_used_percent (JVM heap for Spark) cluster.memory.off_heap_used_percent (direct memory)  Disk I/O Metrics: cluster.disk.read_throughput_mbps cluster.disk.write_throughput_mbps cluster.disk.iops_read, cluster.disk.iops_write cluster.disk.usage_percent (ephemeral storage) cluster.disk.io_wait_time_ms (queue depth)  Network I/O Metrics: cluster.network.rx_throughput_mbps (receive) cluster.network.tx_throughput_mbps (transmit) cluster.network.packet_loss_percent cluster.network.retransmit_rate  Executor Utilization Metrics: spark.executor.active_tasks / spark.executor.max_tasks spark.executor.idle_time_percent spark.executor.gc_time_percent (GC overhead) spark.executor.jvm_memory_used_bytes  Autoscaling Behavior Metrics: cluster.autoscale.current_nodes cluster.autoscale.target_nodes cluster.autoscale.scale_up_events_count cluster.autoscale.scale_down_events_count cluster.autoscale.time_to_scale_seconds  Shuffle Read/Write Metrics: spark.shuffle.read_bytes_total spark.shuffle.write_bytes_total spark.shuffle.read_time_ms (remote read latency) spark.shuffle.blocks_fetched_remote spark.shuffle.fetch_wait_time_ms  Memory & Disk Spill Metrics: spark.executor.memory_spill_bytes (spilled to disk) spark.executor.disk_spill_bytes (read back from disk) spark.shuffle.spill_memory_bytes spark.shuffle.spill_disk_bytes"
---

# Monitor cluster utilization metrics

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
