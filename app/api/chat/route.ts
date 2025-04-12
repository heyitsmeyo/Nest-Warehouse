/* eslint-disable */
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  let requestData: any;
  try {
    requestData = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const messages = requestData.messages;
  if (!Array.isArray(messages)) {
    return NextResponse.json({ error: "`messages` must be an array" }, { status: 400 });
  }

  // find last user prompt
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser?.content) {
    return NextResponse.json({ error: "No user prompt provided" }, { status: 400 });
  }

  // build conversation lines for context
  const convoLines = messages.map((m: any) =>
    `${m.role === "user" ? "User" : "AI"}: ${m.content}`
  );

  // system prompt
  const systemPrompt = `
You are an autonomous warehouse management assistant controlling a fleet of robots. Your job is to:
1. Analyze the operator's request.
2. Break it into discrete robot and human tasks.
3. Assign priorities (High/Medium/Low) and safety checks.
4. Provide step-by-step instructions (e.g., "Robot R12: navigate to Zone B3").
5. Include error-handling steps if robots encounter obstacles.
6. End with "Awaiting operator confirmation."
Maintain a clear, professional tone suitable for on-floor staff.
  `.trim();

  const fullPrompt = [systemPrompt, ...convoLines].join("\n");

  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("API key missing");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(fullPrompt);
    const aiText = (await result.response.text()).trim();

    // Return plain text, not JSON
    return new NextResponse(aiText, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (e: any) {
    console.error("Gemini error:", e);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
