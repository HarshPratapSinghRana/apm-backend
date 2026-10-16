---
name: playwright-e2e-synthesizer
type: skill
version: 1.0.0
description: Autonomous End-to-End Test Suite Synthesizer using Playwright TypeScript with Flake Prevention and Accessibility Assertions.
author: Enterprise Quality Assurance <qa-automation@maqsoftware.com>
tags:
  - testing
  - e2e
  - playwright
  - accessibility
  - typescript
---

# Playwright E2E Synthesizer Skill

High-efficiency testing skill that generates complete, production-grade Playwright TypeScript end-to-end tests from feature specs and DOM components.

## Core Capabilities

### 1. Zero-Flake Test Construction
- Enforces web-first assertions (`expect(locator).toBeVisible()`, `expect(locator).toHaveText()`) with automatic retrying.
- Disallows arbitrary timeouts (`page.waitForTimeout`) in favor of network idle states and targeted DOM state conditions.
- Automatically captures failure artifacts (screenshots, video replays, and trace zips) on test failure.

### 2. Multi-Role User Flow Testing
- Generates parallel authenticated scenarios for Consumer, Contributor, Reviewer, and Admin personas using storage state cookies/tokens.
- Mocks third-party APIs via `page.route` to isolate frontend behaviors and verify resilient offline degradation.

### 3. Integrated Accessibility (axe-core) Testing
- Injects `@axe-core/playwright` across critical user journeys.
- Fails builds on WCAG 2.1 AA violations (contrast ratio, missing ARIA labels, invalid tab order).

## Example Test Template Generated

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Marketplace Catalog User Journey', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/marketplace');
        await expect(page.locator('#catalog-header')).toBeVisible();
    });

    test('should filter artifacts by type and assert zero accessibility violations', async ({ page }) => {
        await page.click('button:has-text("Agents")');
        await expect(page.locator('.artifact-card')).toHaveCount(4);

        // Run automated accessibility inspection
        const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
        expect(accessibilityScanResults.violations).toEqual([]);
    });
});
```

## Execution Commands

```bash
# Generate Playwright tests for a page or component
apm run playwright-e2e-synthesizer --spec ./src/views/marketplace.ts --output ./test/e2e/marketplace.spec.ts

# Execute synthesized suite in headless mode with trace capture
npx playwright test --trace on-first-retry
```
