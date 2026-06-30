"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BookOpenCheck,
  CalendarCheck2,
  ClipboardList,
  History,
  FileText,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  Settings2,
  UserCog,
  UserRound,
  Users,
  X,
  User,
  ChevronDown,
  Menu,
  ChevronLeft,
  ChevronRight,
  School,
  ShieldAlert
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { getVisibleModules } from "@/lib/modules/module-access";
import { cn } from "@/lib/utils";

type AppShellProps = {
  roleSummary: string;
  schoolName: string;
  userLabel: string;
  roles: string[];
  permissions: string[];
  children: ReactNode;
};

export function AppShell({
  roleSummary,
  schoolName,
  userLabel,
  roles,
  permissions,
  children
}: AppShellProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  const visibleModules = useMemo(() => getVisibleModules({ roles, permissions }), [roles, permissions]);
  const forbiddenRedirect = searchParams.get("forbidden") === "1";

  useEffect(() => {
    setMenuOpen(false);
    setMounted(true);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div
        className={cn(
          "mx-auto grid min-h-screen max-w-[1600px] transition-all duration-300 ease-in-out",
          isCollapsed
            ? "lg:grid-cols-[80px_minmax(0,1fr)]"
            : "lg:grid-cols-[256px_minmax(0,1fr)] xl:grid-cols-[268px_minmax(0,1fr)]"
        )}
      >
        <div
          className={cn(
            "fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs transition lg:hidden",
            menuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          )}
          onClick={() => setMenuOpen(false)}
        />

        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex flex-col border-slate-800/60 bg-slate-900 text-slate-300 shadow-xl transition-all duration-300 ease-in-out lg:sticky lg:top-1 lg:left-1 lg:h-[99dvh] rounded-xl lg:translate-x-0 lg:shadow-none",
            "w-[70vw] sm:w-[320px]",
            isCollapsed ? "lg:w-[65px]" : "lg:w-[256px] xl:w-[268px]",
            menuOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <button
            type="button"
            className="hidden lg:flex absolute top-1/2 -right-3 -translate-y-1/2 z-50 h-6 w-6 items-center justify-center rounded-full border border-white bg-orange-600 text-white hover:text-white hover:border-slate-500 shadow-md transition-all duration-300"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label="Toggle sidebar"
          >
            {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>

          <div className="shrink-0 p-3 flex items-center justify-between gap-2 border-b border-slate-800/60 lg:border-none">
            <div
              className={cn(
                "inline-flex h-11 items-center border border-slate-800 bg-slate-950/40 font-medium uppercase text-slate-200 transition-all duration-300 rounded-xl overflow-hidden",
                isCollapsed ? "lg:w-full lg:justify-center px-0" : "w-full px-3 py-1.5 text-[11px]"
              )}
            >
              <School className="h-4 w-4 shrink-0" />
              <span
                className={cn(
                  "ml-2.5 font-semibold tracking-wide transition-all duration-300 ease-in-out origin-left text-slate-100",
                  isCollapsed ? "lg:opacity-0 lg:w-0 lg:ml-0" : "opacity-100 w-auto"
                )}
              >
                {schoolName}
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden rounded-xl h-9 w-9 p-0 text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800 bg-slate-950/20 shrink-0"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <nav className="flex-1 overflow-y-auto p-2 gap-1 content-start custom-scrollbar" aria-label="Primary navigation">
            {visibleModules.map((module) => {
              const Icon = navIconMap[module.href] ?? LayoutDashboard;
              const active =
                module.href === "/dashboard"
                  ? pathname === module.href
                  : pathname.startsWith(module.href);

              const linkStyles = cn(
                "flex items-center h-10 transition-all duration-200 ease-in-out overflow-hidden whitespace-nowrap text-sm font-medium relative group border border-transparent border-b-slate-800/30 hover:rounded-xl",
                isCollapsed ? "lg:w-12 lg:justify-center px-0 mx-auto" : "w-full px-3.5",
                active
                  ? "rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/15"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
              );

              return (
                <Link
                  key={module.href}
                  href={module.href}
                  title={isCollapsed ? module.label : undefined}
                  className={linkStyles}
                >
                  <Icon
                    className={cn(
                      "h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-105",
                      active ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                    )}
                  />
                  <span
                    className={cn(
                      "ml-5 truncate transition-all duration-300 ease-in-out origin-left",
                      isCollapsed ? "lg:opacity-0 lg:w-0 lg:ml-0" : "opacity-100 w-auto"
                    )}
                  >
                    {module.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="border-t rounded-b-xl border-slate-800/60 bg-slate-900 shrink-0 relative">
            <button
              type="button"
              onClick={() => setProfileOpen((prev) => !prev)}
              className={cn(
                "flex items-center rounded-b-xl w-full text-slate-200 bg-slate-950/60 p-2.5 shadow-md transition-all duration-200 hover:bg-indigo-950/40 hover:border-indigo-500/50",
                isCollapsed ? "justify-center" : "gap-3"
              )}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white font-medium text-xs shadow-inner">
                <User className="h-4 w-4" />
              </div>
              <div
                className={cn(
                  "flex-1 text-left min-w-0 transition-all duration-300",
                  isCollapsed ? "hidden" : "block"
                )}
              >
                <p className="text-xs font-semibold text-slate-100 truncate leading-tight">{userLabel}</p>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">{roleSummary}</p>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-slate-400 transition-transform duration-300 shrink-0",
                  isCollapsed ? "hidden" : "",
                  profileOpen ? "rotate-180 text-indigo-400" : "rotate-0"
                )}
              />
            </button>

            <div
              className={cn(
                "absolute bottom-full left-2 right-2 z-50 mb-2 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black/90 transition-all duration-200 ease-out origin-bottom",
                profileOpen
                  ? "translate-y-0 scale-100 opacity-100"
                  : "pointer-events-none translate-y-2 scale-95 opacity-0"
              )}
            >
              <div className="border-b border-slate-800/80 bg-slate-900/50 px-4 py-3 lg:hidden">
                <p className="font-semibold text-sm text-slate-200 leading-none">{userLabel}</p>
                <p className="mt-1.5 text-xs font-medium text-slate-400">{roleSummary}</p>
              </div>

              <Link
                href="/dashboard/profile"
                className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
              >
                <UserRound className="h-4 w-4 text-slate-400" />
                Profile Settings
              </Link>

              <Link
                href="/logout"
                className="flex w-full items-center gap-3 border-t border-slate-800/40 px-4 py-3 text-left text-sm font-medium text-rose-400 transition-colors hover:bg-rose-950/30 hover:text-rose-300"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Link>
            </div>
          </div>
        </aside>

        <div className="grid min-w-0">
          {mounted && (
            <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-md lg:hidden">
              <div className="flex items-center justify-between gap-3 p-3.5 sm:px-6 lg:px-8">
                <Button
                  variant="ghost"
                  size="sm"
                  className="px-2 lg:hidden text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                  onClick={() => setMenuOpen(true)}
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>

                <div className="flex items-center gap-3 ml-auto">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setProfileOpen((prev) => !prev)}
                      className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white px-3 py-1.5 shadow-xs transition duration-200 hover:bg-slate-50/80 hover:border-slate-300"
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white font-medium text-xs">
                        <User className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-medium text-slate-700 hidden sm:inline-block">{userLabel}</span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-slate-400 transition-all duration-300 ease-out",
                          profileOpen ? "rotate-180" : "rotate-0"
                        )}
                      />
                    </button>

                    <div
                      className={cn(
                        "absolute right-0 z-50 mt-2 w-64 origin-top-right overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 transition-all duration-200 ease-out",
                        profileOpen
                          ? "translate-y-0 scale-100 opacity-100"
                          : "pointer-events-none -translate-y-2 scale-95 opacity-0"
                      )}
                    >
                      <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3">
                        <p className="font-semibold text-sm text-slate-900 leading-none">{userLabel}</p>
                        <p className="mt-1.5 text-xs font-medium text-slate-500">{roleSummary}</p>
                      </div>

                      <Link
                        href="/dashboard/profile"
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                      >
                        <UserRound className="h-4 w-4 text-slate-400" />
                        Profile Settings
                      </Link>

                      <Link
                        href="/logout"
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50/60"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </header>
          )}

          <main className="w-full min-w-0 px-4 py-6 sm:px-6 lg:px-8 bg-slate-50/30">
            {forbiddenRedirect ? (
              <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="grid gap-1">
                  <p className="font-medium">This account cannot open that workspace.</p>
                  <p>You were redirected to the nearest dashboard area allowed for your current role.</p>
                </div>
              </div>
            ) : null}
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

const navIconMap: Record<string, typeof LayoutDashboard> = {
  "/dashboard": LayoutDashboard,
  "/dashboard/profile": UserRound,
  "/dashboard/staff": UserCog,
  "/dashboard/users": UserCog,
  "/dashboard/students": Users,
  "/dashboard/documents": FileText,
  "/dashboard/attendance": CalendarCheck2,
  "/dashboard/fees": IndianRupee,
  "/dashboard/exams": BookOpenCheck,
  "/dashboard/notices": ClipboardList,
  "/dashboard/reports": FileText,
  "/dashboard/accounts": IndianRupee,
  "/dashboard/payroll": IndianRupee,
  "/dashboard/leaves": CalendarCheck2,
  "/dashboard/library": BookOpenCheck,
  "/dashboard/inventory": ClipboardList,
  "/dashboard/transport": Users,
  "/dashboard/hostel": School,
  "/dashboard/audit": History,
  "/dashboard/settings": Settings2
};
