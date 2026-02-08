#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readOddEditionNumber, tagVersion } from './lib/release-common.mjs';

const args = process.argv.slice(2);
const opts = new Map();
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (!arg.startsWith('--')) continue;
  const key = arg.slice(2);
  const next = args[i + 1];
  if (!next || next.startsWith('--')) {
    opts.set(key, true);
  } else {
    opts.set(key, next);
    i++;
  }
}

const jsonOutput = Boolean(opts.get('json'));
const strict = Boolean(opts.get('strict'));
const tag = typeof opts.get('tag') === 'string' ? opts.get('tag') : '';
const remote = typeof opts.get('remote') === 'string' ? opts.get('remote') : 'origin';

const checks = [];

const add = (id, status, message, details = '') => {
  checks.push({ id, status, message, details });
};

const run = (cmd, cmdArgs, { allowFail = false, trim = true } = {}) => {
  const res = spawnSync(cmd, cmdArgs, { encoding: 'utf8' });
  if (res.error) {
    if (!allowFail) throw res.error;
    return { ok: false, code: 1, stdout: '', stderr: String(res.error) };
  }
  const ok = res.status === 0;
  if (!ok && !allowFail) {
    throw new Error(`${cmd} ${cmdArgs.join(' ')} failed: ${res.stderr || res.stdout}`);
  }
  return {
    ok,
    code: res.status ?? 1,
    stdout: trim ? (res.stdout || '').trim() : (res.stdout || ''),
    stderr: trim ? (res.stderr || '').trim() : (res.stderr || ''),
  };
};

const commandExists = (cmd) => run('command', ['-v', cmd], { allowFail: true }).ok;

const parseRemoteSlug = (url) => {
  if (!url) return '';
  const https = url.match(/^https:\/\/github\.com\/([^/]+)\/([^/.]+)(?:\.git)?$/);
  if (https) return `${https[1]}/${https[2]}`;
  const ssh = url.match(/^git@github\.com:([^/]+)\/([^/.]+)(?:\.git)?$/);
  if (ssh) return `${ssh[1]}/${ssh[2]}`;
  return '';
};

const hasRuleType = (ruleset, type) => Array.isArray(ruleset?.rules) && ruleset.rules.some((r) => r?.type === type);

const requiredChecks = (ruleset) => {
  const rule = Array.isArray(ruleset?.rules) ? ruleset.rules.find((r) => r?.type === 'required_status_checks') : null;
  return rule?.parameters?.required_status_checks?.map((r) => r.context).filter(Boolean) || [];
};

