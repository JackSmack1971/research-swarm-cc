const ARCHIVE_ROOT = 'artifacts/research-runs';
const SAFE_SEGMENT = /^[a-z0-9](?:[a-z0-9_-]{0,61}[a-z0-9])?$/;
const WINDOWS_DEVICES = new Set(['con', 'prn', 'aux', 'nul', ...Array.from({ length: 9 }, (_, index) => `com${index + 1}`), ...Array.from({ length: 9 }, (_, index) => `lpt${index + 1}`)]);

function decoded(value) {
  let result = value;
  for (let index = 0; index < 3 && result.includes('%'); index += 1) {
    try { result = decodeURIComponent(result); } catch { throw new Error('outputRoot must not contain malformed percent encoding.'); }
  }
  return result;
}

function safeSegment(segment) {
  return SAFE_SEGMENT.test(segment) && !WINDOWS_DEVICES.has(segment.toLowerCase());
}

export function safeArchiveRoot(value = ARCHIVE_ROOT) {
  if (typeof value !== 'string' || !value || value !== decoded(value) || value.length > 200 || /[\\:\0-\x1f\x7f~]/.test(value) || value.startsWith('/')) {
    throw new Error('outputRoot must be a safe relative archive path.');
  }
  const segments = value.split('/');
  if (segments.some((segment) => !safeSegment(segment)) || segments[0] !== 'artifacts' || segments[1] !== 'research-runs') {
    throw new Error('outputRoot must be artifacts/research-runs or a safe descendant.');
  }
  return segments.join('/');
}

export function querySlug(query, maximum = 48) {
  const slug = String(query ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, maximum).replace(/-+$/g, '');
  return safeSegment(slug) ? slug : 'research';
}

export function createRunId(query, now = Date.now(), random = Math.random) {
  const timestamp = Math.max(0, Number(now) || 0).toString(36);
  const nonce = Math.floor(Math.max(0, Math.min(0.9999999999999999, Number(random()) || 0)) * 0x1000000000000).toString(36).padStart(9, '0');
  return `run_${querySlug(query)}_${timestamp}_${nonce}`;
}

export function createRunDirectory(outputRoot, query, now, random) {
  return `${safeArchiveRoot(outputRoot)}/${createRunId(query, now, random)}`;
}

export { ARCHIVE_ROOT };
