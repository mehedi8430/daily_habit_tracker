"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Moon, Sun, CalendarDays, BarChart3, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function AppHeader({ isAuthorized }: { isAuthorized: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast.success("Logged out successfully");
      router.push("/login");
    } catch {
      toast.error("Failed to log out");
      setLoggingOut(false);
    }
  };

  const links = [
    { href: "/", label: "Calendar", icon: CalendarDays },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
  ];

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur pl-6">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <span className="text-xl">✅</span>
            <span className="hidden sm:inline">Habit Tracker</span>
          </Link>
          {isAuthorized && (
            <nav className="flex items-center gap-1">
              {links.map((l) => {
                const active =
                  l.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(l.href);
                const Icon = l.icon;
                return (
                  <Link key={l.href} href={l.href}>
                    <Button
                      variant={active ? "secondary" : "ghost"}
                      size="sm"
                      className={cn("gap-2")}
                    >
                      <Icon className="h-4 w-4" />
                      {l.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isAuthorized && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              aria-label="Log out"
              disabled={loggingOut}
            >
              <LogOut className="h-5 w-5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
