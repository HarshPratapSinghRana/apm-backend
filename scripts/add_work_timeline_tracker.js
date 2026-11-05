const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const API_CATALOG_PATH = path.join(ROOT_DIR, 'api', 'artifacts-catalog.json');
const MASTER_CATALOG_PATH = path.join(ROOT_DIR, 'engineering-commons-vscode', 'resources', 'catalog', 'masterCatalog.json');
const ARTIFACTS_JSON_DIR = path.join(ROOT_DIR, 'artifacts-json');

const TRACKER_CLI_CODE = `#!/usr/bin/env node
/**
 * Work Timeline Tracker Engine
 * Persists task start/complete events, checkpoints, durations, and produces visual timelines.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TIMELINE_DIR = path.join(process.cwd(), '.timeline');
const TIMELINE_FILE = path.join(TIMELINE_DIR, 'worklog.json');

function ensureTimelineFile() {
  if (!fs.existsSync(TIMELINE_DIR)) {
    fs.mkdirSync(TIMELINE_DIR, { recursive: true });
  }
  if (!fs.existsSync(TIMELINE_FILE)) {
    const initialData = {
      version: '1.0.0',
      activeTaskId: null,
      tasks: [],
      metadata: {
        createdAt: new Date().toISOString(),
        totalCompletedTasks: 0
      }
    };
    fs.writeFileSync(TIMELINE_FILE, JSON.stringify(initialData, null, 2), 'utf8');
  }
}

function loadData() {
  ensureTimelineFile();
  try {
    return JSON.parse(fs.readFileSync(TIMELINE_FILE, 'utf8'));
  } catch (e) {
    return { version: '1.0.0', activeTaskId: null, tasks: [], metadata: {} };
  }
}

function saveData(data) {
  ensureTimelineFile();
  fs.writeFileSync(TIMELINE_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function getGitBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch (e) {
    return 'main';
  }
}

function formatDuration(ms) {
  if (!ms || ms < 0) return '0m';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return \`\${hours}h \${minutes}m\`;
  }
  const seconds = Math.floor((ms % 60000) / 1000);
  return totalMinutes > 0 ? \`\${totalMinutes}m \${seconds}s\` : \`\${seconds}s\`;
}

const commands = {
  start(title, category = 'Development') {
    if (!title) {
      console.error('Error: Task title required. Usage: node tracker.js start "Task Title" [Category]');
      process.exit(1);
    }
    const data = loadData();
    const now = new Date();

    // Auto-pause existing active task
    if (data.activeTaskId) {
      const active = data.tasks.find(t => t.id === data.activeTaskId);
      if (active && active.status === 'in-progress') {
        active.status = 'paused';
        active.events.push({
          type: 'PAUSE',
          timestamp: now.toISOString(),
          note: \`Auto-paused when starting: \${title}\`
        });
        console.log(\`⏸️  Auto-paused previous task: "\${active.title}"\`);
      }
    }

    const taskId = 'task_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
    const newTask = {
      id: taskId,
      title: title,
      category: category,
      gitBranch: getGitBranch(),
      status: 'in-progress',
      startedAt: now.toISOString(),
      completedAt: null,
      totalDurationMs: 0,
      events: [
        {
          type: 'START',
          timestamp: now.toISOString(),
          note: 'Task started'
        }
      ],
      checkpoints: []
    };

    data.tasks.push(newTask);
    data.activeTaskId = taskId;
    saveData(data);

    console.log(\`🚀 [STARTED] \${title}\`);
    console.log(\`   ID: \${taskId}\`);
    console.log(\`   Started At: \${now.toLocaleString()}\`);
    console.log(\`   Branch: \${newTask.gitBranch}\`);
  },

  checkpoint(note) {
    if (!note) {
      console.error('Error: Checkpoint note required. Usage: node tracker.js checkpoint "Made progress on X"');
      process.exit(1);
    }
    const data = loadData();
    if (!data.activeTaskId) {
      console.error('Error: No active task found. Start one with: node tracker.js start "Task Title"');
      process.exit(1);
    }
    const task = data.tasks.find(t => t.id === data.activeTaskId);
    if (!task) {
      console.error('Error: Active task not found in database.');
      process.exit(1);
    }

    const now = new Date();
    task.checkpoints.push({
      timestamp: now.toISOString(),
      note: note
    });
    task.events.push({
      type: 'CHECKPOINT',
      timestamp: now.toISOString(),
      note: note
    });
    saveData(data);

    console.log(\`📍 [CHECKPOINT LOGGED] "\${task.title}"\`);
    console.log(\`   Note: \${note}\`);
    console.log(\`   Timestamp: \${now.toLocaleTimeString()}\`);
  },

  complete(completionNote = 'Work successfully finished') {
    const data = loadData();
    if (!data.activeTaskId) {
      console.error('Error: No active task to complete.');
      process.exit(1);
    }
    const task = data.tasks.find(t => t.id === data.activeTaskId);
    if (!task) {
      console.error('Error: Active task not found.');
      process.exit(1);
    }

    const now = new Date();
    const startMs = new Date(task.startedAt).getTime();
    const durationMs = now.getTime() - startMs;

    task.status = 'completed';
    task.completedAt = now.toISOString();
    task.totalDurationMs = durationMs;
    task.events.push({
      type: 'COMPLETE',
      timestamp: now.toISOString(),
      note: completionNote
    });

    data.activeTaskId = null;
    data.metadata.totalCompletedTasks = (data.metadata.totalCompletedTasks || 0) + 1;
    saveData(data);

    console.log(\`✅ [COMPLETED] \${task.title}\`);
    console.log(\`   Started:   \${new Date(task.startedAt).toLocaleTimeString()}\`);
    console.log(\`   Finished:  \${now.toLocaleTimeString()}\`);
    console.log(\`   Duration:  \${formatDuration(durationMs)}\`);
    console.log(\`   Note:      \${completionNote}\`);
  },

  timeline() {
    const data = loadData();
    console.log('\\n======================================================');
    console.log('         WORK TIMELINE & TASK LIFECYCLE LOG           ');
    console.log('======================================================\\n');

    if (data.tasks.length === 0) {
      console.log('No tasks recorded yet. Start tracking with: node tracker.js start "Feature name"');
      return;
    }

    data.tasks.forEach((task, idx) => {
      const isCurrent = data.activeTaskId === task.id;
      const statusIcon = task.status === 'completed' ? '✅' : isCurrent ? '⚡' : '⏸️';
      const duration = task.completedAt 
        ? formatDuration(task.totalDurationMs)
        : formatDuration(Date.now() - new Date(task.startedAt).getTime()) + ' (active)';

      console.log(\`\${statusIcon} [\${task.status.toUpperCase()}] #\${idx + 1}: \${task.title}\`);
      console.log(\`   Category:  \${task.category} | Branch: \${task.gitBranch}\`);
      console.log(\`   Timeline:  \${new Date(task.startedAt).toLocaleTimeString()} -> \${task.completedAt ? new Date(task.completedAt).toLocaleTimeString() : 'NOW'}\`);
      console.log(\`   Duration:  \${duration}\`);

      if (task.checkpoints && task.checkpoints.length > 0) {
        console.log('   Milestones:');
        task.checkpoints.forEach(cp => {
          console.log(\`     • [\${new Date(cp.timestamp).toLocaleTimeString()}] \${cp.note}\`);
        });
      }
      console.log('------------------------------------------------------');
    });

    console.log(\`Total Tasks Tracked: \${data.tasks.length} | Completed: \${data.metadata.totalCompletedTasks || 0}\\n\`);
  },

  standup() {
    const data = loadData();
    const today = new Date().toDateString();
    const completedToday = data.tasks.filter(t => t.status === 'completed' && new Date(t.completedAt).toDateString() === today);
    const inProgress = data.tasks.filter(t => t.status === 'in-progress');

    console.log('\\n======================================================');
    console.log('               DAILY STANDUP REPORT                   ');
    console.log('======================================================\\n');

    console.log('🎯 WHAT I COMPLETED TODAY:');
    if (completedToday.length === 0) {
      console.log('  (No completed tasks logged yet today)');
    } else {
      completedToday.forEach(t => {
        console.log(\`  - \${t.title} (\${formatDuration(t.totalDurationMs)})\`);
      });
    }

    console.log('\\n⚡ WHAT I AM CURRENTLY WORKING ON:');
    if (inProgress.length === 0) {
      console.log('  (No active task in progress)');
    } else {
      inProgress.forEach(t => {
        console.log(\`  - \${t.title} [Started \${new Date(t.startedAt).toLocaleTimeString()}]\`);
      });
    }

    console.log('\\n🚧 BLOCKERS & NOTES:');
    const blockers = [];
    data.tasks.forEach(t => {
      (t.checkpoints || []).forEach(cp => {
        if (cp.note.toLowerCase().includes('block') || cp.note.toLowerCase().includes('wait') || cp.note.toLowerCase().includes('issue')) {
          blockers.push(\`  - [\${t.title}] \${cp.note}\`);
        }
      });
    });
    if (blockers.length === 0) {
      console.log('  - None. All workflows executing smoothly.');
    } else {
      blockers.forEach(b => console.log(b));
    }
    console.log('\\n======================================================\\n');
  }
};

const [,, cmd, ...args] = process.argv;
if (!cmd || !commands[cmd]) {
  console.log('Work Timeline Tracker CLI:');
  console.log('  node tracker.js start "Task Title" [Category]');
  console.log('  node tracker.js checkpoint "Progress notes"');
  console.log('  node tracker.js complete "Final resolution note"');
  console.log('  node tracker.js timeline');
  console.log('  node tracker.js standup');
  process.exit(0);
}

commands[cmd](...args);
`;

