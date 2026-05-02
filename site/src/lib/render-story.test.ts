import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderStoryMarkup } from './render-story';

function render(text: string): string {
  return renderToStaticMarkup(renderStoryMarkup(text) as React.ReactElement);
}

describe('renderStoryMarkup', () => {
  it('renders [[code]]…[[/code]] as inline code', () => {
    const html = render('Use [[code]]foo()[[/code]] to call.');
    expect(html).toContain('<code class="code-inline">foo()</code>');
  });

  it('treats [[code ref=N]] as plain inline code', () => {
    const html = render('See [[code ref=3]]bar[[/code]].');
    expect(html).toContain('<code class="code-inline">bar</code>');
  });

  it('renders **bold** and *italic*', () => {
    const html = render('**big** and *small*');
    expect(html).toContain('<strong>big</strong>');
    expect(html).toContain('<em>small</em>');
  });

  it('renders ## and ### headings as styled <p>', () => {
    const html = render('## Section\n\nbody\n\n### Sub');
    expect(html).toMatch(/<p[^>]*text-lg[^>]*>Section<\/p>/);
    expect(html).toMatch(/<p[^>]*text-base[^>]*>Sub<\/p>/);
  });

  it('renders bullet lists', () => {
    const html = render('- one\n- two');
    expect(html).toContain('<ul class="list-disc');
    expect(html).toContain('<li');
    expect(html).toContain('one');
    expect(html).toContain('two');
  });

  it('first paragraph gets a drop-cap class', () => {
    const html = render('First paragraph here.\n\nSecond paragraph.');
    const firstP = html.match(/<p[^>]*>First[^<]*<\/p>/)?.[0] ?? '';
    const secondP = html.match(/<p[^>]*>Second[^<]*<\/p>/)?.[0] ?? '';
    expect(firstP).toContain('first-letter:float-left');
    expect(secondP).not.toContain('first-letter:float-left');
  });

  it('renders ```lang file=path fenced code blocks as .tcb', () => {
    const html = render(
      'intro\n\n```typescript file=src/foo.ts\nconst x = 1;\nconst y = 2;\n```\n\nafter',
    );
    expect(html).toContain('class="tcb my-8"');
    expect(html).toContain('class="tcb-header"');
    expect(html).toContain('class="tcb-lang">typescript</span>');
    expect(html).toContain('class="tcb-filepath">src/');
    expect(html).toContain('class="tcb-filename">foo.ts');
    expect(html).toContain('class="tcb-line-num">1</span>');
    expect(html).toContain('class="tcb-line-num">2</span>');
    // Plain code: no Code/Diff tabs
    expect(html).not.toContain('class="tcb-tabs"');
  });

  it('renders unified-diff fenced blocks with Code/Diff tabs and +/- coloring', () => {
    const diff = [
      '```diff file=src/foo.ts',
      '@@ -1,3 +1,4 @@',
      ' export function foo() {',
      '-  const x = 1;',
      '+  const x = 2;',
      '+  const y = 3;',
      ' }',
      '```',
    ].join('\n');
    const html = render(diff);

    // Tabs are present
    expect(html).toContain('class="tcb-tabs"');
    expect(html).toContain('class="tcb-tab tcb-tab-active">');
    // Diff is the default active view
    expect(html).toContain('class="tcb-diff-view"');
    // Coloring classes
    expect(html).toContain('class="tcb-diff-line tcb-diff-added"');
    expect(html).toContain('class="tcb-diff-line tcb-diff-removed"');
    expect(html).toContain('class="tcb-diff-line tcb-diff-context"');
    // Hunk header gets compact label
    expect(html).toContain('class="tcb-diff-hunk"');
    // +/− signs render
    expect(html).toContain('class="tcb-diff-sign">+</span>');
    expect(html).toContain('class="tcb-diff-sign">−</span>');
  });

  it('handles legacy file=path on first line of code', () => {
    const html = render('```typescript\nfile=a/b.ts\nconst x = 1;\n```');
    expect(html).toContain('class="tcb-filename">b.ts');
    // file=… line should not appear as a code line
    expect(html).not.toContain('file=a/b.ts</span>');
  });

  it('handles 4-backtick fences (with inner triple-backticks)', () => {
    const html = render('````typescript\n```inner```\nconst x = 1;\n````');
    expect(html).toContain('class="tcb my-8"');
    expect(html).toContain('```inner```');
  });

  it('handles 4-backtick fences with a STANDALONE triple-backtick line', () => {
    // A bare ``` line inside a 4-backtick fence must not close it.
    const html = render('````typescript\n```\nconst x = 1;\n````');
    expect(html).toContain('class="tcb my-8"');
    // The standalone ``` is preserved as a code line.
    expect(html).toContain('class="tcb-line-content">```</span>');
    // And the const line follows it inside the same block.
    expect(html).toContain('const x = 1;');
    // Sanity: only one .tcb container — fence wasn't split into two blocks.
    expect(html.match(/class="tcb my-8"/g)?.length).toBe(1);
  });

  it('handles [[codeblock]] / [[/codeblock]] fences', () => {
    const html = render(
      '[[codeblock lang="ts" file="x.ts"]]\nconst x = 1;\n[[/codeblock]]',
    );
    expect(html).toContain('class="tcb-lang">ts</span>');
    expect(html).toContain('class="tcb-filename">x.ts');
  });

  it('strips stale [[ref:N]] markers', () => {
    const html = render('See [[ref:1]]thing[[/ref]] now.');
    expect(html).not.toContain('[[ref');
    expect(html).toContain('thing');
  });
});
