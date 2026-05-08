import { describe, it, expect } from 'vitest';
import { sanitizeEnvForClonedBuild } from './build.js';

describe('sanitizeEnvForClonedBuild', () => {
  it('strips secrets that match the name pattern', () => {
    const out = sanitizeEnvForClonedBuild({
      SOME_API_KEY: 'leak',
      OTHER_TOKEN: 'leak',
      A_SECRET: 'leak',
      A_PASSWORD: 'leak',
      PUBLIC_VALUE: 'keep',
    });
    expect(out.SOME_API_KEY).toBeUndefined();
    expect(out.OTHER_TOKEN).toBeUndefined();
    expect(out.A_SECRET).toBeUndefined();
    expect(out.A_PASSWORD).toBeUndefined();
    expect(out.PUBLIC_VALUE).toBe('keep');
  });

  it('strips explicit secret keys regardless of suffix', () => {
    const out = sanitizeEnvForClonedBuild({
      OPENAI_API_KEY: 'leak',
      GITHUB_TOKEN: 'leak',
      AWS_ACCESS_KEY_ID: 'leak',
    });
    expect(out.OPENAI_API_KEY).toBeUndefined();
    expect(out.GITHUB_TOKEN).toBeUndefined();
    expect(out.AWS_ACCESS_KEY_ID).toBeUndefined();
  });

  it('passes GITPULSE_PASSWORD through despite matching the secret pattern', () => {
    const out = sanitizeEnvForClonedBuild({
      GITPULSE_PASSWORD: 'hunter2',
      SOME_OTHER_PASSWORD: 'leak',
    });
    expect(out.GITPULSE_PASSWORD).toBe('hunter2');
    expect(out.SOME_OTHER_PASSWORD).toBeUndefined();
  });
});
