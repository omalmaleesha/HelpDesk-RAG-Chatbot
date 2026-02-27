import { randomUUID } from "crypto";

export type EscalationStatus = "pending" | "answered";

export type Escalation = {
  id: string;
  userQuery: string;
  aiAnswer: string;
  references?: string[];
  similarity?: number;
  threshold?: number;
  status: EscalationStatus;
  createdAt: string;
  updatedAt: string;
  correctedAnswer?: string;
  notes?: string;
};

const escalations: Escalation[] = [];

export function listEscalations(): Escalation[] {
  return escalations.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function upsertEscalation(payload: {
  id?: string;
  userQuery: string;
  aiAnswer: string;
  references?: string[];
  similarity?: number;
  threshold?: number;
  status?: EscalationStatus;
  createdAt?: string;
}): Escalation {
  const now = new Date().toISOString();
  const id = payload.id || randomUUID();
  const existingIndex = escalations.findIndex((e) => e.id === id);

  const base: Escalation = {
    id,
    userQuery: payload.userQuery,
    aiAnswer: payload.aiAnswer,
    references: payload.references || [],
    similarity: payload.similarity,
    threshold: payload.threshold,
    status: payload.status || "pending",
    createdAt: payload.createdAt || now,
    updatedAt: now,
  };

  if (existingIndex >= 0) {
    escalations[existingIndex] = { ...escalations[existingIndex], ...base, updatedAt: now };
    return escalations[existingIndex];
  }

  escalations.push(base);
  return base;
}

export function updateEscalation(
  id: string,
  data: Partial<Pick<Escalation, "status" | "correctedAnswer" | "notes">>
): Escalation | null {
  const idx = escalations.findIndex((e) => e.id === id);
  if (idx === -1) return null;

  escalations[idx] = {
    ...escalations[idx],
    ...data,
    updatedAt: new Date().toISOString(),
  };
  return escalations[idx];
}
