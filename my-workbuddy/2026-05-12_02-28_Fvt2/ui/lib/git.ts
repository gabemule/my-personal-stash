import simpleGit, { SimpleGit } from "simple-git";
import { WORKSPACE_ROOT } from "./config";

function getGit(): SimpleGit {
  return simpleGit(WORKSPACE_ROOT);
}

export interface GitStatus {
  isRepo: boolean;
  branch: string;
  modified: string[];
  untracked: string[];
  staged: string[];
  ahead: number;
  behind: number;
}

export async function getStatus(): Promise<GitStatus> {
  const git = getGit();

  try {
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      return {
        isRepo: false,
        branch: "",
        modified: [],
        untracked: [],
        staged: [],
        ahead: 0,
        behind: 0,
      };
    }

    const status = await git.status();
    return {
      isRepo: true,
      branch: status.current ?? "",
      modified: status.modified,
      untracked: status.not_added,
      staged: status.staged,
      ahead: status.ahead,
      behind: status.behind,
    };
  } catch {
    return {
      isRepo: false,
      branch: "",
      modified: [],
      untracked: [],
      staged: [],
      ahead: 0,
      behind: 0,
    };
  }
}

export async function commit(message: string, files?: string[]): Promise<string> {
  const git = getGit();
  if (files && files.length > 0) {
    await git.add(files);
  } else {
    await git.add(".");
  }
  const result = await git.commit(message);
  return result.commit;
}

export async function pull(): Promise<string> {
  const git = getGit();
  const result = await git.pull();
  return `Pulled: ${result.summary.changes} changes, ${result.summary.insertions} insertions, ${result.summary.deletions} deletions`;
}

export async function push(): Promise<void> {
  const git = getGit();
  await git.push();
}

export interface LogCommit {
  hash: string;
  date: string;
  message: string;
  author: string;
}

export async function getLog(limit = 20): Promise<LogCommit[]> {
  const git = getGit();
  try {
    const log = await git.log({ maxCount: limit });
    return log.all.map((c) => ({
      hash: c.hash.slice(0, 7),
      date: c.date,
      message: c.message,
      author: c.author_name,
    }));
  } catch {
    return [];
  }
}
