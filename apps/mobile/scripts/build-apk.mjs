// Builds a standalone release APK (JS bundled in, signed with the debug key) for test installs.
// The API URL comes from .env.production.local, which release bundling prefers over .env.local.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const envFile = join(root, '.env.production.local');

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

if (!existsSync(envFile)) {
  fail(
    'Missing apps/mobile/.env.production.local.\n' +
      '  Create it with your deployed web app, e.g.\n' +
      '  EXPO_PUBLIC_API_URL=https://your-app.vercel.app'
  );
}
const apiUrl = readFileSync(envFile, 'utf8')
  .match(/^EXPO_PUBLIC_API_URL=(.*)$/m)?.[1]
  ?.trim()
  .replace(/\/+$/, '');
if (!apiUrl?.startsWith('https://')) {
  // Release builds block plain HTTP, so a LAN address would fail on the phone.
  fail(`EXPO_PUBLIC_API_URL in .env.production.local must be an https:// URL (got "${apiUrl ?? ''}").`);
}

console.log(`Checking ${apiUrl} …`);
try {
  const res = await fetch(`${apiUrl}/api/auth/ok`, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
} catch (error) {
  fail(`The API at ${apiUrl} isn't answering (${error.message}). Deploy the web app first.`);
}

const run = (command, args, cwd) => {
  console.log(`\n> ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: true });
  if (result.status !== 0) fail(`${command} failed.`);
};

// Regenerates android/ only where app.json or plugins changed; hand edits there are not kept.
run('npx', ['expo', 'prebuild', '--platform', 'android'], root);
// Full path: some Windows setups don't run commands from the current folder.
const androidDir = join(root, 'android');
run(
  `"${join(androidDir, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew')}"`,
  ['assembleRelease'],
  androidDir
);

console.log(
  `\n✔ Built ${join(root, 'android/app/build/outputs/apk/release/app-release.apk')}\n` +
    `  Talks to ${apiUrl}. Install it with: adb install -r <that path>\n`
);
