import { login } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>{descriptionForNext(next)}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={login} className="flex flex-col gap-4">
            {next ? <input type="hidden" name="next" value={next} /> : null}
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full">
              Continue with Google
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
