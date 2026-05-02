// Ported from gitsky/apps/web/lib/diff-utils.ts.

export interface LineInfo {
  isHunkHeader: boolean;
  isAddition: boolean;
  isDeletion: boolean;
  isContext: boolean;
  oldLineNum: number | null;
  newLineNum: number | null;
}

export function computeLineInfos(lines: string[]): LineInfo[] {
  let oldLineNumber = 0;
  let newLineNumber = 0;

  return lines.map((line) => {
    const isHunkHeader = line.startsWith('@@');
    const isAddition = line.startsWith('+') && !isHunkHeader;
    const isDeletion = line.startsWith('-') && !isHunkHeader;
    const isContext =
      !isHunkHeader && !isAddition && !isDeletion && line.length > 0;

    if (isHunkHeader) {
      const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
      if (match) {
        oldLineNumber = parseInt(match[1]!, 10) - 1;
        newLineNumber = parseInt(match[2]!, 10) - 1;
      }
    } else if (isAddition) {
      newLineNumber++;
    } else if (isDeletion) {
      oldLineNumber++;
    } else if (isContext) {
      oldLineNumber++;
      newLineNumber++;
    }

    return {
      isHunkHeader,
      isAddition,
      isDeletion,
      isContext,
      oldLineNum:
        !isHunkHeader && !isAddition && (isDeletion || isContext)
          ? oldLineNumber
          : null,
      newLineNum:
        !isHunkHeader && !isDeletion && (isAddition || isContext)
          ? newLineNumber
          : null,
    };
  });
}

export function isDiffContent(code: string): boolean {
  const lines = code.split('\n');
  const hasHunkHeader = lines.some((l) => /^@@\s/.test(l));
  if (hasHunkHeader) return true;

  let additions = 0;
  let deletions = 0;
  let context = 0;
  for (const line of lines) {
    if (line.startsWith('+')) additions++;
    else if (line.startsWith('-')) deletions++;
    else if (line.startsWith(' ')) context++;
  }
  const diffLines = additions + deletions + context;
  return (
    diffLines >= 3 &&
    (additions > 0 || deletions > 0) &&
    diffLines / lines.length >= 0.6
  );
}

export function extractCleanCode(code: string): string {
  const lines = code.split('\n');
  const cleanLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('@@')) continue;
    if (line.startsWith('-')) continue;
    if (line.startsWith('+')) cleanLines.push(line.slice(1));
    else if (line.startsWith(' ')) cleanLines.push(line.slice(1));
    else if (line === '') cleanLines.push('');
  }

  while (cleanLines.length > 0 && cleanLines[cleanLines.length - 1] === '') {
    cleanLines.pop();
  }

  return cleanLines.join('\n');
}
