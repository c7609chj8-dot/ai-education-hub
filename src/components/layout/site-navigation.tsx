"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { educationLinks, informationLinks, sections, type PublicSection } from "@/config/navigation";

export function SiteNavigation() {
  const pathname = usePathname();
  return <NavigationPanel key={pathname} pathname={pathname} />;
}

function NavigationPanel({ pathname }: { pathname: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const nav = useRef<HTMLElement>(null);
  const mobileButton = useRef<HTMLButtonElement>(null);
  const infoButton = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const infoId = useId();

  function closeMenus() {
    setMobileOpen(false);
    setInfoOpen(false);
  }

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 64rem)");

    function onResize() {
      const active = document.activeElement;
      if (nav.current?.contains(active)) {
        if (!desktop.matches) {
          mobileButton.current?.focus();
        } else if (active === mobileButton.current) {
          nav.current.querySelector("a")?.focus();
        } else if (infoButton.current?.parentElement?.contains(active)) {
          infoButton.current.focus();
        }
      }
      closeMenus();
    }

    function onOutside(event: PointerEvent) {
      if (event.target instanceof Node && !nav.current?.contains(event.target)) closeMenus();
    }

    desktop.addEventListener("change", onResize);
    document.addEventListener("pointerdown", onOutside);
    return () => {
      desktop.removeEventListener("change", onResize);
      document.removeEventListener("pointerdown", onOutside);
    };
  }, []);

  function navItem(section: PublicSection) {
    return (
      <li key={section.href}>
        <Link
          href={section.href}
          className="nav-link"
          aria-current={pathname === section.href ? "page" : undefined}
          onNavigate={() => {
            closeMenus();
            document.getElementById("main-content")?.focus({ preventScroll: true });
          }}
        >
          {section.label}
        </Link>
      </li>
    );
  }

  return (
    <nav
      ref={nav}
      className="shrink-0"
      aria-label="주요 메뉴"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) closeMenus();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || (!infoOpen && !mobileOpen)) return;
        event.preventDefault();
        if (infoOpen) {
          setInfoOpen(false);
          infoButton.current?.focus();
        } else {
          setMobileOpen(false);
          mobileButton.current?.focus();
        }
      }}
    >
      <Button
        ref={mobileButton}
        variant="secondary"
        className="gap-1.5 whitespace-nowrap px-3 lg:hidden"
        aria-expanded={mobileOpen}
        aria-controls={menuId}
        aria-label={mobileOpen ? "전체 메뉴 닫기" : "전체 메뉴 열기"}
        onClick={() => {
          setMobileOpen(!mobileOpen);
          setInfoOpen(false);
        }}
      >
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d={mobileOpen ? "m5 5 14 14M19 5 5 19" : "M3 6h18M3 12h18M3 18h18"} />
        </svg>
        메뉴
      </Button>

      <ul id={menuId} className="nav-panel" data-open={mobileOpen}>
        {educationLinks.map(navItem)}
        <li className="relative">
          <button
            ref={infoButton}
            type="button"
            className="nav-link"
            aria-expanded={infoOpen}
            aria-controls={infoId}
            data-current-group={informationLinks.some((section) => section.href === pathname)}
            onClick={() => setInfoOpen(!infoOpen)}
          >
            교육정보
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" className={infoOpen ? "rotate-180" : undefined}>
              <path d="m3 6 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.7" />
            </svg>
          </button>
          <ul id={infoId} hidden={!infoOpen} className="nav-sublist">
            {informationLinks.map(navItem)}
          </ul>
        </li>
        {navItem(sections.partnership)}
      </ul>
    </nav>
  );
}
