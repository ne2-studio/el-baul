# Scheduling gap-scout on the VPS

`./scripts/gap-scout scan <app|api|both>` dispatches one interactive `claude` session per
scope into its own window inside the `backlog` tmux session (the same one
`./scripts/backlog run` uses), creating that session if it doesn't exist yet, and returns
immediately — it doesn't wait for the session(s) to finish. That makes it safe and cheap to
call from a systemd timer.

It runs **interactively, not headless** (`-p`) on purpose: a headless session that hits a
permission prompt it can't resolve from `--allowed-tools` has no one to ask and just hangs
forever with no way to reach it. An interactive session pauses in its tmux window instead —
attach and answer it, same as any other prompt from `./scripts/backlog`'s worker.

## 1. Service unit

`/etc/systemd/system/gap-scout.service`:

```ini
[Unit]
Description=Lanza un escaneo de architecture-gap-scout en tmux
After=network-online.target

[Service]
Type=oneshot
User=<user>
WorkingDirectory=/path/to/el-baul
ExecStart=/path/to/el-baul/scripts/gap-scout scan both
# needed if claude/gh/tmux aren't on systemd's default PATH:
Environment=PATH=/usr/local/bin:/usr/bin:/bin:/home/<user>/.local/bin
```

`ExecStart` only *dispatches* the tmux windows and exits — it doesn't run the scan itself,
so this unit finishes in a second or two regardless of how long the scan takes.

## 2. Timer unit

`/etc/systemd/system/gap-scout.timer`:

```ini
[Unit]
Description=Lanza gap-scout.service semanalmente

[Timer]
OnCalendar=Mon 06:00
Persistent=true
RandomizedDelaySec=30m

[Install]
WantedBy=timers.target
```

## 3. Enable

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now gap-scout.timer
systemctl list-timers gap-scout.timer   # next run
```

## 4. Run once without waiting for the timer

```bash
sudo systemctl start gap-scout.service   # returns immediately, doesn't block
tmux attach -t backlog                   # watch it, or check in later
```

If a scan for a given scope is already running when the timer fires again, that scope is
skipped (logged, not queued) rather than starting a second overlapping session — check
`journalctl -u gap-scout.service` if a scan seems to never get picked up.

## Prerequisites

* `gh auth status` already authenticated as the service's `User` (or `GH_TOKEN` set in
  `Environment`).
* `claude` on `PATH` and already logged in (or `ANTHROPIC_API_KEY` in `Environment`).
* `tmux` installed.

See [`README.md`](README.md) for how filed issues get from proposal to approved ticket.
