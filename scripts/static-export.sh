#!/usr/bin/env bash
# Builds the GitHub Pages variant of the app: a static export with no
# server and no live database. See docs/plan.md and README "What's mocked"
# for the full rationale.
#
# Two things can't be runtime env-var branches because Next.js statically
# parses them as literals (confirmed by testing against this Next version —
# see docs/plan.md): the `dynamic`/`dynamicParams` route-segment config
# exports, and anything using a Server Action ("use server" is entirely
# unsupported with output: "export", even via a dead code path). Both are
# handled here by swapping file contents before the build and restoring
# them from a plain file backup afterward — NOT via `git checkout`, which
# would silently discard any uncommitted work on these files.
#
# Requires lib/static-data.json to already exist (generated locally via
# `npx tsx scripts/generate-static-data.ts` against a live seeded database
# — CI has no database, so this script does not attempt to regenerate it).
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f lib/static-data.json ]; then
  echo "lib/static-data.json is missing. Generate it locally first:" >&2
  echo "  npx tsx scripts/generate-static-data.ts" >&2
  exit 1
fi

SWAPPED_FILES=(
  lib/actions/recommendations.ts
  lib/actions/tasks.ts
  "app/(workspace)/layout.tsx"
  "app/(workspace)/shipments/[id]/page.tsx"
  "app/(workspace)/suppliers/[id]/page.tsx"
)

BACKUP_DIR="$(mktemp -d)"
for f in "${SWAPPED_FILES[@]}"; do
  mkdir -p "$BACKUP_DIR/$(dirname "$f")"
  cp "$f" "$BACKUP_DIR/$f"
done

restore() {
  echo "Restoring dynamic-mode source files..."
  for f in "${SWAPPED_FILES[@]}"; do
    cp "$BACKUP_DIR/$f" "$f"
  done
  rm -rf "$BACKUP_DIR"
}
trap restore EXIT

echo "Swapping in static-export-safe action stand-ins..."
cp lib/actions/recommendations.static.ts lib/actions/recommendations.ts
cp lib/actions/tasks.static.ts lib/actions/tasks.ts

echo "Removing dynamic-only route-segment config for static export..."
# force-dynamic is incompatible with output: "export"; the static build
# just omits the line (default "auto" is what a static export needs).
sed -i '/^export const dynamic = "force-dynamic";$/d' "app/(workspace)/layout.tsx"

# dynamicParams must be a literal `false` for a fully static dynamic route.
for f in "app/(workspace)/shipments/[id]/page.tsx" "app/(workspace)/suppliers/[id]/page.tsx"; do
  sed -i '/^export async function generateStaticParams/i export const dynamicParams = false;\n' "$f"
done

echo "Building static export (STATIC_EXPORT=1)..."
STATIC_EXPORT=1 npx next build

echo "Static export written to ./out"
