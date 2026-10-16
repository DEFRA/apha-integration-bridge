#!/bin/bash

# Waits until the oracledb compose service has finished running the seed scripts
# mounted at /opt/oracle/scripts/startup.
#
# The image healthcheck only reports that the PDB is open, which happens before
# those scripts run, so tests that read seeded rows can start against an empty
# database. The image's runUserScripts.sh logs a marker line once every script
# in the directory has run, so this polls the container log for that line. It
# used to poll for a row from 009_setup_workorders_blank_workarea.sql, which
# stopped being the last script as fixtures were added, so tests could start
# while later scripts were still running.

set -eo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.dev.yml}"
SERVICE="${ORACLE_SERVICE:-oracledb}"
TIMEOUT_SECONDS="${ORACLE_SEED_TIMEOUT_SECONDS:-900}"
POLL_INTERVAL_SECONDS="${ORACLE_SEED_POLL_INTERVAL_SECONDS:-5}"

# Logged by /opt/oracle/runUserScripts.sh after the last startup script.
SEED_DONE_MARKER="DONE: Executing user defined scripts"

echo "[INF] Waiting for oracledb seed scripts to complete..."
echo "[INF] - compose file: $COMPOSE_FILE"
echo "[INF] - timeout: ${TIMEOUT_SECONDS}s"

# True once the marker appears in the log of the container's current run. The
# log is read from the container's last start, so a marker left by an earlier
# run of a restarted container does not count.
seed_scripts_done() {
    local container started_at

    container="$(docker compose -f "$COMPOSE_FILE" ps -q "$SERVICE" 2>/dev/null)" || return 1
    [[ -n $container ]] || return 1

    started_at="$(docker inspect -f '{{.State.StartedAt}}' "$container" 2>/dev/null)" || return 1

    docker compose -f "$COMPOSE_FILE" logs --since "$started_at" "$SERVICE" 2>/dev/null \
        | grep -qF "$SEED_DONE_MARKER"
}

DEADLINE=$((SECONDS + TIMEOUT_SECONDS))

while true; do
    if seed_scripts_done; then
        echo "[INF] Seed scripts have completed. Database is ready."
        exit 0
    fi

    if ((SECONDS >= DEADLINE)); then
        echo "[ERR] Timed out after ${TIMEOUT_SECONDS}s waiting for the seed scripts."
        echo "[ERR] Last 50 lines of oracledb logs:"
        docker compose -f "$COMPOSE_FILE" logs --tail 50 "$SERVICE" || true
        exit 1
    fi

    echo "[INF] Not seeded yet, retrying in ${POLL_INTERVAL_SECONDS}s... (${SECONDS}s elapsed)"
    sleep "$POLL_INTERVAL_SECONDS"
done
