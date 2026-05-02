import { describe, it, expect } from 'vitest';
import { isDiffContent, extractCleanCode, computeLineInfos } from './diff-utils';

describe('isDiffContent', () => {
  it('returns true for unified diff with hunk header', () => {
    const diff = `@@ -1,5 +1,7 @@
 export function foo() {
-  const x = 1;
+  const x = 2;
+  const y = 3;
 }`;
    expect(isDiffContent(diff)).toBe(true);
  });

  it('returns true for diff without hunk header but with +/- lines', () => {
    const diff = ` context line
-removed line
+added line
 another context
-removed again
+added again`;
    expect(isDiffContent(diff)).toBe(true);
  });

  it('returns false for plain code', () => {
    const code = `export function foo() {
  const x = 1;
  return x;
}`;
    expect(isDiffContent(code)).toBe(false);
  });

  it('returns false for short code with coincidental + or -', () => {
    const code = `const x = a + b;`;
    expect(isDiffContent(code)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isDiffContent('')).toBe(false);
  });
});

describe('extractCleanCode', () => {
  it('strips diff markers and returns final code', () => {
    const diff = `@@ -1,3 +1,4 @@
 function hello() {
-  console.log("old");
+  console.log("new");
+  return true;
 }`;
    const result = extractCleanCode(diff);
    expect(result).toBe(`function hello() {
  console.log("new");
  return true;
}`);
  });

  it('preserves indentation after stripping prefix', () => {
    const diff = `@@ -1,2 +1,2 @@
-    const x = 1;
+    const x = 2;`;
    const result = extractCleanCode(diff);
    expect(result).toBe('    const x = 2;');
  });

  it('handles empty lines in diff', () => {
    const diff = `@@ -1,3 +1,3 @@
 line1

 line3`;
    const result = extractCleanCode(diff);
    expect(result).toBe('line1\n\nline3');
  });

  it('returns empty string for diff with only deletions', () => {
    const diff = `@@ -1,2 +1,0 @@
-line1
-line2`;
    const result = extractCleanCode(diff);
    expect(result).toBe('');
  });
});

describe('computeLineInfos', () => {
  it('parses hunk headers and tracks line numbers', () => {
    const lines = [
      '@@ -5,3 +5,4 @@',
      ' context',
      '-removed',
      '+added1',
      '+added2',
    ];
    const infos = computeLineInfos(lines);

    expect(infos[0]).toMatchObject({
      isHunkHeader: true,
      oldLineNum: null,
      newLineNum: null,
    });
    expect(infos[1]).toMatchObject({
      isContext: true,
      oldLineNum: 5,
      newLineNum: 5,
    });
    expect(infos[2]).toMatchObject({
      isDeletion: true,
      oldLineNum: 6,
      newLineNum: null,
    });
    expect(infos[3]).toMatchObject({
      isAddition: true,
      oldLineNum: null,
      newLineNum: 6,
    });
    expect(infos[4]).toMatchObject({
      isAddition: true,
      oldLineNum: null,
      newLineNum: 7,
    });
  });

  it('handles multiple hunk headers', () => {
    const lines = [
      '@@ -1,2 +1,2 @@',
      '-old',
      '+new',
      '@@ -10,1 +10,1 @@',
      '-another old',
      '+another new',
    ];
    const infos = computeLineInfos(lines);

    expect(infos[1]).toMatchObject({ isDeletion: true, oldLineNum: 1 });
    expect(infos[2]).toMatchObject({ isAddition: true, newLineNum: 1 });
    expect(infos[4]).toMatchObject({ isDeletion: true, oldLineNum: 10 });
    expect(infos[5]).toMatchObject({ isAddition: true, newLineNum: 10 });
  });
});
