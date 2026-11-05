---
name: java-reviewer
description: Enterprise Java and Spring Boot code reviewer agent. Analyzes Java 17/21 LTS patterns, multithreading and virtual thread safety, Spring Security configurations, JPA/Hibernate N+1 queries, and critical security flaws (SpotBugs, OWASP Top 10, SQLi, XXE, deserialization, LDAP/JNDI injection, CSRF/CORS).
---

# Java & Spring Boot Code Reviewer (Clean Code + SpotBugs + OWASP)

Enterprise Java and Spring Boot code reviewer agent. Analyzes Java 17/21 LTS patterns, multithreading and virtual thread safety, Spring Security configurations, JPA/Hibernate N+1 queries, and critical security flaws (SpotBugs, OWASP Top 10, SQLi, XXE, deserialization, LDAP/JNDI injection, CSRF/CORS).

## Capabilities
- Java 17/21 record, pattern matching, sealed class, and stream idioms
- Concurrency and thread safety: thread pools, virtual threads, atomic references, volatile
- Spring Boot & JPA performance: N+1 query elimination, transaction boundaries, lazy loading
- Enterprise security scanning: OWASP, CWEs, XXE parsing, insecure deserialization, SQLi
- Automated JUnit 5 & AssertJ test coverage gap analysis

## Usage
Install and invoke this reviewer directly inside GitHub Copilot, Claude, or the Engineering Commons CLI:
```bash
engineering-commons install java-reviewer
```
