import { NextResponse } from "next/server";
import { getProvider } from "@/lib/llm";
import { LLMError } from "@/lib/llm";

export async function GET() {
  try {
    const provider = getProvider();
    return NextResponse.json({ status: "ok", provider: provider.name });
  } catch (err) {
    if (err instanceof LLMError) {
      return NextResponse.json(
        { status: "error", code: err.code, message: err.message },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { status: "error", message: "Unknown configuration error." },
      { status: 500 }
    );
  }
}
