// Editorial story renderer — ported from gitsky's StoryWithReferences.tsx,
// minus code-references and diff detection (we don't carry that data).
//
// The analyzer emits a small custom markup:
//   ## / ### / #### headings (rendered as styled <p>, not real <hN>)
//   - bullet
//   **bold** *italic* `inline` [[code]]…[[/code]] [code]…[/code]
//   ```lang file=path … ``` or [[codeblock lang="x" file="y"]] … [[/codeblock]]
//
// Mermaid blocks render as plain code (we don't load mermaid here).

import type { ReactNode } from 'react';
import { TabbedCodeBlock } from '@/components/TabbedCodeBlock';

interface RenderContext {
  isFirstParagraph: boolean;
}

export function renderStoryMarkup(text: string): ReactNode {
  return <>{parseLinesToElements(text.split('\n'))}</>;
}

function parseLinesToElements(lines: string[]): ReactNode[] {
  const elements: ReactNode[] = [];
  let currentParagraph: string[] = [];
  let currentList: string[] = [];
  const ctx: RenderContext = { isFirstParagraph: true };

  let inCodeBlock = false;
  let codeBlockLang: string | undefined;
  let codeBlockFile: string | undefined;
  let codeBlockLines: string[] = [];
  let codeBlockFormat: 'bracket' | 'backtick' | null = null;
  let openingFenceLength = 0;

  const flushPara = () => {
    flushParagraph(currentParagraph, elements, ctx);
    if (currentParagraph.length > 0) ctx.isFirstParagraph = false;
    currentParagraph = [];
  };
  const flushUl = () => {
    flushList(currentList, elements);
    currentList = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    const bracketStart = trimmed.match(
      /^\[{1,2}codeblock(?:\s+lang="([^"]*)")?(?:\s+file="([^"]*)")?\]{1,2}$/i,
    );
    const backtickStart = trimmed.match(/^(`{3,})(\w*)(?:\s+file=(\S+))?$/);

    if (!inCodeBlock && (bracketStart || backtickStart)) {
      flushPara();
      flushUl();
      inCodeBlock = true;
      codeBlockFormat = bracketStart ? 'bracket' : 'backtick';
      codeBlockLang = bracketStart
        ? bracketStart[1] || undefined
        : backtickStart![2] || undefined;
      codeBlockFile = bracketStart
        ? bracketStart[2] || undefined
        : backtickStart![3] || undefined;
      openingFenceLength = backtickStart ? backtickStart[1]!.length : 0;
      codeBlockLines = [];
      continue;
    }

    const isEndTag =
      (codeBlockFormat === 'bracket' &&
        /^\[{1,2}\/codeblock\]{1,2}$/i.test(trimmed)) ||
      (codeBlockFormat === 'backtick' &&
        new RegExp(`^\\\`{${openingFenceLength},}\\s*$`).test(trimmed));

    if (inCodeBlock && isEndTag) {
      const code = codeBlockLines.join('\n');
      elements.push(
        <TabbedCodeBlock
          key={`cb-${elements.length}`}
          lang={codeBlockLang}
          file={codeBlockFile}
          code={code}
        />,
      );
      inCodeBlock = false;
      codeBlockFormat = null;
      codeBlockLang = undefined;
      codeBlockFile = undefined;
      codeBlockLines = [];
      openingFenceLength = 0;
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    if (trimmed === '') {
      flushPara();
      flushUl();
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      flushPara();
      flushUl();
      elements.push(
        renderHeading(
          headingMatch[1]!.length,
          headingMatch[2]!,
          elements.length,
        ),
      );
      continue;
    }

    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      flushPara();
      currentList.push(bulletMatch[1] ?? '');
    } else {
      flushUl();
      currentParagraph.push(trimmed);
    }
  }

  if (inCodeBlock && codeBlockLines.length > 0) {
    elements.push(
      <TabbedCodeBlock
        key={`cb-${elements.length}`}
        lang={codeBlockLang}
        file={codeBlockFile}
        code={codeBlockLines.join('\n')}
      />,
    );
  }
  flushPara();
  flushUl();

  return elements;
}

function flushParagraph(
  paragraph: string[],
  elements: ReactNode[],
  ctx: RenderContext,
): void {
  if (paragraph.length === 0) return;
  const content = paragraph.join(' ');
  const dropCap = ctx.isFirstParagraph
    ? 'first-letter:float-left first-letter:text-5xl first-letter:font-feed-display first-letter:font-bold first-letter:mr-3 first-letter:mt-1 first-letter:text-foreground'
    : '';
  elements.push(
    <p
      key={`p-${elements.length}`}
      className={`text-foreground-secondary text-base sm:text-lg leading-[1.75] mb-8 ${dropCap}`}
    >
      {renderInline(content)}
    </p>,
  );
}

function flushList(list: string[], elements: ReactNode[]): void {
  if (list.length === 0) return;
  elements.push(
    <ul
      key={`ul-${elements.length}`}
      className="list-disc pl-6 mb-7 space-y-2"
    >
      {list.map((item, i) => (
        <li
          key={i}
          className="text-foreground-secondary text-base sm:text-lg leading-[1.75]"
        >
          {renderInline(item)}
        </li>
      ))}
    </ul>,
  );
}

function renderHeading(level: number, text: string, idx: number): ReactNode {
  const className =
    level <= 2
      ? 'text-foreground font-semibold text-lg sm:text-xl mb-4 mt-10'
      : 'text-foreground font-semibold text-base sm:text-lg mb-3 mt-8';
  return (
    <p key={`h-${idx}`} className={className}>
      {renderInline(text)}
    </p>
  );
}

function renderInline(text: string): ReactNode {
  // Strip stale ref markers the LLM occasionally leaves behind.
  const cleaned = text
    .replace(/\[\[ref:\d+\]\]\s?|\[\[\/ref\]\]\s?/g, '')
    .replace(/\[\[code ref=\d+\]\]\s?/g, '[[code]]')
    .replace(/(?<=(?<!\[)\[\/code\])\s*\]/g, '');

  // Order: [[code]]…[[/code]], [code]…[/code], `code`, **bold**, *italic*.
  const re =
    /\[\[code\]\](.+?)\[\[\/code\]\]|\[code\](.+?)\[\/code\]|`([^`]+)`|\*\*(.+?)\*\*|\*(.+?)\*/g;

  const parts: ReactNode[] = [];
  let last = 0;
  let m;
  while ((m = re.exec(cleaned)) !== null) {
    if (m.index > last) parts.push(cleaned.slice(last, m.index));
    if (m[1] !== undefined) {
      parts.push(
        <code key={`c-${m.index}`} className="code-inline">
          {m[1]}
        </code>,
      );
    } else if (m[2] !== undefined) {
      parts.push(
        <code key={`c-${m.index}`} className="code-inline">
          {m[2]}
        </code>,
      );
    } else if (m[3] !== undefined) {
      parts.push(
        <code key={`c-${m.index}`} className="code-inline">
          {m[3]}
        </code>,
      );
    } else if (m[4] !== undefined) {
      parts.push(<strong key={`b-${m.index}`}>{m[4]}</strong>);
    } else if (m[5] !== undefined) {
      parts.push(<em key={`i-${m.index}`}>{m[5]}</em>);
    }
    last = m.index + m[0].length;
  }
  if (last < cleaned.length) parts.push(cleaned.slice(last));
  return parts.length > 0 ? <>{parts}</> : cleaned;
}

