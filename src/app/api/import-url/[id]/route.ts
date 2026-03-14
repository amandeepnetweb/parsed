import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/database";
import { webCrawlJobs } from "@/db/schema";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const [job] = await db
      .select()
      .from(webCrawlJobs)
      .where(eq(webCrawlJobs.id, id))
      .limit(1);

    if (!job) return Response.json({ error: "Not found" }, { status: 404 });
    if (job.userId !== session.user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    return Response.json(job);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
