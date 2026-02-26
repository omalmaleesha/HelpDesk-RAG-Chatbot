import { NextRequest, NextResponse } from "next/server";
import { listEscalations, upsertEscalation } from "./store";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ escalations: listEscalations() });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requestId, userQuery, aiAnswer, references, similarity, threshold, status } = body;

    if (!userQuery || !aiAnswer) {
      return NextResponse.json({ error: "userQuery and aiAnswer are required" }, { status: 400 });
    }

    const saved = upsertEscalation({
      id: requestId,
      userQuery,
      aiAnswer,
      references,
      similarity,
      threshold,
      status,
    });

    return NextResponse.json({ escalation: saved }, { status: 201 });
  } catch (error) {
    console.error("POST /api/escalations error", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
