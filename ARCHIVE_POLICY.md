# Archive policy (same structure, frozen in time)

When retiring a shipped site snapshot or an old authoring tree, move the **entire** folder under **`3_archive/stream_1_app/`** using a dated task name, for example:

`3_archive/stream_1_app/task_archived_github_pages_root_YYYY-MM-DD/github_pages_root/`

**Rules**

1. **Preserve interior paths** (`devtools/`, `minima-archive/`, `assets/`, …) exactly as they were at promotion time. Do not flatten or rename inside the archive slice.
2. **Include a short `README.md`** in the archive task folder stating source date, live commit SHA if known, and why it was archived.
3. **Never delete** archive material; only **move** under **`3_archive/`** per handshake.

**Reference:** prior **`webpages/pages`** tree (pre-unification) lives at **`3_archive/stream_1_app/task_archived_webpages_pages_2026-04-16/pages/`**.
