#!/usr/bin/env node
import {
  parseArgs,
  run,
  ensureCommands,
  ensureGitRepo,
  ensureCleanTree,
  remoteExists,
  fetchRemote,
  ensureTagFormat,
  branchDivergence,
  remoteSha,
  requireConfirm,
  repoSlugFromRemote,
  waitForWorkflowRunByCommit,
  waitForNewWorkflowDispatchRun,
} from './lib/release-common.mjs';

const usage = () => {
  console.log('Usage: npm run release:cut -- --tag vX.Y.Z [--remote origin] [--dev dev] [--main main] [--date YYYY-MM-DD] [--dry-run] [--no-watch-prepare] [--no-watch-main] [--no-watch-release] [--watch-timeout 3600] [--no-doctor] [--interactive]');
  console.log('Defaults: --yes and --non-interactive are enabled by default. Use --interactive to prompt.');
};

const ensureMainRulesCompatible = (repoSlug) => {
  const list = JSON.parse(run('gh', ['api', `repos/${repoSlug}/rulesets`], { trim: false }).stdout || '[]');
  const detailed = [];
  for (const item of list) {
    if (!item?.id) continue;
    const out = run('gh', ['api', `repos/${repoSlug}/rulesets/${item.id}`], { allowFail: true, trim: false });
    if (out.ok) detailed.push(JSON.parse(out.stdout || '{}'));
  }

  const mainRuleset = detailed.find((rs) => rs?.target === 'branch' && rs?.conditions?.ref_name?.include?.includes('refs/heads/main'));
  if (!mainRuleset) {
    throw new Error('No main ruleset found; cannot verify FF-only policy.');
  }

  const hasType = (type) => (mainRuleset.rules || []).some((r) => r?.type === type);
  const requiredChecksRule = (mainRuleset.rules || []).find((r) => r?.type === 'required_status_checks');
  const requiredChecks = requiredChecksRule?.parameters?.required_status_checks?.map((r) => r.context).filter(Boolean) || [];

  if (hasType('pull_request')) {
    throw new Error('main ruleset still requires pull requests; FF-only promotion will be blocked.');
  }
  if (requiredChecks.length > 0) {
    throw new Error(`main ruleset has required checks (${requiredChecks.join(', ')}); FF-only promotion may be blocked.`);
  }
};

const ensureDevBuildGreen = async ({ branch, commit, timeoutSeconds }) => {
  await waitForWorkflowRunByCommit({
    workflow: 'build-site',
    branch,
    commit,
    timeoutSeconds,
    event: 'push',
  });
};

