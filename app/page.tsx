import Link from "next/link";

import { logout } from "@/app/logout/actions";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold">GAC Reservations</h1>
      <p className="text-muted-foreground">
        Room and hall booking system — coming soon.
      </p>
      {user ? (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-muted-foreground">
            Signed in as {user.email}
          </p>
          <Button render={<Link href="/schedule">View schedule</Link>} />
          <form action={logout}>
            <Button type="submit" variant="outline">
              Log out
            </Button>
          </form>
        </div>
      ) : (
        <div className="flex gap-3">
          <Button render={<Link href="/login">Log in</Link>} />
          <Button variant="outline" render={<Link href="/signup">Sign up</Link>} />
        </div>
      )}
    </div>
  );
}
