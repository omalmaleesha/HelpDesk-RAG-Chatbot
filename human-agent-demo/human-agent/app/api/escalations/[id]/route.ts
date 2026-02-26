import { NextRequest, NextResponse } from "next/server";
import { updateEscalation } from "../store";

export const runtime = "nodejs";

export async function PATCH(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await _request.json();
    const { correctedAnswer, status, notes } = body;

    const updated = updateEscalation(params.id, { correctedAnswer, status, notes });
    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ escalation: updated });
  } catch (error) {
    console.error("PATCH /api/escalations/[id] error", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
