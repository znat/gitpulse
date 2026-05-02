'use client';

import { useState } from 'react';
import {
  computeLineInfos,
  extractCleanCode,
  isDiffContent,
  type LineInfo,
} from '@/lib/diff-utils';

interface TabbedCodeBlockProps {
  lang?: string;
  file?: string;
  code: string;
}

export function TabbedCodeBlock({ lang, file, code }: TabbedCodeBlockProps) {
  const { resolvedFile, cleanCode } = extractFileFromCode(code, file);
  const hasDiff = isDiffContent(cleanCode);
  const [activeTab, setActiveTab] = useState<'code' | 'diff'>(
    hasDiff ? 'diff' : 'code',
  );

  const finalCode = hasDiff ? extractCleanCode(cleanCode) : cleanCode;
  const diffLines = hasDiff ? cleanCode.split('\n') : [];
  const lineInfos = hasDiff ? computeLineInfos(diffLines) : [];

  return (
    <figure className="tcb my-8">
      <Header
        lang={lang}
        file={resolvedFile}
        hasDiff={hasDiff}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      {activeTab === 'code' || !hasDiff ? (
        <CodeView code={finalCode} />
      ) : (
        <DiffView lines={diffLines} lineInfos={lineInfos} />
      )}
    </figure>
  );
}

function extractFileFromCode(
  code: string,
  file?: string,
): { resolvedFile?: string; cleanCode: string } {
  if (file) return { resolvedFile: file, cleanCode: code };
  const lines = code.split('\n');
  if (lines.length > 0 && /^file=\S+/.test((lines[0] ?? '').trim())) {
    const filePath = lines[0]!.trim().replace(/^file=/, '');
    return { resolvedFile: filePath, cleanCode: lines.slice(1).join('\n') };
  }
  return { cleanCode: code };
}

function Header({
  lang,
  file,
  hasDiff,
  activeTab,
  onTabChange,
}: {
  lang?: string;
  file?: string;
  hasDiff: boolean;
  activeTab: 'code' | 'diff';
  onTabChange: (tab: 'code' | 'diff') => void;
}) {
  return (
    <div className="tcb-header">
      <div className="tcb-header-left">
        {lang && <span className="tcb-lang">{lang}</span>}
        {file && <FilePathDisplay path={file} />}
      </div>
      {hasDiff && (
        <div className="tcb-tabs">
          <TabButton
            label="Code"
            icon={<CodeIcon />}
            active={activeTab === 'code'}
            onClick={() => onTabChange('code')}
          />
          <TabButton
            label="Diff"
            icon={<DiffIcon />}
            active={activeTab === 'diff'}
            onClick={() => onTabChange('diff')}
          />
        </div>
      )}
    </div>
  );
}

function FilePathDisplay({ path }: { path: string }) {
  const parts = path.split('/');
  const filename = parts.pop() ?? path;
  const dir = parts.length > 0 ? parts.join('/') + '/' : '';
  return (
    <span className="tcb-filepath">
      {dir}
      <span className="tcb-filename">{filename}</span>
    </span>
  );
}

function TabButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`tcb-tab ${active ? 'tcb-tab-active' : ''}`}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

function CodeView({ code }: { code: string }) {
  const lines = code.split('\n');
  return (
    <div className="tcb-code-view">
      <pre>
        {lines.map((line, i) => (
          <div key={i} className="tcb-code-line">
            <span className="tcb-line-num">{i + 1}</span>
            <span className="tcb-line-content">{line || ' '}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}

function DiffView({
  lines,
  lineInfos,
}: {
  lines: string[];
  lineInfos: LineInfo[];
}) {
  return (
    <div className="tcb-diff-view">
      <pre>
        {lines.map((line, i) => {
          const info = lineInfos[i]!;
          if (info.isHunkHeader) return <HunkRow key={i} line={line} />;
          return <DiffRow key={i} line={line} info={info} />;
        })}
      </pre>
    </div>
  );
}

function HunkRow({ line }: { line: string }) {
  const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@(.*)/);
  const text = match
    ? match[3]!.trim()
      ? `@@ ${match[3]!.trim()}`
      : `@@ Lines ${match[1]} → ${match[2]}`
    : line;
  return <div className="tcb-diff-hunk">{text}</div>;
}

function DiffRow({ line, info }: { line: string; info: LineInfo }) {
  const cls = info.isAddition
    ? 'tcb-diff-added'
    : info.isDeletion
      ? 'tcb-diff-removed'
      : 'tcb-diff-context';
  const sign = info.isAddition ? '+' : info.isDeletion ? '−' : ' ';
  const content = line.length > 0 ? line.slice(1) : '';

  return (
    <div className={`tcb-diff-line ${cls}`}>
      <span className="tcb-diff-gutter tcb-diff-gutter-old">
        {info.oldLineNum ?? ''}
      </span>
      <span className="tcb-diff-gutter">{info.newLineNum ?? ''}</span>
      <span className="tcb-diff-sign">{sign}</span>
      <span className="tcb-diff-content">{content || ' '}</span>
    </div>
  );
}

function CodeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      width="12"
      height="12"
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function DiffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="12"
      height="12"
    >
      <path d="M12 3v14" />
      <path d="M5 10h14" />
      <path d="M5 21h14" />
    </svg>
  );
}
