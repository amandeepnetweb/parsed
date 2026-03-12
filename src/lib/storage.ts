import { del, put } from "@vercel/blob";

export async function uploadToBlob(
  pathname: string,
  data: ArrayBuffer,
  contentType: string,
): Promise<string> {
  const blob = await put(pathname, data, {
    access: "public",
    addRandomSuffix: true,
    contentType,
  });
  return blob.url;
}

export async function deleteFromBlob(url: string): Promise<void> {
  await del(url);
}
