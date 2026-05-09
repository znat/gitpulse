export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border-light mt-16 px-6 pt-10 pb-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="font-mono text-xs tracking-wide text-foreground leading-relaxed">
          Generated automatically from git history.
        </p>
        <a
          href="https://github.com/znat/gitpulse?utm_source=gitpulse-publication&utm_medium=footer&utm_campaign=get-your-own"
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-2 font-mono text-xs tracking-widest text-accent hover:opacity-75 hover:no-underline transition-opacity duration-200"
        >
          <span className="opacity-50">◆</span>
          <span className="border-b border-dotted border-current pb-px">
            Get your own Gitpulse
          </span>
          <span className="inline-block transition-transform duration-200 ease-out group-hover:translate-x-1">
            →
          </span>
        </a>
        <p className="font-mono text-[0.5625rem] tracking-widest text-muted opacity-30">
          &copy; {year}
        </p>
      </div>
    </footer>
  );
}
