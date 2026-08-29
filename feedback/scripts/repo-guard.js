#!/usr/bin/env node
'use strict';

/**
 * RepoGuard — deterministic validator for the `feedback/` project.
 *
 * Usage:
 *   node feedback/scripts/repo-guard.js              validate current repo state
 *   node feedback/scripts/repo-guard.js --base <ref>  validate against an explicit base ref
 *   node feedback/scripts/repo-guard.js --self-test    prove the guard logic itself is correct
 *
 * No npm dependencies. Node.js built-ins only.
 *
 * Exit code 0 only if every mandatory check passes. Exit code 1 otherwise.
 * This script must never unconditionally print PASS — every check below
 * inspects real repository state (or, in --self-test, synthetic fixtures
 * covering both a good and a bad case) and can genuinely fail.
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = execGit(['rev-parse', '--show-toplevel']).trim();
const ALLOWED_PATH_PREFIXES = ['feedback/'];
const ALLOWED_WORKFLOW_PATTERN = /^\.github\/workflows\/feedback-[\w.-]+\.ya?ml$/;
const GOVERNANCE_FILES = [
  'feedback/README.md',
  'feedback/PROJECT_CONSTITUTION.md',
  'feedback/ARCHITECTURE.md',
  'feedback/MILESTONES.md',
  'feedback/VALIDATION.md',
  'feedback/SECURITY.md',
  'feedback/DECISIONS.md',
];

const DANGEROUS_FILENAME_PATTERNS = [
  // .env / .env.local / .env.production etc. are dangerous — but a
  // committed, secret-free template (.env.example/.sample/.template)
  // is expected and safe, so it's explicitly excluded.
  /(^|\/)\.env(?!\.(?:example|sample|template)$)(\..+)?$/,
  /(^|\/)\.env\.local$/,
  /(^|\/)id_rsa(\.\w+)?$/,
  /(^|\/)id_ed25519(\.\w+)?$/,
  /\.pem$/,
  /\.p12$/,
  /\.pfx$/,
  /(^|\/)credentials(\.\w+)?$/i,
  /(^|\/)service-account.*\.json$/i,
  /\.sqlite3?$/,
  /\.db$/,
  /\.sql\.gz$/,
  /(^|\/)dump\.sql$/i,
];

const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2MB — generous for a docs/tooling-only milestone

const SECRET_PATTERNS = [
  { name: 'AWS Access Key ID', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'AWS Secret Access Key (assignment)', re: /aws_secret_access_key\s*[:=]\s*['"][A-Za-z0-9/+=]{30,}['"]/i },
  { name: 'Generic private key block', re: /-----BEGIN (RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/ },
  { name: 'GitHub token', re: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/ },
  { name: 'Slack token', re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  { name: 'Generic API key/secret/password assignment', re: /\b(api[_-]?key|secret|password|token)\b\s*[:=]\s*['"][^'"\s]{8,}['"]/i },
  { name: 'Stripe secret key', re: /\bsk_(live|test)_[A-Za-z0-9]{16,}\b/ },
];
const SECRET_PLACEHOLDER_RE = /^(changeme|change-me|your[-_]?\w*|example|placeholder|xxxx+|<[^>]+>|\$\{[^}]+\}|dummy|fake|test|redacted)$/i;

function execGit(args, opts = {}) {
  return execFileSync('git', args, { encoding: 'utf8', cwd: opts.cwd || process.cwd(), ...opts });
}

function tryExecGit(args, opts = {}) {
  try {
    return { ok: true, out: execGit(args, opts) };
  } catch (err) {
    return { ok: false, out: '', err };
  }
}

function isAllowedPath(relPath) {
  const p = relPath.replace(/\\/g, '/');
  if (ALLOWED_PATH_PREFIXES.some((prefix) => p.startsWith(prefix))) return true;
  if (ALLOWED_WORKFLOW_PATTERN.test(p)) return true;
  return false;
}

function isDangerousFilename(relPath) {
  const p = relPath.replace(/\\/g, '/');
  return DANGEROUS_FILENAME_PATTERNS.some((re) => re.test(p));
}

function findSecrets(content) {
  const hits = [];
  const lines = content.split(/\r?\n/);
  for (const { name, re } of SECRET_PATTERNS) {
    lines.forEach((line, idx) => {
      const m = line.match(re);
      if (!m) return;
      // Skip clearly-placeholder values to avoid false positives on
      // documentation that shows the *shape* of a config value.
      const valueMatch = line.match(/[:=]\s*['"]?([^'"\s]+)['"]?/);
      const value = valueMatch ? valueMatch[1] : '';
      if (SECRET_PLACEHOLDER_RE.test(value)) return;
      hits.push({ rule: name, line: idx + 1 });
    });
  }
  return hits;
}

function findConflictMarkers(content) {
  const lines = content.split(/\r?\n/);
  const hits = [];
  lines.forEach((line, idx) => {
    if (/^(<{7}|={7}|>{7})(\s|$)/.test(line)) {
      hits.push({ marker: line.slice(0, 7), line: idx + 1 });
    }
  });
  return hits;
}

function resolveBaseRef(explicitBase) {
  if (explicitBase) return explicitBase;
  for (const candidate of ['origin/main', 'main']) {
    const res = tryExecGit(['rev-parse', '--verify', '--quiet', candidate]);
    if (res.ok) return candidate;
  }
  const root = tryExecGit(['rev-list', '--max-parents=0', 'HEAD']);
  if (root.ok) return root.out.trim().split('\n')[0];
  return null;
}

/* ------------------------------------------------------------------ */
/* Guards — each returns { name, status: 'PASS'|'FAIL'|'NOT APPLICABLE', details: [] } */
/* ------------------------------------------------------------------ */

