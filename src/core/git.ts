import { simpleGit, type SimpleGit } from "simple-git";

let gitInstance: SimpleGit | null = null;

function git(): SimpleGit {
  if (!gitInstance) {
    gitInstance = simpleGit();
  }
  return gitInstance;
}

export async function ensureClean(): Promise<void> {
  const status = await git().status();
  if (status.modified.length > 0 || status.staged.length > 0) {
    throw new Error(
      "Working directory has uncommitted changes. Commit or stash them first.",
    );
  }
}

export async function createBranch(name: string): Promise<void> {
  const branches = await git().branchLocal();
  if (branches.all.includes(name)) {
    throw new Error(`Branch "${name}" already exists. Pick a different tag.`);
  }
  await git().checkoutLocalBranch(name);
}

export async function getCurrentBranch(): Promise<string> {
  const branch = await git().revparse(["--abbrev-ref", "HEAD"]);
  return branch.trim();
}

export async function getCurrentCommit(): Promise<string> {
  const hash = await git().revparse(["--short=7", "HEAD"]);
  return hash.trim();
}

export async function commitAll(message: string): Promise<string> {
  await git().add("-A");
  await git().commit(message);
  return getCurrentCommit();
}

export async function resetHard(ref?: string): Promise<void> {
  await git().reset(["--hard", ref ?? "HEAD~1"]);
}

export async function hasChanges(): Promise<boolean> {
  const status = await git().status();
  return (
    status.modified.length > 0 ||
    status.not_added.length > 0 ||
    status.created.length > 0 ||
    status.deleted.length > 0
  );
}

export async function ensureRepo(): Promise<void> {
  const isRepo = await git().checkIsRepo();
  if (!isRepo) {
    throw new Error(
      "Not a git repository. Initialize one with `git init` first.",
    );
  }
}
