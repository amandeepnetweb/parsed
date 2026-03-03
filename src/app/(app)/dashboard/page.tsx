import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/auth/sign-in");
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-bold">Parsed</h1>
      <p className="text-muted-foreground">Upload any document. Ask anything.</p>
      <p className="text-sm text-muted-foreground">Dashboard — coming in Phase 6</p>
    </div>
  );
}
