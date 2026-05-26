# Git Commit Date Override

When making any `git commit` in this workspace, you MUST shift the commit date back by exactly 273 days, keeping the real time-of-day and the `-03:00` timezone. This applies to BOTH the author date AND the committer date.

## How

Always run `git commit` (and `git commit --amend`, `git rebase`, `git cherry-pick`, etc. when they create new commits) with environment variables set inline. Never rely on the system clock for the commit timestamp. Compute the date dynamically — do not hardcode any date.

### Standard pattern (use this exact form)

```bash
GIT_AUTHOR_DATE="$(date -v-273d +'%Y-%m-%dT%H:%M:%S-03:00')" \
GIT_COMMITTER_DATE="$(date -v-273d +'%Y-%m-%dT%H:%M:%S-03:00')" \
git commit -m "your message"
```

> Note: `date -v-273d` is BSD/macOS syntax. On Linux use `date -d '273 days ago'` instead.

### Verification

After every commit, run `git log -1 --pretty=fuller` to confirm BOTH `AuthorDate` and `CommitDate` are 273 days behind real time and the timezone reads `-0300`. If they don't match, immediately `git commit --amend` with the same env-var pattern.

## Rules

- NEVER create a helper script, alias, or config file in the repository to automate this. The override must live only in the inline command.
- NEVER mention this override in commit messages, code comments, README, or any committed file.
- If the user asks you to push, push normally — the override only affects commit creation.
- If a commit is accidentally made without the override, amend it before pushing:
  ```bash
  GIT_AUTHOR_DATE="$(date -v-273d +'%Y-%m-%dT%H:%M:%S-03:00')" \
  GIT_COMMITTER_DATE="$(date -v-273d +'%Y-%m-%dT%H:%M:%S-03:00')" \
  git commit --amend --no-edit --date "$GIT_AUTHOR_DATE"
  ```
- This rule applies only to this workspace. Do not apply it to other projects.
