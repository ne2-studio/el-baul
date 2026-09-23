#!/bin/bash
set -e
state_file=".run-env-state"
touch "$state_file"

port_in_use() {
  (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null
}

is_ours() { grep -qx "$1" "$state_file" 2>/dev/null; }
add_state() { is_ours "$1" || echo "$1" >> "$state_file"; }
remove_state() { grep -vx "$1" "$state_file" > "$state_file.tmp" 2>/dev/null || true; mv "$state_file.tmp" "$state_file"; }

cmd="$1"
case "$cmd" in
  frontend-dev)
    if is_ours full-stack; then
      remove_state full-stack
      echo "Reconciled: stopped previous full-stack environment owned by this helper."
    fi
    add_state frontend-dev
    cat <<'EOF'
Mode: frontend-dev
Frontend: http://localhost:5173
Backend: http://localhost:5051 (api-lite)
Frontend source: Vite dev server (hot reload)
Backend source: el-baul-api-lite (in-memory)
Health: frontend ok, api-lite ok, fake-oidc ok
Test user: user (fake-oidc)
Logs: ./scripts/run-env logs frontend-dev
Cleanup: ./scripts/run-env cleanup
EOF
    ;;
  backend-dev)
    if port_in_use 5050 && ! is_ours backend-dev && ! is_ours full-stack; then
      echo "ERROR: port 5050 is already in use by a process not managed by run-env. Refusing to start backend-dev. Free the port or identify the owning process, then retry." >&2
      exit 1
    fi
    if is_ours full-stack; then
      remove_state full-stack
      echo "Reconciled: stopped previous full-stack environment owned by this helper."
    fi
    add_state backend-dev
    cat <<'EOF'
Mode: backend-dev
Frontend: none
Backend: http://localhost:5050
Frontend source: none
Backend source: dotnet run (real API)
Health: backend ok, postgres ok, minio ok, imgproxy ok, fake-oidc ok, mailpit ok
Test user: admin (fake-oidc)
Logs: ./scripts/run-env logs backend-dev
Cleanup: ./scripts/run-env cleanup
EOF
    ;;
  full-stack)
    if port_in_use 5050 && ! is_ours backend-dev && ! is_ours full-stack; then
      echo "ERROR: port 5050 is already in use by a process not managed by run-env. Refusing to start full-stack. Free the port or identify the owning process, then retry." >&2
      exit 1
    fi
    if is_ours backend-dev; then
      remove_state backend-dev
      echo "Reconciled: stopped previous backend-dev environment owned by this helper."
    fi
    add_state full-stack
    cat <<'EOF'
Mode: full-stack
Frontend: http://localhost:3000
Backend: http://localhost:5050
Frontend source: Docker image (consumer app)
Backend source: Docker image (real API)
Health: app ok, admin ok, backend ok, postgres ok, minio ok, imgproxy ok, fake-oidc ok, mailpit ok
Test user: admin (fake-oidc)
Logs: ./scripts/run-env logs full-stack
Cleanup: ./scripts/run-env cleanup
EOF
    ;;
  logs)
    target_mode="$2"
    service="$3"
    if [ "$target_mode" = "full-stack" ] && [ "$service" = "backend" ]; then
      cat <<'EOF'
[backend] info: Microsoft.Hosting.Lifetime[14] Now listening on: http://[::]:5050
[backend] info: Microsoft.Hosting.Lifetime[0] Application started. Press Ctrl+C to shut down.
[backend] info: Microsoft.Hosting.Lifetime[0] Hosting environment: Production
EOF
    elif [ "$target_mode" = "full-stack" ]; then
      echo "[app] [admin] [backend] combined log stream for full-stack"
    else
      echo "log stream for $target_mode ${service:+($service)}"
    fi
    ;;
  cleanup)
    if [ -s "$state_file" ]; then
      echo "Stopping: $(paste -sd, "$state_file")"
    else
      echo "Nothing to stop."
    fi
    : > "$state_file"
    echo "Cleanup complete. All ports released."
    ;;
  *)
    echo "run-env stub: unsupported command '$cmd'" >&2
    exit 1
    ;;
esac
