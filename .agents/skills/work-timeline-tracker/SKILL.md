---
name: work-timeline-tracker
description: Autonomous work timeline and task lifecycle tracker for developers and AI agents. Records start times, milestones, context switches, and completions with duration calculation and standup reports.
---

# Work Timeline Tracker Skill

A productivity automation skill for tracking when work starts, recording intermediate milestones, and calculating exact task duration when completed.

## CLI Usage
Run the bundled tracker engine via Node.js:

```bash
# 1. Start tracking a new task
node .timeline/tracker.js start "Implement Authentication Flow" Feature

# 2. Add an intermediate milestone
node .timeline/tracker.js checkpoint "Completed OAuth2 redirect handler"

# 3. Mark task completed
node .timeline/tracker.js complete "All unit tests passing and merged"

# 4. View visual chronological timeline
node .timeline/tracker.js timeline

# 5. Generate daily standup report
node .timeline/tracker.js standup
```

## Data Storage
Logs are automatically persisted to `.timeline/worklog.json`.
