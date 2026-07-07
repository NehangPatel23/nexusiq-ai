import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="border-t border-border px-4 py-12 md:px-6">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
        <div className="flex items-center gap-2 font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            N
          </div>
          <span>NexusIQ</span>
        </div>
        <nav aria-label="Footer navigation">
          <ul className="flex items-center gap-6 text-sm text-muted-foreground">
            <li>
              <Link href="/login" className="hover:text-foreground">
                Login
              </Link>
            </li>
            <li>
              <Link href="/register" className="hover:text-foreground">
                Register
              </Link>
            </li>
          </ul>
        </nav>
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} NexusIQ. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