const main = async () => {
  const { opts } = parseArgs(process.argv.slice(2));

  if (opts.get('help')) {
    usage();
    return;
  }

  const tag = typeof opts.get('tag') === 'string' ? opts.get('tag') : '';
  if (!tag) {
    usage();
    throw new Error('--tag is required.');
  }
  ensureTagFormat(tag);

  const remote = typeof opts.get('remote') === 'string' ? opts.get('remote') : 'origin';
  const devBranch = typeof opts.get('dev') === 'string' ? opts.get('dev') : 'dev';
  const mainBranch = typeof opts.get('main') === 'string' ? opts.get('main') : 'main';
  const interactive = Boolean(opts.get('interactive'));
  const yes = !interactive;
  const dryRun = Boolean(opts.get('dry-run'));
  const nonInteractive = !interactive;
  const watchPrepare = !Boolean(opts.get('no-watch-prepare'));
  const watchMain = !Boolean(opts.get('no-watch-main'));
  const watchRelease = !Boolean(opts.get('no-watch-release'));
  const timeoutSeconds = Number(opts.get('watch-timeout') || 3600);
  const noDoctor = Boolean(opts.get('no-doctor'));

  ensureCommands(['git', 'gh', 'node']);
  ensureGitRepo();
  ensureCleanTree();

  if (!remoteExists(remote)) {
    throw new Error(`Remote '${remote}' does not exist.`);
  }

  if (!(await requireConfirm(`Fetch '${remote}'?`, { yes, dryRun, nonInteractive }))) {
    throw new Error('Aborted.');
  }
  if (!dryRun) fetchRemote(remote);

  const repoSlug = repoSlugFromRemote(remote);
  if (!dryRun) {
    ensureMainRulesCompatible(repoSlug);
    const diverge = branchDivergence(`${remote}/${mainBranch}`, `${remote}/${devBranch}`);
    if (diverge.leftOnly > 0 && diverge.rightOnly > 0) {
      throw new Error(`Cannot fast-forward: ${remote}/${mainBranch} and ${remote}/${devBranch} diverged (main-only=${diverge.leftOnly}, dev-only=${diverge.rightOnly}).`);
    }
  }

  console.log(`Release tag: ${tag}`);
  console.log(`Remote: ${remote}`);
  console.log(`Promotion: ${devBranch} -> ${mainBranch}`);

  if (!noDoctor) {
    if (dryRun) {
      console.log(`DRY-RUN: would run release-doctor for ${tag} after release prep`);
    }
  }

  console.log('Step 1/3: release preparation on dev');
  const prepArgs = ['scripts/release-prepare.mjs', '--tag', tag, '--remote', remote, '--dev', devBranch, '--watch-timeout', String(timeoutSeconds)];
  if (typeof opts.get('date') === 'string') prepArgs.push('--date', opts.get('date'));
  if (yes) prepArgs.push('--yes');
  if (dryRun) prepArgs.push('--dry-run');
  if (nonInteractive) prepArgs.push('--non-interactive');
  if (!watchPrepare) prepArgs.push('--no-watch-pr');

  run('node', prepArgs, { stdio: 'inherit' });

  if (!noDoctor) {
    console.log('Step 1.5/3: release doctor re-check');
    run('node', ['scripts/release-doctor.mjs', '--tag', tag], { stdio: 'inherit' });
  }

  console.log('Step 2/3: fast-forward promote dev -> main');

  if (dryRun) {
    console.log(`DRY-RUN: would verify main ruleset compatibility and run FF merge/push ${remote}/${devBranch} -> ${mainBranch}`);
  } else {
    const devSha = remoteSha(remote, devBranch);
    await ensureDevBuildGreen({ branch: devBranch, commit: devSha, timeoutSeconds });

    const originalBranch = run('git', ['branch', '--show-current'], { allowFail: true }).stdout;

    run('git', ['checkout', mainBranch], { stdio: 'inherit' });
    run('git', ['merge', '--ff-only', `${remote}/${mainBranch}`], { stdio: 'inherit' });
    run('git', ['merge', '--ff-only', `${remote}/${devBranch}`], { stdio: 'inherit' });

    if (!(await requireConfirm(`Push '${mainBranch}' to '${remote}'?`, { yes, nonInteractive }))) {
      throw new Error('Aborted.');
    }
    run('git', ['push', remote, mainBranch], { stdio: 'inherit' });

    if (originalBranch && originalBranch !== mainBranch) {
      run('git', ['checkout', originalBranch], { stdio: 'inherit' });
    }

    if (watchMain) {
      const pushedSha = remoteSha(remote, mainBranch);
      await waitForWorkflowRunByCommit({
        workflow: 'build-site',
        branch: mainBranch,
        commit: pushedSha,
        timeoutSeconds,
        event: 'push',
      });
    }
  }

  console.log('Step 3/3: trigger release-helper');

  if (dryRun) {
    console.log(`DRY-RUN: would run: gh workflow run release-helper.yml --ref ${mainBranch} -f tag=${tag}`);
    return;
  }

  if (!(await requireConfirm(`Trigger release-helper on '${mainBranch}' for '${tag}'?`, { yes, nonInteractive }))) {
    throw new Error('Aborted.');
  }

  const oldRuns = run('gh', [
    'run',
    'list',
    '--workflow',
    'release-helper.yml',
    '--event',
    'workflow_dispatch',
    '--branch',
    mainBranch,
    '--limit',
    '20',
    '--json',
    'databaseId',
    '--jq',
    '.[].databaseId',
  ], { allowFail: true, trim: false }).stdout
    .split(/\r?\n/)
    .map((v) => v.trim())
    .filter(Boolean);

  const knownIds = new Set(oldRuns);

  run('gh', ['workflow', 'run', 'release-helper.yml', '--ref', mainBranch, '-f', `tag=${tag}`], { stdio: 'inherit' });

  if (watchRelease) {
    const runId = await waitForNewWorkflowDispatchRun({
      workflowFile: 'release-helper.yml',
      branch: mainBranch,
      knownRunIds: knownIds,
      timeoutSeconds: Math.min(timeoutSeconds, 600),
    });
    console.log(`Watching release-helper run ${runId}`);
    run('gh', ['run', 'watch', runId, '--exit-status'], { stdio: 'inherit' });
  }

  console.log('release-cut completed.');
};

main().catch((err) => {
  console.error(`release-cut: ${err.message}`);
  process.exit(1);
});
