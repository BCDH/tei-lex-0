#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export const parseArgs = (argv) => {
  const opts = new Map();
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      rest.push(arg);
      continue;
    }
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      opts.set(key, true);
      continue;
    }
    opts.set(key, next);
    i++;
  }
  return { opts, rest };
};

export const run = (cmd, args, { allowFail = false, trim = true, cwd, stdio = 'pipe' } = {}) => {
  const res = spawnSync(cmd, args, { encoding: 'utf8', cwd, stdio });
  if (res.error) {
    if (!allowFail) throw res.error;
    return { ok: false, code: 1, stdout: '', stderr: String(res.error) };
  }
  const ok = res.status === 0;
  if (!ok && !allowFail) {
    throw new Error(`${cmd} ${args.join(' ')} failed:\n${res.stderr || res.stdout}`);
  }
  return {
    ok,
    code: res.status ?? 1,
    stdout: trim ? (res.stdout || '').trim() : (res.stdout || ''),
    stderr: trim ? (res.stderr || '').trim() : (res.stderr || ''),
  };
};

export const commandExists = (cmd) => run('command', ['-v', cmd], { allowFail: true }).ok;

export const ensureCommands = (commands) => {
  const missing = commands.filter((cmd) => !commandExists(cmd));
  if (missing.length) {
    throw new Error(`Missing required command(s): ${missing.join(', ')}`);
  }
};

export const ensureGitRepo = () => {
  const inside = run('git', ['rev-parse', '--is-inside-work-tree'], { allowFail: true });
  if (!inside.ok || inside.stdout !== 'true') {
    throw new Error('Not inside a git repository.');
  }
};

export const ensureCleanTree = () => {
  const dirty = run('git', ['status', '--porcelain=v1'], { trim: false });
  if (dirty.stdout.trim().length > 0) {
    throw new Error('Working tree is not clean. Commit/stash changes first.');
  }
};

export const remoteExists = (remote) => run('git', ['remote', 'get-url', remote], { allowFail: true }).ok;

export const fetchRemote = (remote) => run('git', ['fetch', remote, '--tags'], { stdio: 'inherit' });

export const currentBranch = () => run('git', ['branch', '--show-current']).stdout;

export const remoteSha = (remote, branch) => run('git', ['rev-parse', `${remote}/${branch}`]).stdout;

export const localTagExists = (tag) => run('git', ['rev-parse', '-q', '--verify', `refs/tags/${tag}`], { allowFail: true }).ok;

export const remoteTagExists = (remote, tag) => {
  const out = run('git', ['ls-remote', '--tags', remote, tag], { allowFail: true });
  return out.ok && out.stdout.length > 0;
};

export const ensureTagFormat = (tag) => {
  if (!/^v\d+\.\d+\.\d+$/.test(tag)) {
    throw new Error(`Invalid tag '${tag}'. Expected format vX.Y.Z.`);
  }
};

export const tagVersion = (tag) => tag.replace(/^v/, '');

