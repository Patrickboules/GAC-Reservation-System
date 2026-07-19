import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold">GAC Reservations</h1>
      <p className="text-muted-foreground">
        Room and hall booking system — coming soon.
      </p>
      <Button>Get started</Button>
    </div>
  );
}
