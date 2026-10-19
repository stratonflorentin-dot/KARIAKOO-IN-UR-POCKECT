"use server";

import { getSessionWithRole } from "@/lib/auth/session";
import { customerOrder } from "@/lib/data/access";

export interface ReportState {
  status: "idle" | "ok" | "error";
  message?: string;
}

export const ISSUE_REASONS = [
  { value: "wrong_product", label: "Wrong product" },
  { value: "missing_item", label: "Missing item" },
  { value: "delivery_problem", label: "Delivery problem" },
  { value: "request_refund", label: "Request a refund" },
  { value: "other", label: "Something else" },
] as const;

const VALUES = new Set(ISSUE_REASONS.map((r) => r.value));

/**
 * Report a problem with an order. The caller must own the order (checked on the
 * server). Real accounts and persistence are a later phase, so for now this
 * validates the input and confirms the preview without saving anything.
 */
export async function reportIssue(_prev: ReportState, formData: FormData): Promise<ReportState> {
  const session = await getSessionWithRole("customer");
  if (!session) return { status: "error", message: "Please sign in as a customer." };

  const order = customerOrder(session, String(formData.get("orderId") ?? ""));
  if (!order) return { status: "error", message: "We couldn't find that order on your account." };

  const reason = String(formData.get("reason") ?? "");
  if (!VALUES.has(reason as (typeof ISSUE_REASONS)[number]["value"])) {
    return { status: "error", message: "Please choose what went wrong." };
  }

  const note = String(formData.get("note") ?? "").trim();
  if (note.length > 500) return { status: "error", message: "Please keep the note under 500 characters." };

  // No customer accounts yet → nothing is persisted. This previews the flow.
  return {
    status: "ok",
    message: "Thanks — your report is noted. In the live app this reaches support with your order details. (Demo: not saved.)",
  };
}
