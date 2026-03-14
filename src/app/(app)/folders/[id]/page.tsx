import { asc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight, HomeIcon, MessageSquare } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/database";
import { folders } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { FolderCard, NewSubfolderButton, DeleteFolderButton } from "@/components/folders";
import { FileList, FileUploader } from "@/components/files";
import type { Folder } from "@/db/schema";

function buildBreadcrumb(allFolders: Folder[], current: Folder): Folder[] {
  const path: Folder[] = [current];
  let node = current;
  while (node.parentId) {
    const parent = allFolders.find((f) => f.id === node.parentId);
    if (!parent) break;
    path.unshift(parent);
    node = parent;
  }
  return path;
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function FolderPage({ params }: Props) {
  const { id } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/auth/sign-in");

  const userId = session.user.id;

  const allFolders = await db
    .select()
    .from(folders)
    .where(eq(folders.userId, userId))
    .orderBy(asc(folders.name));

  const current = allFolders.find((f) => f.id === id);
  if (!current) notFound();

  const subfolders = allFolders.filter((f) => f.parentId === id);
  const breadcrumb = buildBreadcrumb(allFolders, current);

  return (
    <div className="flex flex-1 flex-col gap-8 p-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/dashboard" className="flex items-center gap-1 transition-colors hover:text-foreground">
          <HomeIcon className="size-3.5" />
          <span>Home</span>
        </Link>
        {breadcrumb.map((crumb) => (
          <span key={crumb.id} className="flex items-center gap-1">
            <ChevronRight className="size-3.5" />
            <Link
              href={`/folders/${crumb.id}`}
              className={
                crumb.id === id
                  ? "font-medium text-foreground"
                  : "transition-colors hover:text-foreground"
              }
            >
              {crumb.name}
            </Link>
          </span>
        ))}
      </nav>

      {/* Heading */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{current.name}</h1>
        <div className="flex items-center gap-2">
          <DeleteFolderButton folderId={id} folderName={current.name} />
          <NewSubfolderButton parentId={id} />
          <Button asChild variant="outline" size="sm">
            <Link href={`/chat?folderId=${id}`}>
              <MessageSquare className="mr-2 size-4" />
              Ask about this folder
            </Link>
          </Button>
        </div>
      </div>

      {/* Upload */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Upload
        </h2>
        <FileUploader defaultFolderId={id} />
      </section>

      {/* Subfolders */}
      {subfolders.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Folders
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subfolders.map((sub) => (
              <FolderCard key={sub.id} folder={sub} />
            ))}
          </div>
        </section>
      )}

      {/* Files */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Files
        </h2>
        <FileList folderId={id} />
      </section>
    </div>
  );
}
