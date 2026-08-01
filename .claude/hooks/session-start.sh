#!/usr/bin/env bash
# Keep remote session startup offline unless the locked dependencies are unusable.
set +e

project=${CLAUDE_PROJECT_DIR:-}
if [[ "$project" =~ ^([A-Za-z]):\\ ]]; then
  project="/${BASH_REMATCH[1],,}/${project:3}"
  project=${project//\\//}
fi
[ -n "$project" ] && [ -f "$project/package.json" ] || exit 0
cd "$project" || exit 0
node "$project/scripts/ensure-research-dependencies.mjs" >/dev/null 2>&1 || true
exit 0
