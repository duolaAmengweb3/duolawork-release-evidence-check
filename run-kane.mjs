import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const baseScenario = [
  'Open the demo and verify the header reads Revision 1 approved.',
  'In Rollout settings select 10% for Canary traffic, keep the Rollback threshold at 2%, and click Apply rollout.',
  'Verify the header reads Revision 2 awaiting approval, Canary check shows Needs update, Rollback check shows Verified, and Approve revision is disabled.',
];

const scenarios = {
  matching: [
    ...baseScenario,
    'Click Attach matching sample. Verify Canary check shows Verified and its measurement shows 10 of 100 requests.',
    'Verify Approve revision is enabled, click it, and verify the header reads Revision 2 approved.',
  ],
  offTarget: [
    ...baseScenario,
    'Click Attach off-target sample. Verify Canary check shows Failed and its measurement shows 9 of 100 requests.',
    'Verify the header still reads Revision 2 awaiting approval, Rollback check shows Verified, and Approve revision stays disabled.',
  ],
};

const selected = process.argv.slice(2);
const names = selected.length > 0 ? selected : Object.keys(scenarios);
if (names.some((name) => !Object.hasOwn(scenarios, name))) {
  console.error('Choose matching, offTarget, or both.');
  process.exit(2);
}

const serverUrl = `http://127.0.0.1:${Number(process.env.PORT || 8144)}/`;
try {
  const response = await fetch(serverUrl, { redirect: 'error', signal: AbortSignal.timeout(3000) });
  if (!response.ok || !(await response.text()).includes('<title>Release Evidence Check</title>')) {
    throw new Error('The expected app is not running.');
  }
} catch {
  console.error(`Start Release Evidence Check using npm start at ${serverUrl} before running Kane.`);
  process.exit(2);
}

const stamp = new Date().toISOString().replaceAll(':', '-');
const outputDir = join('artifacts', stamp);

for (const name of names) {
  const args = ['run', scenarios[name].join(' '), '--url', serverUrl, '--headless', '--agent', '--max-steps', '24', '--timeout', '180'];
  const report = await new Promise((resolve, reject) => {
    const cli = spawn('kane-cli', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    cli.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk; });
    cli.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk; });
    cli.once('error', reject);
    cli.once('close', (code) => resolve({ code, stdout, stderr }));
  }).catch((error) => {
    console.error(error.code === 'ENOENT' ? 'The official kane-cli binary is missing from PATH.' : 'Could not start kane-cli.');
    return null;
  });

  if (!report) {
    process.exitCode = 2;
    break;
  }

  await mkdir(outputDir, { recursive: true, mode: 0o700 });
  const trace = join(outputDir, `${name}.ndjson`);
  await writeFile(trace, report.stdout, { mode: 0o600 });
  if (report.stderr) await writeFile(join(outputDir, `${name}.stderr.txt`), report.stderr, { mode: 0o600 });

  let verdict = 'unknown';
  for (const line of report.stdout.split('\n')) {
    try {
      const event = JSON.parse(line);
      if (event.type === 'run_end') verdict = event.status;
    } catch {}
  }
  const passed = report.code === 0 && verdict === 'passed';
  console.log(JSON.stringify({ scenario: name, passed, exitCode: report.code, verdict, trace }));
  if (!passed) process.exitCode = 1;
}
