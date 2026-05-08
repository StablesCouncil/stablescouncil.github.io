# Website Archive Policy

When retiring a shipped site snapshot, old authoring tree, generated output, or duplicate website family, move the entire folder under `3_archive/stream_1_app/` using a dated task name.

## Rules

1. Preserve the original interior paths.
2. Include a short `README.md` in the archive task folder stating source date, live commit SHA if known, and why it was archived.
3. Never delete archive material permanently.
4. Never ship from archive. If historical content is useful, port it deliberately into `1_development/stream_1_app/website/` and run the publish-baseline guard.

