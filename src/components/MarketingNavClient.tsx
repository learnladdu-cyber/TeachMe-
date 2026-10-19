"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { Avatar } from "@/components/Avatar";
import { LogoutButton } from "@/components/LogoutButton";

const LINKS = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
];

export function MarketingNavClient({
  user,
}: {
  user: { name: string; email: string } | null;
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const auth =
    user === null ? (
      <>
        <Link href="/login" className="mnav-link">
          Sign in
        </Link>
        <Link href="/register" className="btn sm gold">
          Get started <Icon name="arrow-right" size={16} />
        </Link>
      </>
    ) : (
      <>
        <Link href="/app" className="btn sm">
          <Icon name="dashboard" size={16} />
          Workspace
        </Link>
        <LogoutButton iconOnly />
        <Avatar name={user.name} />
      </>
    );

  return (
    <header className={`mnav${scrolled ? " scrolled" : ""}${open ? " open" : ""}`}>
      <div className="container mnav-inner">
        <Link href="/" className="logo" aria-label="HelpDeskFlow home">
          <span className="logo-mark">
            <Icon name="headset" />
          </span>
          <span>HelpDeskFlow</span>
        </Link>

        <nav className="mnav-links" aria-label="Primary">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`mnav-link${isActive(link.href) ? " active" : ""}`}
              aria-current={isActive(link.href) ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mnav-actions">
          {user === null ? (
            <>
              <Link href="/login" className="mnav-link">
                Sign in
              </Link>
              <Link href="/register" className="btn sm gold">
                Get started <Icon name="arrow-right" size={16} />
              </Link>
            </>
          ) : (
            <div className="mnav-user">
              <Avatar name={user.name} />
              <span className="code">{user.email}</span>
              <Link href="/app" className="btn sm">
                <Icon name="dashboard" size={16} />
                Workspace
              </Link>
              <LogoutButton iconOnly />
            </div>
          )}
        </div>

        <button
          type="button"
          className="mnav-toggle"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mnav-mobile"
        >
          <Icon name={open ? "close" : "menu"} />
        </button>
      </div>

      <div className={`mnav-mobile${open ? " open" : ""}`} id="mnav-mobile">
        <div className="container mnav-mobile-inner">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`mnav-link${isActive(link.href) ? " active" : ""}`}
              aria-current={isActive(link.href) ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
          <div className="mnav-mobile-actions">{auth}</div>
        </div>
      </div>
    </header>
  );
}
