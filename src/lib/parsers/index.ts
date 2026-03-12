import { parsePdf } from "./pdf";
import { parseDocx } from "./docx";
import { parseText } from "./text";

export async function parseFile(
  buffer: ArrayBuffer,
  fileType: string,
): Promise<string> {
  switch (fileType) {
    case "pdf":
      return parsePdf(buffer);
    case "docx":
      return parseDocx(buffer);
    case "txt":
    case "md":
      return parseText(buffer);
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}