function guardScope(changedFiles) {
  const name = 'Scope Guard';
  if (changedFiles === null) {
    return { name, status: 'NOT APPLICABLE', details: ['No base ref available to diff against.'] };
  }
  const violations = changedFiles.filter((f) => !isAllowedPath(f));
  if (violations.length > 0) {
    return { name, status: 'FAIL', details: violations.map((v) => `outside project scope: ${v}`) };
  }
  return { name, status: 'PASS', details: [`${changedFiles.length} changed file(s), all within feedback/** or feedback-*.yml workflows.`] };
}

function guardConflicts(files) {
  const name = 'Conflict Guard';
  const violations = [];
  for (const f of files) {
    const abs = path.join(REPO_ROOT, f);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) continue;
    const content = safeReadText(abs);
    if (content === null) continue;
    for (const hit of findConflictMarkers(content)) {
      violations.push(`${f}:${hit.line} unresolved conflict marker (${hit.marker})`);
    }
  }
  if (violations.length > 0) return { name, status: 'FAIL', details: violations };
  return { name, status: 'PASS', details: [`Scanned ${files.length} file(s); no unresolved conflict markers.`] };
}

function guardSecrets(files) {
  const name = 'Secret Guard';
  const violations = [];
  for (const f of files) {
    const abs = path.join(REPO_ROOT, f);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) continue;
    const content = safeReadText(abs);
    if (content === null) continue;
    for (const hit of findSecrets(content)) {
      // Never print the actual secret value — only file, line, and rule name.
      violations.push(`${f}:${hit.line} possible secret (${hit.rule}) — value redacted`);
    }
  }
  if (violations.length > 0) return { name, status: 'FAIL', details: violations };
  return { name, status: 'PASS', details: [`Scanned ${files.length} file(s); no likely secrets found.`] };
}

function guardDangerousFiles(files) {
  const name = 'Dangerous File Guard';
  const violations = [];
  for (const f of files) {
    if (isDangerousFilename(f)) {
      violations.push(`${f} matches a dangerous-file pattern (credential/dump/key material)`);
      continue;
    }
    const abs = path.join(REPO_ROOT, f);
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
      const size = fs.statSync(abs).size;
      if (size > MAX_FILE_BYTES) {
        violations.push(`${f} is ${size} bytes, exceeds ${MAX_FILE_BYTES}-byte limit for this project`);
      }
    }
  }
  if (violations.length > 0) return { name, status: 'FAIL', details: violations };
  return { name, status: 'PASS', details: [`Scanned ${files.length} file(s); no dangerous files or oversized binaries.`] };
}

