import {
  RecursiveCharacterTextSplitter,
  MarkdownTextSplitter,
} from "@langchain/textsplitters";

export async function chunkText(
  text: string,
  fileType: string,
): Promise<string[]> {
  if (fileType === "md") {
    const splitter = new MarkdownTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 150,
    });
    return splitter.splitText(text);
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 150,
  });
  return splitter.splitText(text);
}
