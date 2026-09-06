import { redirect } from "next/navigation";

import { getCachedProfile, getCachedUser } from "@/lib/supabase/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCachedUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getCachedProfile();

  if (profile?.role !== "admin") {
    redirect("/");
  }

  return <>{children}</>;
}
