#!/usr/bin/env node
import { loadDeliveryHandoff, renderDeliveryHandoff } from './lib/delivery-handoff.mjs';
try {
  if (process.argv.length !== 4) throw new Error('Usage: node scripts/render-delivery-handoff.mjs <delivery-manifest.json> <target-directory>');
  process.stdout.write(renderDeliveryHandoff(await loadDeliveryHandoff(process.argv[2], process.argv[3])));
} catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
