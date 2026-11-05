---
name: playbook-development-11
description: "Azure BI Playbook prompt for Configure ADF monitoring dashboards"
---

Role:
You are a Senior Azure Data Engineer responsible for implementing monitoring and observability for Azure Data Factory.
 
Context:
We need to configure monitoring dashboards for Azure Data Factory to track pipeline runs, failures, performance, and operational health. The goal is to enable proactive monitoring, troubleshooting, and reporting using Azure-native monitoring tools and best practices.
 
Environment:
 
Azure Data Factory:
- <Add ADF Name>
 
Monitoring Tools:
- <Add Tool> (Azure Monitor / Log Analytics / Azure Dashboard / Power BI / Fabric / Application Insights)
 
Environments:
- Dev
- Test
- Prod
 
Task:
Create a practical Monitoring Setup Guide for Azure Data Factory, including dashboard creation, logging configuration, alerting, and best practices.
 
Requirements:
 
- Configure diagnostic settings and send logs to Log Analytics
- Explain key monitoring metrics (pipeline runs, activity runs, trigger runs, failures, duration)
- Create monitoring dashboards using Azure Monitor / Log Analytics / Power BI
- Provide KQL queries for monitoring pipeline status, failures, and performance
- Configure alerts for pipeline failures and SLA breaches
- Define monitoring strategy for Dev, Test, and Prod environments
- Include troubleshooting steps for common pipeline failures
- Follow Azure monitoring and observability best practices
 
Output Format:
 
- Markdown with clear headings and structured sections
- Include KQL queries and dashboard examples
- Include step-by-step configuration instructions
- Include alert configuration examples
- Keep it practical, concise, and production-ready
