"use client";
import { calendarMutationFetch } from "@/lib/publishing/clientRequests";
export async function cancelWorkspaceUpload(
  workspaceId: string,
  receipt: { reservationId: string; fileKey: string },
) {
  const response = await calendarMutationFetch(
    `/api/calendars/${workspaceId}/uploads/cancel`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reservationId: receipt.reservationId,
        fileKey: receipt.fileKey,
      }),
      keepalive: true,
    },
  );
  if (response.status === 409)
    throw new Error(
      "This upload may already be saved. Refresh to check its status; no completed file was removed.",
    );
  if (!response.ok)
    throw new Error(
      "Upload stopped. Storage release was not confirmed; automatic expiry cleanup will retry.",
    );
}