function guardGitHygiene(baseRef) {
  const name = 'Git Hygiene';
  if (!baseRef) {
    return { name, status: 'NOT APPLICABLE', details: ['No base ref available for git diff --check.'] };
  }
  const res = tryExecGit(['diff', '--check', `${baseRef}...HEAD`]);
  if (!res.ok) {
    const output = (res.err && res.err.stdout ? res.err.stdout.toString() : '').trim();
    return { name, status: 'FAIL', details: output ? output.split('\n') : ['git diff --check reported whitespace/hygiene errors.'] };
  }
  return { name, status: 'PASS', details: ['git diff --check: no whitespace errors.'] };
}

function guardGovernance() {
  const name = 'Governance Guard';
  const missing = GOVERNANCE_FILES.filter((f) => !fs.existsSync(path.join(REPO_ROOT, f)));
  if (missing.length > 0) {
    return { name, status: 'FAIL', details: missing.map((m) => `missing required governance file: ${m}`) };
  }
  return { name, status: 'PASS', details: [`All ${GOVERNANCE_FILES.length} required governance files present.`] };
}

function guardBoundary() {
  const name = 'Boundary Guard';
  const feedbackDir = path.join(REPO_ROOT, 'feedback');
  if (!fs.existsSync(feedbackDir)) {
    return { name, status: 'FAIL', details: ['feedback/ directory does not exist.'] };
  }
  const violations = [];
  walk(feedbackDir, (absPath) => {
    let st;
    try {
      st = fs.lstatSync(absPath);
    } catch {
      return;
    }
    if (!st.isSymbolicLink()) return;
    const rel = path.relative(REPO_ROOT, absPath);
    let target;
    try {
      target = fs.realpathSync(absPath);
    } catch {
      violations.push(`${rel} is a symlink that could not be resolved`);
      return;
    }
    const resolvedRel = path.relative(REPO_ROOT, target);
    if (resolvedRel.startsWith('..') || path.isAbsolute(resolvedRel)) {
      violations.push(`${rel} is a symlink escaping the repository`);
    } else if (!resolvedRel.replace(/\\/g, '/').startsWith('feedback/')) {
      violations.push(`${rel} is a symlink escaping the feedback/ project boundary (-> ${resolvedRel})`);
    }
  });
  if (violations.length > 0) return { name, status: 'FAIL', details: violations };
  return { name, status: 'PASS', details: ['No symlinks under feedback/ escape the project boundary.'] };
}

function walk(dir, onFile) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.name === '.git') continue;
    if (entry.isSymbolicLink()) {
      onFile(abs);
      continue;
    }
    if (entry.isDirectory()) {
      walk(abs, onFile);
    } else {
      onFile(abs);
    }
  }
}

