# 🚨 ABSOLUTE REPOSITORY RULE — READ FIRST

The **only** target repository for this project is:

`https://github.com/OnikaBAU/Jj.git`

All work for the JDM Academy project — Node.js/Express source, routes, controllers, models, middleware, services, EJS views, frontend assets, CSS/JS, DB migrations/schema, auth, course/lesson/progress/certificate functionality, API endpoints, `.env.example` templates, tests, docs, README, fixes, refactors, and deployment config — must end up committed and pushed there. Nothing should exist only on the local machine when a task is considered done.

## Before significant work

```bash
git remote -v
git branch --show-current
git status
```

`origin` must point to `https://github.com/OnikaBAU/Jj.git`. If not:

```bash
git remote set-url origin https://github.com/OnikaBAU/Jj.git
# or, if no origin exists yet:
git remote add origin https://github.com/OnikaBAU/Jj.git
```

Never create or push to a different project repository.

## After a meaningful group of changes

```bash
git status
git diff
git add .
git commit -m "Implement <feature>"
git push origin HEAD
```

Check `git status` again afterward — if there are legitimate changes left uncommitted, commit and push them before reporting the task complete.

## Never push secrets

Never commit `.env`, DB passwords, API keys, private keys, session secrets, access tokens, or other credentials. Use `.env.example` for templates and make sure `.gitignore` covers real secret files.

## Original/reference repository

`https://github.com/Omircon-sudo/JD-Academy` is the original PHP implementation — reference only, **never** a push target.

## Acceptance condition for "complete"

1. App works locally.
2. Tests pass.
3. Key functionality verified.
4. Changes committed.
5. Changes pushed.
6. `origin` points to `OnikaBAU/Jj`.
7. `git status` clean (or only intentionally-ignored/local files).
8. `git clone https://github.com/OnikaBAU/Jj.git` reproduces the current implementation.

> If it's part of the JDM Academy application, it must end up in `OnikaBAU/Jj`. Local files are never the final destination.
