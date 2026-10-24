#!/usr/bin/env python3
"""Patch the inspected standalone worker, without touching its queue or publishing code."""
from pathlib import Path
import sys, shutil, datetime, os
root = Path(sys.argv[1] if len(sys.argv) > 1 else '/home/deploy/useshowwork-functions')
p = root / 'lib/aiGenerationJob.ts'
s = p.read_text()
marker = '// Showwork request/result compatibility v1'
if marker in s:
    print('Compatibility patch already installed.')
    sys.exit(0)
# Refuse to edit an implementation different from the one reviewed.
assert s.count('return rows[0] || null;') == 2, 'Unexpected job reader; no changes made'
assert s.count('  const sets: string[] = [];') == 1, 'Unexpected update function; no changes made'
assert s.count('  if (sets.length === 0) return;') == 1, 'Unexpected update function; no changes made'
helper = '''
// Showwork request/result compatibility v1
function normalizeGenerationJob(row: any): AiGenerationJobRecord | null {
  if (!row) return null;
  const valid = (v: any) => v !== null && typeof v === 'object' && !Array.isArray(v);
  return { ...row, payload: valid(row.request) ? row.request : row.payload };
}
'''
s = s.replace('let tableEnsured = false;', helper + '\nlet tableEnsured = false;')
s = s.replace('return rows[0] || null;', 'return normalizeGenerationJob(rows[0]);')
s = s.replace('  const sets: string[] = [];', '''  // Keep failures readable by both the legacy worker and current website.
  if (update.error && update.result === undefined) {
    update = { ...update, result: { error: update.error } };
  }
  if ((update.status === 'FAILED' || update.status === 'COMPLETED') &&
      (!update.result || typeof update.result !== 'object' || Array.isArray(update.result))) {
    update = { ...update, status: 'FAILED', result: {
      error: 'Generation returned no result. Check your drafts before retrying.'
    } };
  }
  const sets: string[] = [];''')
s = s.replace('  if (sets.length === 0) return;', '''  if (sets.length === 0) return;
  sets.push('"updatedAt" = NOW()');
  if (update.status === 'COMPLETED' || update.status === 'FAILED') {
    sets.push('"httpStatus" = $' + (idx++));
    values.push(update.status === 'COMPLETED' ? 200 : 500);
  }''')
assert marker in s
backup = p.with_name(p.name + '.backup-' + datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
shutil.copy2(p, backup)
stat = p.stat()
p.write_text(s)
os.chown(p, stat.st_uid, stat.st_gid)
print('Patched:', p)
print('Backup:', backup)
print('No service restarted. Build and verify the image before deployment.')
