import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface RepoInfo {
  owner: string;
  repo: string;
  description: string;
  url: string;
  publicationTitle?: string;
  publicationSubtitle?: string;
  daysPerPage?: number;
  releasesPerPage?: number;
  theme?: {
    accentColor?: string;
  };
}

export const DEFAULT_DAYS_PER_PAGE = 2;
export const DEFAULT_RELEASES_PER_PAGE = 10;

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

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

export function daysPerPage(repo: RepoInfo): number {
  const v = repo.daysPerPage;
  return typeof v === 'number' && Number.isInteger(v) && v > 0
    ? v
    : DEFAULT_DAYS_PER_PAGE;
}

export function releasesPerPage(repo: RepoInfo): number {
  const v = repo.releasesPerPage;
  return typeof v === 'number' && Number.isInteger(v) && v > 0
    ? v
    : DEFAULT_RELEASES_PER_PAGE;
}

export function accentColor(repo: RepoInfo): string | null {
  const v = repo.theme?.accentColor;
  return typeof v === 'string' && HEX_COLOR.test(v) ? v : null;
}
