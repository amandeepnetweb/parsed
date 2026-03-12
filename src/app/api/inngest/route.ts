import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { processFile } from "@/inngest/process-file";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processFile],
});
