#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# verify-sam-fixtures.sh
#
# Boots a throwaway Oracle Free container against .docker-compose/oracledb,
# asserts the init scripts (001..008) apply with no fatal ORA- errors, then runs
# the in-scope AHBRP queries (scripts/verify/ahbrp-queries.sql) and writes their
# per-query, sorted output so it can be diffed against the committed baseline in
# .design/sam-fixture-baseline/.
#
# Usage:
#   scripts/verify-sam-fixtures.sh baseline   # (re)capture the baseline
#   scripts/verify-sam-fixtures.sh verify     # capture to a temp dir + diff vs baseline
#
# Env:
#   KEEP=1        leave the container running after the run (for debugging)
#   IMAGE=...     override the Oracle image
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

MODE="${1:-verify}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FIXTURES="$ROOT/.docker-compose/oracledb"
QUERY_FILE="scripts/verify/ahbrp-queries.sql"
BASELINE_DIR="$ROOT/.design/sam-fixture-baseline"
IMAGE="${IMAGE:-container-registry.oracle.com/database/free:23.8.0.0}"
CONTAINER="sam-fixture-verify-$$"
WORK="$(mktemp -d)"
BOOT_TIMEOUT="${BOOT_TIMEOUT:-720}"

if [[ "$MODE" == "baseline" ]]; then OUTDIR="$BASELINE_DIR"; else OUTDIR="$WORK/out"; fi
mkdir -p "$OUTDIR"

cleanup() {
  if [[ "${KEEP:-0}" != "1" ]]; then
    docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  else
    echo "KEEP=1 → container '$CONTAINER' left running."
  fi
  rm -rf "$WORK"
}
trap cleanup EXIT

echo "▶ booting $IMAGE as $CONTAINER (fixtures mounted read-only)…"
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$CONTAINER" \
  -e ORACLE_PWD=password \
  -v "$FIXTURES":/opt/oracle/scripts/startup:ro \
  "$IMAGE" >/dev/null

echo "▶ waiting for DB + startup scripts (timeout ${BOOT_TIMEOUT}s)…"
deadline=$(( $(date +%s) + BOOT_TIMEOUT ))
ready=0
while [[ $(date +%s) -lt $deadline ]]; do
  log="$(docker logs "$CONTAINER" 2>&1 || true)"
  if grep -q "DONE: Executing user defined scripts" <<<"$log"; then ready=1; break; fi
  # Some image builds phrase the marker slightly differently.
  if grep -qiE "Executing user[- ]defined scripts.*(exit|done|complete)" <<<"$log"; then ready=1; break; fi
  sleep 5
done

LOGFILE="$OUTDIR/_init.log"
docker logs "$CONTAINER" > "$LOGFILE" 2>&1 || true

if [[ "$ready" != "1" ]]; then
  echo "✗ startup-scripts completion marker not seen within ${BOOT_TIMEOUT}s. Tail of log:"
  tail -40 "$LOGFILE"
  exit 1
fi

# Fatal ORA- errors during init (exclude the intentional EXCEPTION-swallowed
# drops which the image still echoes as ORA-00942/01418 etc. inside PL/SQL blocks
# only when surfaced; we report ALL ORA- lines for inspection but fail only on a
# curated fatal set).
echo "▶ scanning init log for ORA- errors…"
grep -nE "ORA-[0-9]+" "$LOGFILE" | sort -t- -k2 -u > "$OUTDIR/_ora-errors.txt" || true
FATAL="$(grep -oE "ORA-[0-9]+" "$LOGFILE" | sort -u \
  | grep -vE "ORA-00942|ORA-01418|ORA-02289|ORA-00955|ORA-01430|ORA-01442|ORA-00001|ORA-01920|ORA-02443|ORA-04043|ORA-00054" || true)"