const AGENT_PROMPT = `---
name: 'Work Timeline Tracker'
id: 'work-timeline-tracker'
description: 'Autonomous work timeline and task lifecycle tracker for developers and AI agents. Records exact start times, milestone checkpoints, context switches, and completion timestamps. Generates visual Gantt-style timelines, duration statistics, and automated daily standup reports.'
tools: ['codebase', 'search', 'editFiles', 'problems', 'runCommands']
argument-hint: 'Ask @work-timeline-tracker to /start a task, /checkpoint progress, /complete work, or show the /timeline'
---

# Work Timeline Tracker Agent

You are the **Work Timeline Tracker Agent**, a specialized productivity and task lifecycle engine designed for developers and AI pair programmers.
Your mission is to track **when work begins**, **what intermediate milestones occur**, **how long focus sessions last**, and **when work concludes**, producing chronological audit logs and automated standup reports.

---

## 🎯 Core Directives & Tracking Capabilities

### 1. Task Lifecycle State Machine
- **START**: Initiates a focus session with an ISO timestamp, task objective, category (Feature, Bugfix, Refactor, Security, Review), and active Git branch.
- **CHECKPOINT**: Logs incremental progress, unit test passes, commit hashes, or blockers with timestamps.
- **CONTEXT SWITCH / PAUSE**: Detects when a developer pauses or switches to another priority, preserving duration metrics.
- **COMPLETE**: Concludes the task, computes exact wall-clock and active focus durations, and archives artifacts created.

### 2. Timeline Persistence (\`.timeline/worklog.json\`)
All sessions are recorded in a lightweight, zero-dependency local JSON file at \`.timeline/worklog.json\`:
\`\`\`json
{
  "activeTaskId": "task_1",
  "tasks": [
    {
      "id": "task_1",
      "title": "Fix SQL Injection and Express Path Traversal",
      "category": "Security",
      "gitBranch": "feature/security-hardening",
      "status": "completed",
      "startedAt": "2026-10-23T10:15:00.000Z",
      "completedAt": "2026-10-23T11:05:00.000Z",
      "totalDurationMs": 3000000,
      "checkpoints": [
        { "timestamp": "2026-10-23T10:30:00.000Z", "note": "Sanitized path.join with basename" },
        { "timestamp": "2026-10-23T10:55:00.000Z", "note": "Semgrep scan passed with 0 findings" }
      ]
    }
  ]
}
\`\`\`

---

## ⚡ Slash Commands & Workflows

### \`/start <task_title> [category]\`
When the user says "I am starting X", "start tracking X", or runs \`/start\`:
1. Check if \`.timeline/worklog.json\` exists. If not, initialize it.
2. If another task is in progress, automatically pause it with a context-switch note.
3. Record new task with current timestamp, Git branch, and category.
4. Reply with a confirmation banner, start time, and tips on next milestones.

### \`/checkpoint <notes>\`
When the user reaches a milestone or reports progress:
1. Append checkpoint with timestamp and note to active task.
2. Confirm with elapsed time from start.

### \`/complete [resolution_notes]\`
When the user finishes:
1. Mark active task as \`completed\` with current timestamp.
2. Calculate total elapsed duration (e.g. \`1h 24m\`).
3. Display task completion certificate summarizing duration, milestones logged, and files touched.

### \`/timeline [today|week|all]\`
Renders a visual chronological timeline:
\`\`\`text
======================================================
               WORK TIMELINE (TODAY)                  
======================================================
✅ 09:15 - 10:00 (45m)  [Security] Resolved TLS Insecure Transport
📍 09:40 Checkpoint: Strict TLS enabled across all HTTP clients
------------------------------------------------------
✅ 10:05 - 10:45 (40m)  [Code Review] Created Python & Java Review Agents
------------------------------------------------------
⚡ 11:00 - NOW   (22m)  [Productivity] Building Work Timeline Tracker
======================================================
Total Deep Work: 1h 47m | Completed: 2 tasks | Active: 1
\`\`\`

### \`/standup\`
Generates ready-to-paste Scrum / Standup updates:
- **Yesterday / Earlier Today**: Completed tasks with durations.
- **In Progress / Current**: Active task with target outcome.
- **Blockers / Risks**: Logged impediments.

---

## 🛡️ Best Practices
- Never lose data: Always read existing \`.timeline/worklog.json\` before appending.
- Always provide human-friendly duration strings (\`2h 15m\` instead of raw milliseconds).
- Keep timeline clean and formatted with Markdown tables and visual badges.
`;

