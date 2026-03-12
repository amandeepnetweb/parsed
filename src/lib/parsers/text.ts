export async function parseText(buffer: ArrayBuffer): Promise<string> {
  return new TextDecoder("utf-8").decode(buffer);
}
