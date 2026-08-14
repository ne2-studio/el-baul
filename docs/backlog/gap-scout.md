# Scheduling gap-scout on the VPS

`./scripts/gap-scout scan <app|api|both> --yolo` runs headless (`claude -p
--dangerously-skip-permissions`), one scope after another, blocking until done — no tmux, no
prompts, nothing forwarded to your phone. That's the mode meant for a systemd timer.

`--yolo` is reasonable specifically for this skill (unlike `work-ticket`'s `--yolo`, which
also skips the commit/push approval): `gap-scout-runner` never touches git or edits code, so
the only thing being unblocked is shell access to a read-only inspection, not a write path.
The scout runs a lot of ad-hoc shell pipelines (churn analysis, grep/sed chains) that a
narrow allow-list can't realistically cover, so without `--yolo` it would need approval
often enough to make an unattended timer impractical. It still means no technical safety net
if something in the repo's content tried to steer the agent — see
[`../../.claude/skills/architecture-gap-scout/`](../../.claude/skills/architecture-gap-scout)
for what it's constrained to do regardless.

(Without `--yolo`, `scan` instead dispatches an interactive session per scope into its own
window inside the `backlog` tmux session — same one `./scripts/backlog run` uses — so you
can answer a prompt it can't resolve. Useful to run by hand once in a while; not what you
want unattended, since a stuck prompt just sits there until you attach.)

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
ExecStart=/path/to/el-baul/scripts/gap-scout scan both --yolo
# needed if claude/gh aren't on systemd's default PATH:
Environment=PATH=/usr/local/bin:/usr/bin:/bin:/home/<user>/.local/bin
```

This blocks for as long as the scan takes (both scopes, sequentially) — that's fine for a
scheduled job; `--yolo` is what guarantees it can't hang on an unanswerable prompt.

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
sudo systemctl start gap-scout.service   # blocks until the scan finishes
journalctl -u gap-scout.service -f       # watch it from another shell
```

## Prerequisites

* `gh auth status` already authenticated as the service's `User` (or `GH_TOKEN` set in
  `Environment`) — needs write access to issues/labels on this repo.
* `claude` on `PATH` and already logged in (or `ANTHROPIC_API_KEY` in `Environment`) — `-p`
  is non-interactive, it can't prompt for login mid-run.

See [`README.md`](README.md) for how filed issues get from proposal to approved ticket.
