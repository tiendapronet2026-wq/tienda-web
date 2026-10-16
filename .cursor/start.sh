#!/usr/bin/env bash
# Per-boot startup for the TiendaPro Cloud Agent environment.
# Brings up the Docker daemon and the local Supabase stack, then returns so the
# terminals (npm run dev) can start. Must be idempotent and tolerate restarts.
set -euo pipefail

cd "$(dirname "$0")/.."

log() { echo "[start] $*"; }

# --- 1. Docker daemon -------------------------------------------------------
# The VM has no systemd, so dockerd is launched manually. overlay2 is not
# supported on the nested overlay rootfs, so fuse-overlayfs is used (configured
# in /etc/docker/daemon.json, captured in the base snapshot).
if ! sudo docker info >/dev/null 2>&1; then
  log "Starting Docker daemon (fuse-overlayfs)..."
  # overlay2 is unavailable on the nested overlay rootfs; pin fuse-overlayfs.
  if [ ! -f /etc/docker/daemon.json ]; then
    sudo mkdir -p /etc/docker
    echo '{"storage-driver":"fuse-overlayfs"}' | sudo tee /etc/docker/daemon.json >/dev/null
  fi
  # Remove a stale pid left behind by a snapshot taken while dockerd was running.
  sudo rm -f /var/run/docker.pid 2>/dev/null || true
  sudo sh -c 'setsid dockerd >/tmp/dockerd.log 2>&1 < /dev/null &'
  for i in $(seq 1 60); do
    if sudo docker info >/dev/null 2>&1; then break; fi
    sleep 2
  done
  if ! sudo docker info >/dev/null 2>&1; then
    log "ERROR: Docker daemon did not become ready. Recent log:"
    tail -n 40 /tmp/dockerd.log || true
    exit 1
  fi
fi
log "Docker daemon is ready."

# Let the current user talk to the daemon socket without sudo (supabase CLI).
sudo chmod 666 /var/run/docker.sock 2>/dev/null || true

# In nested Docker, routing bridged traffic through iptables can break
# container-to-container connectivity; disable it (best effort, not fatal).
echo 0 | sudo tee /proc/sys/net/bridge/bridge-nf-call-iptables >/dev/null 2>&1 || true

# --- 2. Supabase local stack ------------------------------------------------
# Idempotent: `supabase start` is a no-op if the stack is already running.
log "Starting local Supabase stack (this can take a minute on a cold boot)..."
supabase start || {
  log "supabase start reported an error; retrying once after a short delay..."
  sleep 5
  supabase start
}

# --- 3. Readiness check -----------------------------------------------------
log "Waiting for the Supabase API gateway on :54321..."
for i in $(seq 1 60); do
  if curl -fsS -m 3 "http://127.0.0.1:54321/rest/v1/" -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" >/dev/null 2>&1; then
    log "Supabase API is responding."
    break
  fi
  sleep 2
done

log "Startup complete. Supabase Studio: http://127.0.0.1:54323 | App: http://localhost:3000"
