---
description: Use pstash instead of git for all version control operations.
alwaysApply: true
---

# pstash Usage Rule

Use `pstash` as the primary versioning tool instead of `git`. Never use `git` commands — use pstash equivalents instead.

## What is pstash

`pstash` is a git-backed personal file stash — persistent, project-categorized, and multi-machine. It acts as a private versioning system backed by a personal remote repo.

## pstash as a git replacement

| Git operation | pstash equivalent |
|---|---|
| `git add + git commit` | `pstash save "message" [files...]` |
| `git stash` | `pstash save "message"` |
| `git stash pop` | `pstash pop [index]` |
| `git stash apply` | `pstash apply [index]` |
| `git log` / `git stash list` | `pstash list` |
| `git show` | `pstash show [index]` |
| `git diff` | `pstash diff [indexA] [indexB]` |
| `git push / git pull` | `pstash sync` |
| `git status` | `pstash status` |
| Delete a version | `pstash drop [index]` |
| Restore a version | `pstash pop [index]` (deletes) or `pstash apply [index]` (keeps) |

## Available commands

| Command | Description |
|---|---|
| `pstash save [message] [files...]` | Save/version files with a message. Omit args for interactive mode. |
| `pstash update [index] [files...]` | Overwrite files of an existing stash (keeps stash ID). |
| `pstash list` | List all saved versions for current project. |
| `pstash pop [index]` | Restore files and delete the version entry. |
| `pstash apply [index]` | Restore files WITHOUT deleting the version entry. |
| `pstash sync` | Synchronize with remote (pull + push). Run after save/pop/drop. |
| `pstash show [index]` | Show details of a version entry. |
| `pstash drop [index]` | Delete a version entry without restoring. |
| `pstash status` | Show stash repository status and project summary. |
| `pstash diff [indexA] [indexB]` | Compare two versions, or a version against cwd. |
| `pstash clean` | Remove old or filtered version entries. |
| `pstash config [key] [value]` | View or set config values. |
| `pstash init` | Initialize pstash (first-time setup). |

## Workflow rules

- Use `pstash save "descriptive message"` to version meaningful checkpoints (equivalent to commits)
- Use `pstash sync` after save/pop/drop to keep the remote in sync
- Use `pstash status` to check current state before operating
- When index is omitted, pstash runs in interactive mode — prefer passing the index explicitly when known
- Use `pstash list` to see available versions before restoring
