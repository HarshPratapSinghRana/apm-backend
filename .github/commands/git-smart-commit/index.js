#!/usr/bin/env node
/**
 * Conventional Commits Validation & Formatting Command
 * Derived from @commitlint/config-conventional (MIT License)
 * Source: https://github.com/conventional-changelog/commitlint
 */

const fs = require('fs');

const CONVENTIONAL_TYPES = [
  'feat',
  'fix',
  'docs',
  'style',
  'refactor',
  'perf',
  'test',
  'build',
  'ci',
  'chore',
  'revert'
];

function validateCommitMessage(message) {
  if (!message || typeof message !== 'string') {
    return { valid: false, errors: ['Commit message is empty'] };
  }

  const trimmed = message.trim();
  const firstLine = trimmed.split('\n')[0];
  const regex = /^([a-z]+)(\([a-z0-9\-._]+\))?(!)?:\s+(.+)$/;
  const match = firstLine.match(regex);

  const errors = [];

  if (!match) {
    errors.push(`Header does not conform to '<type>(<scope>): <subject>' pattern.`);
    return { valid: false, errors };
  }

  const [, type, , isBreaking, subject] = match;

  if (!CONVENTIONAL_TYPES.includes(type)) {
    errors.push(`Type '${type}' is invalid. Allowed types: ${CONVENTIONAL_TYPES.join(', ')}`);
  }

  if (!subject || subject.trim().length === 0) {
    errors.push('Subject description cannot be empty.');
  }

  if (subject && subject.length > 72) {
    errors.push(`Header length (${firstLine.length}) exceeds maximum limit of 72 characters.`);
  }

  if (subject && subject.endsWith('.')) {
    errors.push('Subject must not end with a period.');
  }

  return {
    valid: errors.length === 0,
    errors,
    parsed: {
      type,
      isBreaking: Boolean(isBreaking),
      subject
    }
  };
}

if (require.main === module) {
  const commitMsg = process.argv.slice(2).join(' ') || process.env.COMMIT_MSG;
  if (!commitMsg) {
    console.log('Usage: git-smart-commit "<type>(<scope>): <message>"');
    process.exit(1);
  }
  const result = validateCommitMessage(commitMsg);
  if (result.valid) {
    console.log(`✓ Conventional Commit Valid: [${result.parsed.type}] ${result.parsed.subject}`);
    process.exit(0);
  } else {
    console.error('❌ Commit message lint failed:');
    result.errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }
}

module.exports = { validateCommitMessage, CONVENTIONAL_TYPES };
