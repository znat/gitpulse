export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="text-center py-8 px-6 border-t border-border-light mt-12">
      <div className="font-mono text-[0.6875rem] text-muted tracking-wide">
        &copy; {year} &middot; via gitpulse
      </div>
    </footer>
  );
}
