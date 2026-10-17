import { processSocialInboxAutoReplies } from "./autoReply";

/**
 * Enqueue or trigger auto-reply without waiting for AI/provider calls.
 * The BullMQ background worker (social-inbox-auto-replies) remains the scheduled recovery path.
 */
export async function dispatchSocialInboxAutoReply(messageId: string): Promise<boolean> {
  setTimeout(() => {
    processSocialInboxAutoReplies([messageId]).catch((error) => {
      console.error("Immediate social inbox auto-reply dispatch failed; scheduled BullMQ worker will retry:", error);
    });
  }, 0);
  return true;
}