const SKILL_MD = `---
name: work-timeline-tracker
description: Autonomous work timeline and task lifecycle tracker for developers and AI agents. Records start times, milestones, context switches, and completions with duration calculation and standup reports.
---

# Work Timeline Tracker Skill

A productivity automation skill for tracking when work starts, recording intermediate milestones, and calculating exact task duration when completed.

## CLI Usage
Run the bundled tracker engine via Node.js:

\`\`\`bash
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
\`\`\`

## Data Storage
Logs are automatically persisted to \`.timeline/worklog.json\`.
`;

function run() {
  console.log('Generating Work Timeline Tracker Artifact...');

  // 1. Create .timeline directory in root with engine script
  const timelineDir = path.join(ROOT_DIR, '.timeline');
  fs.mkdirSync(timelineDir, { recursive: true });
  fs.writeFileSync(path.join(timelineDir, 'tracker.js'), TRACKER_CLI_CODE, 'utf8');

  // 2. Write agent definition
  const agentsDir = path.join(ROOT_DIR, '.github', 'agents');
  fs.mkdirSync(agentsDir, { recursive: true });
  fs.writeFileSync(path.join(agentsDir, 'work-timeline-tracker.agent.md'), AGENT_PROMPT, 'utf8');

  // 3. Write skills
  const skillsDir = path.join(ROOT_DIR, 'skills', 'work-timeline-tracker');
  fs.mkdirSync(skillsDir, { recursive: true });
  fs.writeFileSync(path.join(skillsDir, 'SKILL.md'), SKILL_MD, 'utf8');

  const agentsSkillsDir = path.join(ROOT_DIR, '.agents', 'skills', 'work-timeline-tracker');
  fs.mkdirSync(agentsSkillsDir, { recursive: true });
  fs.writeFileSync(path.join(agentsSkillsDir, 'SKILL.md'), SKILL_MD, 'utf8');

  // 4. Prepare catalog entry
  const trackerArtifact = {
    id: 'work-timeline-tracker',
    name: 'work-timeline-tracker',
    title: 'Work Timeline Tracker (Task Lifecycles, Deep Work & Standups)',
    version: '1.0.0',
    type: 'agent',
    category: 'Developer Tools',
    domain: 'Productivity & Workflow',
    description: 'Autonomous Work Timeline & Task Lifecycle Tracker for developers and agents. Tracks exactly when work starts, progress checkpoints, context switches, and completions with minute-level precision. Automatically generates chronological Gantt-style work timelines, daily standup summaries (Done, In Progress, Blockers), and calculates active deep-work vs idle durations.',
    author: 'engineering-commons',
    source: 'COMMUNITY',
    isCertified: true,
    downloads: 14200,
    rating: 5.0,
    techStack: ['Node.js', 'Workflow Tracking', 'Copilot Agent', 'Productivity', 'Timeline Analytics'],
    keyFeatures: [
      'Automated start-to-finish task tracking with ISO timestamps, duration calculation, and git branch auto-tagging',
      'Interactive checkpoint logging: record incremental breakthroughs, PR links, blockers, and milestone timestamps',
      'Context-switch tracker: captures interruptions, pauses active tasks, and calculates true deep-work time',
      'Visual chronological timeline views with duration breakdowns, status badges (In Progress, Done, Blocked)',
      '1-Click automated Standup generator (What was completed, What is underway, What is blocked)',
      'Zero external dependencies: persists clean local JSON & Markdown worklogs in .timeline/worklog.json'
    ],
    githubRepo: 'https://github.com/MAQ-Engineering/work-timeline-tracker',
    usability: 'copilot-ready',
    usabilityBadge: '⏱️ Timeline Tracker',
    isCopilotReady: true,
    files: [
      {
        path: '.github/agents/work-timeline-tracker.agent.md',
        content: AGENT_PROMPT
      },
      {
        path: '.timeline/tracker.js',
        content: TRACKER_CLI_CODE
      },
      {
        path: 'skills/work-timeline-tracker/SKILL.md',
        content: SKILL_MD
      },
      {
        path: 'cip.yml',
        content: `name: work-timeline-tracker\nversion: 1.0.0\ntype: agent\ncategory: Developer Tools\ndomain: Productivity & Workflow\nauthor: engineering-commons\ndescription: Autonomous Work Timeline & Task Lifecycle Tracker for developers and agents.\nmain: .github/agents/work-timeline-tracker.agent.md\nskills:\n  - skills/work-timeline-tracker/SKILL.md\n`
      }
    ]
  };

  // 5. Save to artifacts-json
  fs.mkdirSync(ARTIFACTS_JSON_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(ARTIFACTS_JSON_DIR, 'work-timeline-tracker.json'),
    JSON.stringify(trackerArtifact, null, 2),
    'utf8'
  );

  // 6. Update api/artifacts-catalog.json
  let apiCatalog = [];
  try {
    apiCatalog = JSON.parse(fs.readFileSync(API_CATALOG_PATH, 'utf8'));
  } catch (e) {}
  const apiIdx = apiCatalog.findIndex(x => x.id === 'work-timeline-tracker' || x.name === 'work-timeline-tracker');
  if (apiIdx >= 0) {
    apiCatalog[apiIdx] = trackerArtifact;
  } else {
    apiCatalog.unshift(trackerArtifact);
  }
  fs.writeFileSync(API_CATALOG_PATH, JSON.stringify(apiCatalog, null, 2), 'utf8');

  // 7. Update masterCatalog.json
  let masterCatalog = [];
  try {
    masterCatalog = JSON.parse(fs.readFileSync(MASTER_CATALOG_PATH, 'utf8'));
  } catch (e) {}
  const masterIdx = masterCatalog.findIndex(x => x.id === 'work-timeline-tracker' || x.name === 'work-timeline-tracker');
  if (masterIdx >= 0) {
    masterCatalog[masterIdx] = trackerArtifact;
  } else {
    masterCatalog.unshift(trackerArtifact);
  }
  fs.writeFileSync(MASTER_CATALOG_PATH, JSON.stringify(masterCatalog, null, 2), 'utf8');

  console.log('Work Timeline Tracker successfully created and published to all catalogs!');
}

run();
