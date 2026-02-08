#!/usr/bin/env node
import {
  parseArgs,
  run,
  ensureCommands,
  ensureGitRepo,
  ensureCleanTree,
  remoteExists,
  fetchRemote,
  remoteSha,
  ensureTagFormat,
  tagVersion,
  readOddEditionNumber,
  localTagExists,
  remoteTagExists,
  todayUtc,
  requireConfirm,
  waitForPrMerged,
} from './lib/release-common.mjs';

const usage = () => {
  console.log('Usage: npm run release:prepare -- --tag vX.Y.Z [--date YYYY-MM-DD] [--remote origin] [--dev dev] [--dry-run] [--no-watch-pr] [--watch-timeout 3600] [--json] [--interactive]');
  console.log('Defaults: --yes and --non-interactive are enabled by default. Use --interactive to prompt.');
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
  const oddEdition = readOddEditionNumber();
  if (tagVersion(tag) !== oddEdition) {
    throw new Error(`Tag '${tag}' does not match odd/lex-0.odd edition n='${oddEdition}'.`);
  }

  const date = typeof opts.get('date') === 'string' ? opts.get('date') : todayUtc();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid --date '${date}'. Expected YYYY-MM-DD.`);
  }

  const remote = typeof opts.get('remote') === 'string' ? opts.get('remote') : 'origin';
  const devBranch = typeof opts.get('dev') === 'string' ? opts.get('dev') : 'dev';
  const interactive = Boolean(opts.get('interactive'));
  const yes = !interactive;
  const dryRun = Boolean(opts.get('dry-run'));
  const nonInteractive = !interactive;
  const watchPr = !Boolean(opts.get('no-watch-pr'));
  const timeoutSeconds = Number(opts.get('watch-timeout') || 3600);
  const json = Boolean(opts.get('json'));

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

  const prepBranch = `chore/release-prep-${tag}`;

  if (localTagExists(tag)) {
    throw new Error(`Tag already exists locally: ${tag}`);
  }
  if (remoteTagExists(remote, tag)) {
    throw new Error(`Tag already exists on ${remote}: ${tag}`);
  }

  const baseSha = remoteSha(remote, devBranch);

  console.log(`Repo remote: ${remote}`);
  console.log(`Dev branch: ${devBranch}`);
  console.log(`Release tag: ${tag}`);
  console.log(`Release date: ${date}`);
  console.log(`ODD edition: ${oddEdition}`);
  console.log(`Prep branch: ${prepBranch}`);

  if (dryRun) {
    console.log(`DRY-RUN: would checkout '${prepBranch}' from '${remote}/${devBranch}'`);
    console.log(`DRY-RUN: would run update-citation-metadata with date/date-released=${date}`);
    console.log('DRY-RUN: would push prep branch and open/reuse PR to dev with auto-merge');
    if (watchPr) console.log(`DRY-RUN: would wait up to ${timeoutSeconds}s for PR merge`);
    return;
  }

  if (!(await requireConfirm(`Create/update prep branch '${prepBranch}' from '${remote}/${devBranch}'?`, { yes, nonInteractive }))) {
    throw new Error('Aborted.');
  }

  run('git', ['checkout', '-B', prepBranch, `${remote}/${devBranch}`], { stdio: 'inherit' });

  run('node', ['scripts/update-citation-metadata.mjs', '--commit', baseSha, '--date', date, '--date-released', date], { stdio: 'inherit' });

  const changed = !run('git', ['diff', '--quiet', '--', 'CITATION.cff'], { allowFail: true }).ok;

  if (changed) {
    run('git', ['add', 'CITATION.cff']);
    run('git', ['commit', '-m', `chore: prepare citation metadata for ${tag}`], { stdio: 'inherit' });

    if (!(await requireConfirm(`Push '${prepBranch}' to '${remote}'?`, { yes, nonInteractive }))) {
      throw new Error('Aborted.');
    }
    run('git', ['push', '--force-with-lease', '-u', remote, prepBranch], { stdio: 'inherit' });
  }

  let prNumber = run('gh', ['pr', 'list', '--head', prepBranch, '--base', devBranch, '--state', 'open', '--json', 'number', '--jq', '.[0].number'], { allowFail: true }).stdout;

  if (!prNumber) {
    if (!changed) {
      console.log('No CITATION metadata changes and no open prep PR found. Release metadata appears already prepared.');
      return;
    }
    if (!(await requireConfirm(`Create PR '${prepBranch}' -> '${devBranch}'?`, { yes, nonInteractive }))) {
      throw new Error('Aborted.');
    }

    run('gh', [
      'pr',
      'create',
      '--base',
      devBranch,
      '--head',
      prepBranch,
      '--title',
      `chore: prepare citation metadata for ${tag}`,
      '--body',
      `Automated release preparation for ${tag} (sets date-released).`,
    ], { stdio: 'inherit' });

    prNumber = run('gh', ['pr', 'view', prepBranch, '--json', 'number', '--jq', '.number']).stdout;
  } else {
    run('gh', [
      'pr',
      'edit',
      prNumber,
      '--title',
      `chore: prepare citation metadata for ${tag}`,
      '--body',
      `Automated release preparation for ${tag} (sets date-released).`,
    ], { stdio: 'inherit' });
  }

  run('gh', ['pr', 'merge', prNumber, '--rebase', '--auto'], { stdio: 'inherit' });

  if (watchPr) {
    await waitForPrMerged(prNumber, { timeoutSeconds });
    const mergedOid = run('gh', ['pr', 'view', prNumber, '--json', 'mergeCommit', '--jq', '.mergeCommit.oid'], { allowFail: true }).stdout;
    if (mergedOid) {
      console.log(`Merged dev commit: ${mergedOid}`);
    } else {
      console.log(`PR #${prNumber} merged.`);
    }
  }

  if (json) {
    const payload = {
      status: 'ok',
      tag,
      date,
      remote,
      devBranch,
      prepBranch,
      prNumber,
      watched: watchPr,
    };
    console.log(JSON.stringify(payload));
  }
};

main().catch((err) => {
  console.error(`release-prepare: ${err.message}`);
  process.exit(1);
});
