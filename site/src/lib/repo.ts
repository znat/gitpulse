import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface RepoInfo {
  owner: string;
  repo: string;
  description: string;
  url: string;
}

const REPO_PATH = join(process.cwd(), 'src/content/repo.json');

export function loadRepo(): RepoInfo {
  try {
    const raw = readFileSync(REPO_PATH, 'utf8');
    return JSON.parse(raw) as RepoInfo;
  } catch {
    const fullName = process.env.GITHUB_REPOSITORY ?? 'unknown/unknown';
    const [owner = 'unknown', repo = 'unknown'] = fullName.split('/');
    return {
      owner,
      repo,
      description: '',
      url: `https://github.com/${owner}/${repo}`,
    };
  }
}
