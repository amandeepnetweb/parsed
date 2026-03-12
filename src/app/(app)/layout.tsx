import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/auth/sign-in");

  return (
    <AppShell user={{ name: session.user.name, email: session.user.email }}>
      {children}
    </AppShell>
  );
}