try {
  if (!commandExists('git')) {
    add('prereq.git', 'fail', 'git is not available in PATH.');
  } else {
    add('prereq.git', 'pass', 'git is available.');
  }

  if (!commandExists('gh')) {
    add('prereq.gh', 'fail', 'gh is not available in PATH.');
  } else {
    add('prereq.gh', 'pass', 'gh is available.');
  }

  if (checks.some((c) => c.status === 'fail')) throw new Error('Missing required CLI tools.');

  const inRepo = run('git', ['rev-parse', '--is-inside-work-tree'], { allowFail: true });
  if (!inRepo.ok || inRepo.stdout !== 'true') {
    add('repo.inside', 'fail', 'Not inside a git repository.');
    throw new Error('Not in git repository.');
  }
  add('repo.inside', 'pass', 'Inside a git repository.');

  const ghAuth = run('gh', ['auth', 'status'], { allowFail: true, trim: false });
  if (!ghAuth.ok) {
    add('auth.gh', 'fail', 'gh is not authenticated.', ghAuth.stderr || ghAuth.stdout);
    throw new Error('gh not authenticated.');
  }
  add('auth.gh', 'pass', 'gh authentication is configured.');

  const remoteUrlRes = run('git', ['remote', 'get-url', remote], { allowFail: true });
  if (!remoteUrlRes.ok || !remoteUrlRes.stdout) {
    add('repo.remote', 'fail', `Remote '${remote}' does not exist.`);
    throw new Error('Remote missing.');
  }
  const repoSlug = parseRemoteSlug(remoteUrlRes.stdout);
  if (!repoSlug) {
    add('repo.slug', 'fail', `Remote '${remote}' is not a GitHub URL: ${remoteUrlRes.stdout}`);
    throw new Error('Unsupported remote URL.');
  }
  add('repo.slug', 'pass', `Resolved repository slug: ${repoSlug}`);

  const dirty = run('git', ['status', '--porcelain=v1'], { allowFail: true, trim: false });
  if (!dirty.ok) {
    add('repo.clean', 'fail', 'Unable to evaluate working tree cleanliness.');
  } else if (dirty.stdout.trim().length > 0) {
    add('repo.clean', 'warn', 'Working tree is not clean.', 'release scripts may stop under strict-clean policy.');
  } else {
    add('repo.clean', 'pass', 'Working tree is clean.');
  }

  const branchRes = run('git', ['branch', '--show-current'], { allowFail: true });
  if (branchRes.ok && branchRes.stdout) {
    if (branchRes.stdout === 'dev') {
      add('repo.branch', 'pass', "Current branch is 'dev'.");
    } else {
      add('repo.branch', 'warn', `Current branch is '${branchRes.stdout}', not 'dev'.`);
    }
  } else {
    add('repo.branch', 'warn', 'Unable to determine current branch (possibly detached HEAD).');
  }

  run('git', ['fetch', remote, '--tags'], { allowFail: false });
  add('repo.fetch', 'pass', `Fetched '${remote}' branches/tags.`);

  const mainRef = `${remote}/main`;
  const devRef = `${remote}/dev`;
  const hasMain = run('git', ['show-ref', '--verify', '--quiet', `refs/remotes/${mainRef}`], { allowFail: true }).ok;
  const hasDev = run('git', ['show-ref', '--verify', '--quiet', `refs/remotes/${devRef}`], { allowFail: true }).ok;
  if (!hasMain || !hasDev) {
    add('repo.refs', 'fail', `Missing remote refs: ${!hasMain ? mainRef : ''} ${!hasDev ? devRef : ''}`.trim());
    throw new Error('Missing refs.');
  }
  add('repo.refs', 'pass', `Found remote refs '${mainRef}' and '${devRef}'.`);

  const diverge = run('git', ['rev-list', '--left-right', '--count', `${mainRef}...${devRef}`]);
  const parts = diverge.stdout.split('\t');
  const mainOnly = Number(parts[0] || 0);
  const devOnly = Number(parts[1] || 0);
  if (mainOnly > 0 && devOnly > 0) {
    add('topology.ff', 'fail', `Branches diverged: main-only=${mainOnly}, dev-only=${devOnly}.`);
  } else if (devOnly === 0) {
    add('topology.ff', 'warn', 'No new commits to promote from dev to main.', `main-only=${mainOnly}, dev-only=${devOnly}`);
  } else {
    add('topology.ff', 'pass', `Fast-forwardable: main-only=${mainOnly}, dev-only=${devOnly}.`);
  }

  if (tag) {
    if (!/^v\d+\.\d+\.\d+$/.test(tag)) {
      add('tag.format', 'fail', `Invalid tag format '${tag}' (expected vX.Y.Z).`);
    } else {
      add('tag.format', 'pass', `Tag format is valid: ${tag}.`);
    }

    const localTag = run('git', ['rev-parse', '-q', '--verify', `refs/tags/${tag}`], { allowFail: true });
    if (localTag.ok) {
      add('tag.local', 'fail', `Tag already exists locally: ${tag}.`);
    } else {
      add('tag.local', 'pass', `Tag not present locally: ${tag}.`);
    }

    const remoteTag = run('git', ['ls-remote', '--tags', remote, tag], { allowFail: true });
    if (remoteTag.ok && remoteTag.stdout) {
      add('tag.remote', 'fail', `Tag already exists on ${remote}: ${tag}.`);
    } else {
      add('tag.remote', 'pass', `Tag not present on ${remote}: ${tag}.`);
    }

    try {
      const oddEdition = readOddEditionNumber();
      if (tagVersion(tag) === oddEdition) {
        add('tag.odd_edition_match', 'pass', `Tag version matches odd/lex-0.odd edition n='${oddEdition}'.`);
      } else {
        add('tag.odd_edition_match', 'fail', `Tag version '${tagVersion(tag)}' does not match odd/lex-0.odd edition n='${oddEdition}'.`);
      }
    } catch (err) {
      add('tag.odd_edition_match', 'fail', 'Unable to validate tag against odd/lex-0.odd edition.', String(err?.message || err));
    }
  } else {
    add('tag.input', 'warn', 'No --tag provided; skipping tag collision checks.');
  }

  const rulesetsRes = run('gh', ['api', `repos/${repoSlug}/rulesets`], { allowFail: true, trim: false });
  if (!rulesetsRes.ok) {
    add('rulesets.read', 'fail', 'Unable to read rulesets via GitHub API.', rulesetsRes.stderr || rulesetsRes.stdout);
  } else {
    const list = JSON.parse(rulesetsRes.stdout || '[]');
    const rulesets = [];
    for (const item of list) {
      if (!item?.id) continue;
      const detail = run('gh', ['api', `repos/${repoSlug}/rulesets/${item.id}`], { allowFail: true, trim: false });
      if (detail.ok) {
        rulesets.push(JSON.parse(detail.stdout || '{}'));
      }
    }
    const byRef = (ref) => rulesets.find((rs) => rs?.target === 'branch' && rs?.conditions?.ref_name?.include?.includes(ref));
    const mainRuleset = byRef('refs/heads/main');
    const devRuleset = byRef('refs/heads/dev');

    if (!devRuleset) {
      add('rules.dev.exists', 'fail', 'No active branch ruleset found for dev.');
    } else {
      add('rules.dev.exists', 'pass', `Found dev ruleset '${devRuleset.name}'.`);
      add('rules.dev.pr', hasRuleType(devRuleset, 'pull_request') ? 'pass' : 'fail', hasRuleType(devRuleset, 'pull_request') ? 'dev requires PRs.' : 'dev does not require PRs.');
      const devChecks = requiredChecks(devRuleset);
      add('rules.dev.check_citation', devChecks.includes('check_citation') ? 'pass' : 'fail', devChecks.includes('check_citation') ? "dev requires 'check_citation'." : "dev is missing required status check 'check_citation'.");
      add('rules.dev.pr_check', devChecks.includes('pr') ? 'pass' : 'warn', devChecks.includes('pr') ? "dev requires 'pr' check." : "dev does not require 'pr' check (doc may need alignment).");
    }

    if (!mainRuleset) {
      add('rules.main.exists', 'fail', 'No active branch ruleset found for main.');
    } else {
      add('rules.main.exists', 'pass', `Found main ruleset '${mainRuleset.name}'.`);
      add('rules.main.no_pr', hasRuleType(mainRuleset, 'pull_request') ? 'fail' : 'pass', hasRuleType(mainRuleset, 'pull_request') ? 'main still requires PRs (breaks FF-only promotion).' : 'main does not require PRs (FF-only compatible).');
      const mainChecks = requiredChecks(mainRuleset);
      add('rules.main.no_required_checks', mainChecks.length > 0 ? 'fail' : 'pass', mainChecks.length > 0 ? `main has required checks: ${mainChecks.join(', ')}` : 'main has no required status checks (FF-only compatible).');
      add('rules.main.non_ff_block', hasRuleType(mainRuleset, 'non_fast_forward') ? 'pass' : 'warn', hasRuleType(mainRuleset, 'non_fast_forward') ? 'main blocks non-fast-forward pushes.' : 'main does not block non-fast-forward pushes.');
      add('rules.main.linear', hasRuleType(mainRuleset, 'required_linear_history') ? 'pass' : 'warn', hasRuleType(mainRuleset, 'required_linear_history') ? 'main requires linear history.' : 'main does not require linear history.');
    }
  }

  const workflowsRes = run('gh', ['workflow', 'list', '--all', '--repo', repoSlug], { allowFail: true, trim: false });
  if (!workflowsRes.ok) {
    add('workflows.list', 'warn', 'Unable to list workflows with gh workflow list.');
  } else {
    const list = workflowsRes.stdout;
    const hasBuild = /\bbuild-site\b/.test(list);
    const hasCiteMeta = /\bcitation-metadata\b/.test(list);
    const hasReleaseHelper = /\brelease-helper\b/.test(list);
    add('workflows.build_site', hasBuild ? 'pass' : 'fail', hasBuild ? 'Workflow build-site exists.' : 'Workflow build-site is missing.');
    add('workflows.citation_metadata', hasCiteMeta ? 'pass' : 'warn', hasCiteMeta ? 'Workflow citation-metadata exists.' : 'Workflow citation-metadata is missing (manual fallback unavailable).');
    add('workflows.release_helper', hasReleaseHelper ? 'pass' : 'warn', hasReleaseHelper ? 'Workflow release-helper is visible to GitHub.' : 'Workflow release-helper not visible (may be absent on default branch).');
  }

  const citeMetaFile = run('git', ['show', `${devRef}:.github/workflows/citation-metadata.yml`], { allowFail: true, trim: false });
  if (!citeMetaFile.ok) {
    add('wf.citation_metadata.file', 'fail', 'Cannot read citation-metadata workflow from origin/dev.');
  } else {
    const text = citeMetaFile.stdout;
    const hasPushTrigger = /(^|\n)\s*push:\s*/m.test(text);
    const hasWorkflowDispatch = /(^|\n)\s*workflow_dispatch:\s*/m.test(text);
    add('wf.citation_metadata.manual_only', !hasPushTrigger ? 'pass' : 'warn', !hasPushTrigger ? 'citation-metadata is not triggered on every dev push (manual/explicit use only).' : 'citation-metadata still has push trigger enabled.');
    add('wf.citation_metadata.dispatch', hasWorkflowDispatch ? 'pass' : 'warn', hasWorkflowDispatch ? 'citation-metadata supports manual dispatch.' : 'citation-metadata has no workflow_dispatch trigger.');
  }

  const releaseHelperFile = run('git', ['show', `${devRef}:.github/workflows/release-helper.yml`], { allowFail: true, trim: false });
  if (!releaseHelperFile.ok) {
    add('wf.release_helper.file', 'fail', 'Cannot read release-helper workflow from origin/dev.');
  } else {
    const text = releaseHelperFile.stdout;
    add('wf.release_helper.dispatch', /workflow_dispatch:/m.test(text) ? 'pass' : 'fail', /workflow_dispatch:/m.test(text) ? 'release-helper supports manual dispatch.' : 'release-helper lacks workflow_dispatch.');
    add('wf.release_helper.no_main_write', /git\s+push\s+origin\s+main/m.test(text) ? 'fail' : 'pass', /git\s+push\s+origin\s+main/m.test(text) ? 'release-helper still pushes main directly.' : 'release-helper does not push main directly.');
  }

  const siteBuildFile = run('git', ['show', `${devRef}:.github/workflows/site-build.yml`], { allowFail: true, trim: false });
  if (!siteBuildFile.ok) {
    add('wf.site_build.file', 'fail', 'Cannot read site-build workflow from origin/dev.');
  } else {
    const text = siteBuildFile.stdout;
    const hasGuard = /date-released:[^\n]*\[0-9\]\{4\}-\[0-9\]\{2\}-\[0-9\]\{2\}/.test(text) || /CITATION\.cff on tag .*date-released/m.test(text);
    add('wf.site_build.date_released_guard', hasGuard ? 'pass' : 'warn', hasGuard ? 'site-build contains date-released guard for tags.' : 'site-build date-released guard not detected.');
  }

  const secrets = run('gh', ['secret', 'list', '--repo', repoSlug], { allowFail: true, trim: false });
  if (!secrets.ok) {
    add('secrets.list', 'warn', 'Unable to list repository secrets.');
  } else {
    const hasCiteToken = /^CITATION_BOT_TOKEN\b/m.test(secrets.stdout);
    add('secrets.citation_bot_token', hasCiteToken ? 'pass' : 'warn', hasCiteToken ? 'CITATION_BOT_TOKEN exists (manual citation workflow available).' : 'CITATION_BOT_TOKEN missing (manual citation workflow cannot push PRs).');
  }

  const devCitation = run('git', ['show', `${devRef}:CITATION.cff`], { allowFail: true, trim: false });
  if (!devCitation.ok) {
    add('citation.dev.file', 'fail', 'Cannot read CITATION.cff from origin/dev.');
  } else {
    const text = devCitation.stdout;
    const match = text.match(/^date-released:\s*(.+)$/m);
    if (!match) {
      add('citation.dev.date_released', 'fail', 'origin/dev CITATION.cff is missing date-released.');
    } else {
      const val = match[1].trim().replace(/^"|"$/g, '');
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
        add('citation.dev.date_released', 'pass', `origin/dev date-released is set (${val}).`);
      } else {
        add('citation.dev.date_released', 'fail', `origin/dev date-released is invalid (${match[1].trim()}).`);
      }
    }
  }
} catch (err) {
  add('doctor.runtime', 'fail', 'release-doctor encountered an unexpected error.', String(err?.message || err));
}

let failCount = checks.filter((c) => c.status === 'fail').length;
let warnCount = checks.filter((c) => c.status === 'warn').length;
const passCount = checks.filter((c) => c.status === 'pass').length;

if (strict && warnCount > 0) {
  failCount += warnCount;
  warnCount = 0;
}

const summary = {
  pass: passCount,
  warn: warnCount,
  fail: failCount,
  strict,
  ok: failCount === 0,
};

if (jsonOutput) {
  console.log(JSON.stringify({ summary, checks }, null, 2));
} else {
  for (const c of checks) {
    const label = c.status.toUpperCase().padEnd(4, ' ');
    console.log(`[${label}] ${c.id} - ${c.message}`);
    if (c.details) console.log(`       ${c.details}`);
  }
  console.log('');
  console.log(`Summary: pass=${summary.pass} warn=${summary.warn} fail=${summary.fail}${strict ? ' (strict mode)' : ''}`);
}

process.exit(summary.ok ? 0 : 1);
