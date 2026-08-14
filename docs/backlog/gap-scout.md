# Scheduling gap-scout on the VPS

`./scripts/gap-scout scan <app|api|both>` is read-only over the code — it only creates GitHub
issues (label `gap-scout`) — so it's safe to run unattended on a schedule via a systemd timer.

## 1. Service unit

`/etc/systemd/system/gap-scout.service`:

```ini
[Unit]
Description=Escaneo periódico de architecture-gap-scout
After=network-online.target

[Service]
Type=oneshot
User=<user>
WorkingDirectory=/path/to/el-baul
ExecStart=/path/to/el-baul/scripts/gap-scout scan both
# needed if claude/gh aren't on systemd's default PATH:
Environment=PATH=/usr/local/bin:/usr/bin:/bin:/home/<user>/.local/bin
```

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
sudo systemctl start --no-block gap-scout.service
journalctl -u gap-scout.service -f
```

## Prerequisites

* `gh auth status` already authenticated as the service's `User` (or `GH_TOKEN` set in
  `Environment`).
* `claude` on `PATH` and already logged in (or `ANTHROPIC_API_KEY` in `Environment`) — `-p` is
  non-interactive, it can't prompt for login mid-run.

See [`README.md`](README.md) for how filed issues get from proposal to approved ticket.
