#!/usr/bin/env node
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
    return `${hours}h ${minutes}m`;
  }
  const seconds = Math.floor((ms % 60000) / 1000);
  return totalMinutes > 0 ? `${totalMinutes}m ${seconds}s` : `${seconds}s`;
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
          note: `Auto-paused when starting: ${title}`
        });
        console.log(`⏸️  Auto-paused previous task: "${active.title}"`);
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

    console.log(`🚀 [STARTED] ${title}`);
    console.log(`   ID: ${taskId}`);
    console.log(`   Started At: ${now.toLocaleString()}`);
    console.log(`   Branch: ${newTask.gitBranch}`);
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

    console.log(`📍 [CHECKPOINT LOGGED] "${task.title}"`);
    console.log(`   Note: ${note}`);
    console.log(`   Timestamp: ${now.toLocaleTimeString()}`);
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

    console.log(`✅ [COMPLETED] ${task.title}`);
    console.log(`   Started:   ${new Date(task.startedAt).toLocaleTimeString()}`);
    console.log(`   Finished:  ${now.toLocaleTimeString()}`);
    console.log(`   Duration:  ${formatDuration(durationMs)}`);
    console.log(`   Note:      ${completionNote}`);
  },

  timeline() {
    const data = loadData();
    console.log('\n======================================================');
    console.log('         WORK TIMELINE & TASK LIFECYCLE LOG           ');
    console.log('======================================================\n');

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

      console.log(`${statusIcon} [${task.status.toUpperCase()}] #${idx + 1}: ${task.title}`);
      console.log(`   Category:  ${task.category} | Branch: ${task.gitBranch}`);
      console.log(`   Timeline:  ${new Date(task.startedAt).toLocaleTimeString()} -> ${task.completedAt ? new Date(task.completedAt).toLocaleTimeString() : 'NOW'}`);
      console.log(`   Duration:  ${duration}`);

      if (task.checkpoints && task.checkpoints.length > 0) {
        console.log('   Milestones:');
        task.checkpoints.forEach(cp => {
          console.log(`     • [${new Date(cp.timestamp).toLocaleTimeString()}] ${cp.note}`);
        });
      }
      console.log('------------------------------------------------------');
    });

    console.log(`Total Tasks Tracked: ${data.tasks.length} | Completed: ${data.metadata.totalCompletedTasks || 0}\n`);
  },

  standup() {
    const data = loadData();
    const today = new Date().toDateString();
    const completedToday = data.tasks.filter(t => t.status === 'completed' && new Date(t.completedAt).toDateString() === today);
    const inProgress = data.tasks.filter(t => t.status === 'in-progress');

    console.log('\n======================================================');
    console.log('               DAILY STANDUP REPORT                   ');
    console.log('======================================================\n');

    console.log('🎯 WHAT I COMPLETED TODAY:');
    if (completedToday.length === 0) {
      console.log('  (No completed tasks logged yet today)');
    } else {
      completedToday.forEach(t => {
        console.log(`  - ${t.title} (${formatDuration(t.totalDurationMs)})`);
      });
    }

    console.log('\n⚡ WHAT I AM CURRENTLY WORKING ON:');
    if (inProgress.length === 0) {
      console.log('  (No active task in progress)');
    } else {
      inProgress.forEach(t => {
        console.log(`  - ${t.title} [Started ${new Date(t.startedAt).toLocaleTimeString()}]`);
      });
    }

    console.log('\n🚧 BLOCKERS & NOTES:');
    const blockers = [];
    data.tasks.forEach(t => {
      (t.checkpoints || []).forEach(cp => {
        if (cp.note.toLowerCase().includes('block') || cp.note.toLowerCase().includes('wait') || cp.note.toLowerCase().includes('issue')) {
          blockers.push(`  - [${t.title}] ${cp.note}`);
        }
      });
    });
    if (blockers.length === 0) {
      console.log('  - None. All workflows executing smoothly.');
    } else {
      blockers.forEach(b => console.log(b));
    }
    console.log('\n======================================================\n');
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
