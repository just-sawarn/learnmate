"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/design/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

const linkButton =
  "button-shine inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm transition-[box-shadow,opacity,transform] duration-200 hover:-translate-y-px hover:shadow-md hover:opacity-90 active:translate-y-0 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

export function LandingHeader({ signedIn }: { signedIn: boolean }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 18);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b transition-[background-color,box-shadow] duration-300",
        scrolled
          ? "bg-background shadow-[0_8px_30px_-20px_rgb(var(--shadow-color)/0.35)]"
          : "bg-background/92",
      )}
    >
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          aria-label="LearnMate home"
          className="rounded-md transition-transform duration-200 hover:scale-[1.02]"
        >
          <Logo />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main">
          <a href="#how-it-works" className="nav-ink hidden px-3 py-2 text-sm sm:block">
            How it works
          </a>
          {signedIn ? (
            <Link href="/dashboard" className={linkButton}>
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/signin" className="nav-ink px-3 py-2 text-sm">
                Sign in
              </Link>
              <Link href="/signup" className={linkButton}>
                Sign up
              </Link>
            </>
          )}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
