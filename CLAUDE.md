# Victoria Dashboard — MAVIS Operating Rules

This file is read automatically by Claude Code at the start of every session.
These rules apply to all work on the `erickamegeddd/Victoria` repository.

---

## 1. Branch rules — NEVER push directly to `main`

- All development happens on the `develop` branch or a `feature/*` branch cut from `develop`.
- `main` is protected. Changes reach `main` only through a Pull Request that has been approved by the human owner.
- After a PR merges to `main`, re-assign the alias manually:
  ```
  POST https://api.vercel.com/v2/deployments/{uid}/aliases
  body: { "alias": "victoria-ericka3.vercel.app" }
  ```
  (Token, team, and project IDs are in session memory.)
- **Emergency exception:** If the dashboard is broken in production and a hotfix is needed immediately, document the emergency in the PR description and proceed — but still open the PR; do not silently bypass it.

---

## 2. Protected resources — do not touch without explicit approval

| Resource | ID / Reference | Why protected |
|---|---|---|
| Production Supabase | `vuqflofuzhybutkkzroa.supabase.co` | Live client data — 44 ISOs, 478 merchants, 1048 residuals |
| Production Vercel project | `prj_uXOlwe440E80E0vEL0QJR4An9Cnl` | Serves `victoria-ericka3.vercel.app` |
| Vercel alias | `victoria-ericka3.vercel.app` | Client-facing production URL |
| Old Vercel project | `prj_Y3EKIWrvrrxIkEzChU3Sj1TQPHGc` → `victoria-paydiverse.vercel.app` | **DO NOT TOUCH** — separate production |

---

## 3. Supabase rules

- **Never run** `DROP`, `TRUNCATE`, or `DELETE` without a `WHERE` clause against the production Supabase project.
- **Never run** schema changes (ALTER TABLE, CREATE TABLE, DROP COLUMN) directly against production without a written migration file committed to `supabase/migrations/`.
- All Supabase queries against `residuals` must use `fetchAllPaginated()` / `sbGetAll()` — hard 1000-row cap applies.
- `UPDATE` and `DELETE` on residuals require the `service_role` key (not the anon key). Vercel env var: `SUPABASE_SERVICE_KEY`.

---

## 4. API file rules (`api/victoria.js`)

- This is the most sensitive file. Changes here affect the AI chat responses seen by the client.
- Before editing: state explicitly what behavior will change and why.
- After editing: run a test against the live `/api/victoria` endpoint with at least one real question before considering the change done.
- The MODELS array uses Groq. If a model name is changed, verify it against `/api/ping` first (or query Groq's `/openai/v1/models` endpoint directly).
- Current working models (verified 2026-08-17): `openai/gpt-oss-120b`, `groq/compound`, `openai/gpt-oss-20b`

---

## 5. Commit discipline

- **One logical change per commit.** Never combine unrelated fixes.
- Commit message format: `type: short description` (e.g. `fix: ...`, `feat: ...`, `chore: ...`)
- Before any change that touches `api/victoria.js`, the Supabase schema, or Vercel env vars — create a checkpoint commit first:
  ```
  checkpoint: before [description of upcoming change]
  ```
- After a successful client-approved production deploy, tag the release:
  ```
  git tag v2026-MM-DD && git push origin --tags
  ```

---

## 6. What to check before calling a change "done"

1. `npm run build` exits with no errors.
2. The dashboard loads at `victoria-ericka3.vercel.app` (HTTP 200).
3. The correct all-time PayDiverse net is visible: **$433,404.50**.
4. Ask Victoria returns a clean plain-text answer for "ISO Performance".
5. No raw markdown (`**`, `|`, `<think>`) visible in any Victoria response.

---

## 7. Deferred items (do not implement without explicit instruction)

- Separate Supabase dev environment — blocked on migrations baseline first.
- Feature flags — not needed at current project scale.
- `agents` table population — source is Dropbox Victoria Project / Schedule A.
- Per-ISO payment expected dates — Ericka to provide schedule.

---

## 8. Key credentials locations

Credentials are stored in MAVIS session memory and Vercel environment variables.
Never paste API keys, tokens, or passwords into this file or into chat.
