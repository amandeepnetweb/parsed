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
      chunkSize: 1500,
      chunkOverlap: 200,
    });
    return splitter.splitText(text);
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1500,
    chunkOverlap: 200,
  });
  return splitter.splitText(text);
}
