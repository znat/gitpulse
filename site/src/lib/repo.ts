import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface RepoInfo {
  owner: string;
  repo: string;
  description: string;
  url: string;
  publicationTitle?: string;
  publicationSubtitle?: string;
}

const REPO_PATH = join(process.cwd(), 'public/data/repo.json');

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

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function publicationName(repo: RepoInfo): string {
  return repo.publicationTitle ?? `The ${capitalize(repo.repo)} Conversation`;
}

export function publicationSubtitle(repo: RepoInfo): string {
  return repo.publicationSubtitle ?? `${repo.owner}/${repo.repo} · Development Activity Intelligence`;
}
