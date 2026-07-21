import { Sidebar } from "@/components/shell/sidebar";
import { DesktopTopBar } from "@/components/shell/desktop-top-bar";
import { MobileShell } from "@/components/shell/mobile-shell";

// Composes the desktop sidebar+top bar (US-021/US-023) and the mobile
// top bar+bottom tabs (US-022/US-023) around every authenticated route.
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DesktopTopBar />
        <MobileShell />
        <main className="min-w-0 flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
          {children}
        </main>
      </div>
    </div>
  );
}
