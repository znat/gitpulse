export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border-light mt-16 px-6 pt-8 pb-10">
      <div className="flex flex-col items-center gap-2.5 text-center">
        <p className="font-mono text-[0.6875rem] tracking-wide text-muted leading-relaxed">
          This publication is generated automatically from git history.{' '}
          <a
            href="https://github.com/znat/gitpulse"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-baseline gap-0 text-accent hover:text-accent hover:opacity-100 hover:no-underline transition-opacity duration-200"
          >
            <span className="underline underline-offset-2 decoration-dotted decoration-1">
              Get one for your repo
            </span>
            <span className="ml-1 inline-block transition-transform duration-200 ease-out group-hover:translate-x-0.5">
              →
            </span>
          </a>
        </p>
        <p className="font-mono text-[0.5625rem] tracking-widest text-muted opacity-40">
          &copy; {year}
        </p>
      </div>
    </footer>
  );
}
