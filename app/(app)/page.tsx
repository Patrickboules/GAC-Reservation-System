import { redirect } from "next/navigation";

// The schedule is the app's home page — send "/" straight there.
export default function Home() {
  redirect("/schedule");
}
