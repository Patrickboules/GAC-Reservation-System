import { login } from "@/app/login/actions";
import { Button } from "@/components/kit/button";
import { Card } from "@/components/kit/card";

/** Reflects the `next` destination back in the sign-in prompt, so a gated redirect explains itself instead of showing a generic message. */
function descriptionForNext(next: string | undefined): string {
  if (!next) return "Sign in to GAC Reservations with your Google account.";
  if (next.startsWith("/rooms") || next.startsWith("/bookings/new")) {
    return "Sign in with Google to reserve a room.";
  }
  if (next.startsWith("/bookings")) {
    return "Sign in with Google to view your bookings.";
  }
  return "Sign in to GAC Reservations with your Google account.";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas p-8">
      <Card className="w-full max-w-sm p-6 shadow-md">
        <div className="mb-6 text-center">
          <span className="font-display text-h3 font-semibold text-ink-900">GAC</span>
        </div>
        <div className="mb-5">
          <h1 className="font-display text-h2 text-ink-900">Sign in</h1>
          <p className="mt-1 text-small text-ink-500">{descriptionForNext(next)}</p>
        </div>
        <form action={login} className="flex flex-col gap-4">
          {next ? <input type="hidden" name="next" value={next} /> : null}
          {error ? (
            <p role="alert" className="text-small font-medium text-status-rejected-fg">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full">
            Continue with Google
          </Button>
        </form>
      </Card>
    </div>
  );
}