export const readOddEditionNumber = (oddPath = path.resolve(process.cwd(), 'odd', 'lex-0.odd')) => {
  if (!fs.existsSync(oddPath)) {
    throw new Error(`Missing ODD file: ${oddPath}`);
  }
  const xml = fs.readFileSync(oddPath, 'utf8');
  const m = xml.match(/<edition\b[^>]*\bn=(["'])([^"']+)\1/);
  if (!m) {
    throw new Error(`Could not find <edition n=\"...\"> in ${oddPath}`);
  }
  return m[2];
};

export const branchDivergence = (leftRef, rightRef) => {
  const out = run('git', ['rev-list', '--left-right', '--count', `${leftRef}...${rightRef}`]);
  const [left = '0', right = '0'] = out.stdout.split('\t');
  return { leftOnly: Number(left), rightOnly: Number(right) };
};

export const parseRepoSlug = (remoteUrl) => {
  const https = remoteUrl.match(/^https:\/\/github\.com\/([^/]+)\/([^/.]+)(?:\.git)?$/);
  if (https) return `${https[1]}/${https[2]}`;
  const ssh = remoteUrl.match(/^git@github\.com:([^/]+)\/([^/.]+)(?:\.git)?$/);
  if (ssh) return `${ssh[1]}/${ssh[2]}`;
  return '';
};

export const repoSlugFromRemote = (remote) => {
  const url = run('git', ['remote', 'get-url', remote], { allowFail: true }).stdout;
  const slug = parseRepoSlug(url);
  if (!slug) throw new Error(`Unable to derive GitHub repo slug from remote '${remote}' URL '${url}'.`);
  return slug;
};

export const todayUtc = () => {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};

export const sleep = async (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const requireConfirm = async (question, { yes = false, dryRun = false, nonInteractive = false } = {}) => {
  if (dryRun) {
    console.log(`OK (--dry-run): ${question}`);
    return true;
  }
  if (yes) {
    console.log(`OK (--yes): ${question}`);
    return true;
  }
  if (nonInteractive) {
    throw new Error(`Confirmation required in non-interactive mode: ${question}`);
  }

  const { createInterface } = await import('node:readline/promises');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ans = (await rl.question(`${question} [y/N] `)).trim().toLowerCase();
  rl.close();
  return ans === 'y' || ans === 'yes';
};

export const waitForPrMerged = async (prNumber, { timeoutSeconds = 3600, intervalMs = 5000 } = {}) => {
  const deadline = Date.now() + timeoutSeconds * 1000;
  while (Date.now() < deadline) {
    const state = run('gh', ['pr', 'view', String(prNumber), '--json', 'state', '--jq', '.state'], { allowFail: true }).stdout;
    if (state === 'MERGED') return true;
    if (state === 'CLOSED') throw new Error(`PR #${prNumber} was closed without merge.`);
    await sleep(intervalMs);
  }
  throw new Error(`Timed out waiting for PR #${prNumber} to merge.`);
};

export const waitForWorkflowRunByCommit = async ({ workflow, branch, commit, timeoutSeconds = 1800, event = 'push' }) => {
  const deadline = Date.now() + timeoutSeconds * 1000;
  let runId = '';

  while (Date.now() < deadline) {
    runId = run('gh', [
      'run',
      'list',
      '--workflow',
      workflow,
      '--branch',
      branch,
      '--event',
      event,
      '--commit',
      commit,
      '--json',
      'databaseId',
      '--jq',
      '.[0].databaseId',
    ], { allowFail: true }).stdout;

    if (runId) break;
    await sleep(5000);
  }

  if (!runId) {
    throw new Error(`Timed out waiting for workflow '${workflow}' on branch '${branch}' for commit '${commit}'.`);
  }

  console.log(`Watching workflow '${workflow}' run ${runId} (branch '${branch}', commit ${commit})`);
  run('gh', ['run', 'watch', String(runId), '--exit-status'], { stdio: 'inherit' });
  return runId;
};

export const waitForNewWorkflowDispatchRun = async ({ workflowFile, branch, knownRunIds = new Set(), timeoutSeconds = 300 }) => {
  const deadline = Date.now() + timeoutSeconds * 1000;
  while (Date.now() < deadline) {
    const out = run('gh', [
      'run',
      'list',
      '--workflow',
      workflowFile,
      '--event',
      'workflow_dispatch',
      '--branch',
      branch,
      '--limit',
      '20',
      '--json',
      'databaseId',
      '--jq',
      '.[].databaseId',
    ], { allowFail: true, trim: false }).stdout;

    const ids = out
      .split(/\r?\n/)
      .map((v) => v.trim())
      .filter(Boolean);

    const fresh = ids.find((id) => !knownRunIds.has(id));
    if (fresh) return fresh;
    await sleep(4000);
  }
  throw new Error(`Timed out waiting for new workflow_dispatch run for '${workflowFile}'.`);
};
