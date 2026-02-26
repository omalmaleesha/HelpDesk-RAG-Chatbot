import { NextRequest, NextResponse } from "next/server";
import { updateEscalation, upsertEscalation } from "../store";

export const runtime = "nodejs";

export async function PATCH(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await _request.json();
    const { correctedAnswer, status, notes, userQuery, aiAnswer, references, similarity, threshold } = body;

    const { id } = await params;

    let updated = updateEscalation(id, { correctedAnswer, status, notes });

    // If the escalation isn't in memory (e.g., dev hot reload), recreate it then apply the correction
    if (!updated && userQuery && aiAnswer) {
      upsertEscalation({
        id,
        userQuery,
        aiAnswer,
        references,
        similarity,
        threshold,
        status: status || "pending",
      });

      updated = updateEscalation(id, { correctedAnswer, status, notes });
    }

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ escalation: updated });
  } catch (error) {
    console.error("PATCH /api/escalations/[id] error", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