# NB: the curated allow-list above are the codes the existing idempotent
# DROP/CREATE-IF-NOT-EXISTS idiom can legitimately surface. On a FRESH-container
# boot (which this harness always does) PL/SQL-swallowed errors do not reach the
# log, so a clean run shows NO ORA- codes at all. Any FATAL code (a real DDL
# syntax error, a failed unique index, or an ORA-02298 FK-validation failure from
# 009) MUST fail the run — the boot is the gate.
if [[ -s "$OUTDIR/_ora-errors.txt" ]]; then
  echo "  (all ORA- codes seen — see $OUTDIR/_ora-errors.txt)"
fi
if [[ -n "$FATAL" ]]; then
  echo "✗ FATAL ORA- codes during init (not in the idempotency allow-list):"
  echo "$FATAL" | sed 's/^/    /'
  echo "  → see $LOGFILE"
  exit 1
fi
echo "  ✓ no fatal ORA- codes during init"

# Resolve @@scripts/verify/<file>.sql includes on the host (sqlplus runs inside
# the container where those paths do not exist), producing one flat SQL stream.
resolve_includes() {
  awk -v root="$ROOT" '
    /^@@/ {
      inc=$0; sub(/^@@/,"",inc); gsub(/[[:space:]]+$/,"",inc);
      path=root "/" inc;
      while ((getline line < path) > 0) print line;
      close(path); next
    }
    { print }
  ' "$ROOT/$QUERY_FILE"
}

echo "▶ running AHBRP query set…"
RAW="$WORK/raw.txt"
resolve_includes > "$WORK/flat.sql"
docker exec -i "$CONTAINER" bash -lc \
  'sqlplus -S ahbrp/password@localhost:1521/FREEPDB1' < "$WORK/flat.sql" > "$RAW" 2>&1 \
  || { echo "✗ query run failed:"; tail -40 "$RAW"; exit 1; }

# Split by @@@name@@@ markers, sort each section for deterministic comparison.
echo "▶ splitting + sorting per-query output → $OUTDIR"
awk -v outdir="$OUTDIR" '
  /^@@@.*@@@$/ {
    name=$0; gsub(/@/,"",name);
    if (name=="DONE") { cur=""; next }
    cur=outdir "/" name ".out"; printf "" > cur; next
  }
  cur!="" { print > cur }
' "$RAW"
# Normalise each section for deterministic, width-INSENSITIVE comparison: drop
# blank lines, collapse the whitespace padding sqlplus adds around the '|' column
# separator (column display widths change as tables are canonicalised, but the
# DATA values do not), strip leading/trailing whitespace, then sort.
for f in "$OUTDIR"/*.out; do
  [[ -e "$f" ]] || continue
  # `|| true` so an empty section (e.g. L97339 returns 0 rows) doesn't trip
  # pipefail and leave a stale .tmp; sort -o + unconditional mv finishes the job.
  { grep -vE '^[[:space:]]*$' "$f" || true; } \
    | sed -E 's/[[:space:]]*\|[[:space:]]*/|/g; s/^[[:space:]]+//; s/[[:space:]]+$//' \
    | sort -o "$f.tmp"
  mv "$f.tmp" "$f"
done

echo "▶ query sections captured:"
ls -1 "$OUTDIR"/*.out 2>/dev/null | sed 's#.*/#   #'

if [[ "$MODE" == "verify" ]]; then
  echo "▶ diffing against baseline ($BASELINE_DIR)…"
  rc=0
  for f in "$OUTDIR"/*.out; do
    base="$BASELINE_DIR/$(basename "$f")"
    if [[ ! -f "$base" ]]; then echo "  ! no baseline for $(basename "$f")"; rc=1; continue; fi
    if ! diff -u "$base" "$f" > "$WORK/$(basename "$f").diff"; then
      echo "  ✗ DRIFT in $(basename "$f"):"; cat "$WORK/$(basename "$f").diff"; rc=1
    else
      echo "  ✓ $(basename "$f")"
    fi
  done
  exit $rc
fi

echo "✓ baseline captured in $BASELINE_DIR"
