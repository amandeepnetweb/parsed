import { extractText } from "unpdf";

export async function parsePdf(buffer: ArrayBuffer): Promise<string> {
  const { text } = await extractText(new Uint8Array(buffer));
  return Array.isArray(text) ? text.join("\n\n") : String(text);
}
