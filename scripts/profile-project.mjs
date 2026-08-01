import { profileProject, validateProjectProfile } from './lib/project-profiler.mjs';

try {
  if (process.argv.length !== 3) throw new Error('Usage: node scripts/profile-project.mjs <target-directory>');
  const profile = await profileProject(process.argv[2]); const result = validateProjectProfile(profile);
  if (!result.valid) throw new Error(`Profile contract failure: ${JSON.stringify(result.errors)}`);
  process.stdout.write(`${JSON.stringify(profile, null, 2)}\n`);
} catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