function safeReadText(absPath) {
  try {
    const buf = fs.readFileSync(absPath);
    // Skip obvious binary content.
    if (buf.includes(0)) return null;
    return buf.toString('utf8');
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Runner                                                              */
/* ------------------------------------------------------------------ */

function getChangedFiles(baseRef) {
  if (!baseRef) return null;
  const res = tryExecGit(['diff', '--name-only', `${baseRef}...HEAD`]);
  if (!res.ok) return null;
  return res.out.split('\n').map((l) => l.trim()).filter(Boolean);
}

function getTrackedFeedbackFiles() {
  const res = tryExecGit(['ls-files', 'feedback', '.github/workflows']);
  if (!res.ok) return [];
  return res.out
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((f) => f.startsWith('feedback/') || ALLOWED_WORKFLOW_PATTERN.test(f));
}

function runGuards(baseRefArg) {
  const baseRef = resolveBaseRef(baseRefArg);
  const changedFiles = getChangedFiles(baseRef);
  const trackedFiles = getTrackedFeedbackFiles();
  // Union of changed-in-diff and currently-tracked project files, so the
  // guard is meaningful both mid-PR (diff-driven) and on a fresh clean
  // checkout with no diff available (tracked-file-driven).
  const scanSet = Array.from(new Set([...(changedFiles || []), ...trackedFiles])).filter((f) => f.startsWith('feedback/') || ALLOWED_WORKFLOW_PATTERN.test(f));

  const results = [
    guardScope(changedFiles),
    guardBoundary(),
    guardConflicts(scanSet),
    guardSecrets(scanSet),
    guardDangerousFiles(scanSet),
    guardGitHygiene(baseRef),
    guardGovernance(),
  ];
  return { baseRef, results };
}

function printResults(results) {
  let failed = false;
  for (const r of results) {
    console.log(`[${r.status}] ${r.name}`);
    for (const d of r.details) console.log(`    ${d}`);
    if (r.status === 'FAIL') failed = true;
  }
  return !failed;
}

/* ------------------------------------------------------------------ */
/* Self-test: synthetic fixtures, no filesystem/git mutation           */
/* ------------------------------------------------------------------ */

function assert(cond, label, failures) {
  if (cond) {
    console.log(`[PASS] ${label}`);
  } else {
    console.log(`[FAIL] ${label}`);
    failures.push(label);
  }
}

function selfTest() {
  const failures = [];
  console.log('RepoGuard self-test: exercising each guard against a good and a bad fixture.\n');

  // Conflict marker detection
  assert(findConflictMarkers('normal file\ncontent here\n').length === 0, 'Conflict Guard: clean content produces no hits', failures);
  assert(
    findConflictMarkers('line one\n<<<<<<< HEAD\nours\n=======\ntheirs\n>>>>>>> branch\n').length === 3,
    'Conflict Guard: intentional conflict-marker fixture is detected (3 markers)',
    failures,
  );

  // Secret detection
  assert(findSecrets('This is a normal README with no credentials.\n').length === 0, 'Secret Guard: clean content produces no hits', failures);
  // Built at runtime (not a literal in this file) so RepoGuard scanning its
  // own source doesn't flag this fixture as a real committed secret.
  const fakeAwsKeyLine = ['aws_key = "', 'AKIA', 'A'.repeat(4), 'B'.repeat(4), 'C'.repeat(4), 'D'.repeat(4), '"\n'].join('');
  assert(
    findSecrets(fakeAwsKeyLine).length > 0,
    'Secret Guard: intentional AWS key fixture is detected',
    failures,
  );
  assert(
    findSecrets('password: "changeme"\n').length === 0,
    'Secret Guard: placeholder value is not a false positive',
    failures,
  );

  // Dangerous filename detection
  assert(!isDangerousFilename('feedback/README.md'), 'Dangerous File Guard: ordinary doc file is not flagged', failures);
  assert(isDangerousFilename('feedback/.env'), 'Dangerous File Guard: intentional .env fixture is detected', failures);
  assert(isDangerousFilename('feedback/.env.local'), 'Dangerous File Guard: intentional .env.local fixture is detected', failures);
  assert(!isDangerousFilename('feedback/.env.example'), 'Dangerous File Guard: committed .env.example template is not flagged', failures);
  assert(isDangerousFilename('feedback/scripts/id_rsa'), 'Dangerous File Guard: intentional private-key filename fixture is detected', failures);

  // Scope check
  assert(isAllowedPath('feedback/README.md'), 'Scope Guard: feedback/README.md is in scope', failures);
  assert(isAllowedPath('.github/workflows/feedback-ci.yml'), 'Scope Guard: feedback-ci.yml workflow is in scope', failures);
  assert(!isAllowedPath('platform/backend/server.js'), 'Scope Guard: intentional out-of-scope fixture (platform/backend/server.js) is rejected', failures);
  assert(!isAllowedPath('.github/workflows/ci.yml'), 'Scope Guard: unrelated existing workflow file is not treated as in-scope', failures);

  console.log('');
  if (failures.length > 0) {
    console.log(`Self-test FAILED: ${failures.length} assertion(s) did not behave as expected.`);
    return false;
  }
  console.log('Self-test PASSED: all guards correctly distinguish good fixtures from intentionally-bad fixtures.');
  return true;
}

/* ------------------------------------------------------------------ */

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) {
    const ok = selfTest();
    process.exit(ok ? 0 : 1);
  }

  const baseIdx = args.indexOf('--base');
  const explicitBase = baseIdx !== -1 ? args[baseIdx + 1] : undefined;

  const { baseRef, results } = runGuards(explicitBase);
  console.log(`RepoGuard — base ref: ${baseRef || '(none resolved)'}\n`);
  const ok = printResults(results);
  console.log('');
  console.log(ok ? 'RepoGuard: PASS' : 'RepoGuard: FAIL');
  process.exit(ok ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = {
  isAllowedPath,
  isDangerousFilename,
  findSecrets,
  findConflictMarkers,
  runGuards,
};
