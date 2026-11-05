---
name: kubernetes-security-auditor
type: skill
version: 1.0.0
description: Audits Kubernetes manifests and Helm charts for security vulnerabilities and CIS benchmarks
---

# Kubernetes Security Auditor Skill

When invoked to inspect Kubernetes deployment manifests, Helm charts, or K8s configurations:
1. Verify container security contexts (allowPrivilegeEscalation: false, readOnlyRootFilesystem: true, runAsNonRoot: true).
2. Audit RBAC ClusterRoleBindings to detect overly permissive cluster-admin or wildcard verbs.
3. Verify that CPU and Memory resource requests and limits are explicitly defined on every container.
4. Check NetworkPolicies for default-deny ingress and egress rules.
5. Generate an executive remediation report formatted with clear markdown tables and diff snippets.