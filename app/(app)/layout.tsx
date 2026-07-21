import { AppShell } from "@/components/shell/app-shell";

// Wraps every authenticated route in the persistent app shell (US-024).
// /login and /signup live outside this route group and stay shell-free.
export default function AppRouteGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
