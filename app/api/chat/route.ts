import { streamText } from "ai";
import { gemini } from "@ai-sdk/gemini";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: gemini("gemini-1.5-pro"),
    messages,
    system:
      "You are an AI assistant for a warehouse management system. Help users with inventory management, warehouse operations, and logistics questions. Be concise, helpful, and professional.",
  });

  return result.toDataStreamResponse();
}
