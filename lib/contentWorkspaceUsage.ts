import { db } from "@/lib/db";
import {
  CONTENT_WORKSPACE_PLANS,
  type ContentWorkspacePlan,
  type ContentWorkspaceBillingCycle,
} from "@/lib/contentWorkspaceEntitlements";
import type {
  CalendarBillingStatus,
  ContentWorkspaceStorageReservationStatus,
} from "@prisma/client";

export interface ContentWorkspaceAccount {
  id: string;
  contentWorkspacePlan: ContentWorkspacePlan | null;
  contentWorkspaceBillingStatus: CalendarBillingStatus;
  contentWorkspaceBillingCycle: ContentWorkspaceBillingCycle | null;
  contentWorkspaceTrialUsedAt?: Date | null;
  contentWorkspaceTrialEndsAt: Date | null;
  isComped: boolean;
}

export interface ContentWorkspaceUsage {
  plan: ContentWorkspacePlan | null;
  billingStatus: CalendarBillingStatus;
  hasAccess: boolean;

  activeWorkspaces: number;
  workspaceLimit: number;

  collaborators: number;
  collaboratorLimit: number;

  storageBytes: number;
  storageReservedBytes: number;
  storageLimitBytes: number;
  storageRemainingBytes: number;

  aiGenerationsUsed: number;
  aiGenerationLimit: number;
  aiGenerationsRemaining: number;

  aiRegenerationsUsed: number;
  aiRegenerationLimit: number;
  aiRegenerationsRemaining: number;

  cycleStart: Date | null;
}

export function isContentWorkspaceTrialActive(
  account: Pick<
    ContentWorkspaceAccount,
    "contentWorkspaceBillingStatus" | "contentWorkspaceTrialEndsAt"
  >
): boolean {
  return (
    account.contentWorkspaceBillingStatus === "TRIAL" &&
    !!account.contentWorkspaceTrialEndsAt &&
    account.contentWorkspaceTrialEndsAt.getTime() > Date.now()
  );
}

export function canAccessContentWorkspace(
  account: Pick<
    ContentWorkspaceAccount,
    | "contentWorkspaceBillingStatus"
    | "contentWorkspaceTrialEndsAt"
    | "contentWorkspacePlan"
  >
): boolean {
  if (
    account.contentWorkspaceBillingStatus === "ACTIVE" &&
    !!account.contentWorkspacePlan
  ) {
    return true;
  }

  if (
    account.contentWorkspaceBillingStatus === "TRIAL" &&
    !!account.contentWorkspacePlan
  ) {
    return isContentWorkspaceTrialActive(account);
  }

  return false;
}

export function getContentWorkspacePlan(
  account: Pick<ContentWorkspaceAccount, "contentWorkspacePlan" | "isComped">
): ContentWorkspacePlan | null {
  if (account.isComped) {
    return "STUDIO";
  }

  return account.contentWorkspacePlan;
}

/**
 * Counts the creator's currently owned Content Workspaces.
 */
export async function getActiveWorkspaceCount(
  creatorId: string
): Promise<number> {
  return db.socialCalendar.count({
    where: {
      managerId: creatorId,
    },
  });
}

/**
 * Counts current collaborators across the creator's owned Content Workspaces.
 */
export async function getCollaboratorCount(
  creatorId: string
): Promise<number> {
  return db.calendarCollaborator.count({
    where: {
      calendar: {
        managerId: creatorId,
      },
    },
  });
}

/**
 * Ensures the creator has a usage row.
 */
export async function getOrCreateContentWorkspaceUsage(creatorId: string) {
  return db.contentWorkspaceUsage.upsert({
    where: {
      creatorId,
    },
    create: {
      creatorId,
      cycleStart: new Date(),
      storageBytes: 0,
      storageReservedBytes: 0,
      aiGenerationsUsed: 0,
      aiRegenerationsUsed: 0,
    },
    update: {},
  });
}

/**
 * Returns the complete current entitlement/usage picture for a creator.
 */
export async function getContentWorkspaceUsage(
  account: ContentWorkspaceAccount
): Promise<ContentWorkspaceUsage> {
  const plan = getContentWorkspacePlan(account);

  if (!plan) {
    return {
      plan: null,
      billingStatus: account.contentWorkspaceBillingStatus,
      hasAccess: false,

      activeWorkspaces: await getActiveWorkspaceCount(account.id),
      workspaceLimit: 0,

      collaborators: await getCollaboratorCount(account.id),
      collaboratorLimit: 0,

      storageBytes: 0,
      storageReservedBytes: 0,
      storageLimitBytes: 0,
      storageRemainingBytes: 0,

      aiGenerationsUsed: 0,
      aiGenerationLimit: 0,
      aiGenerationsRemaining: 0,

      aiRegenerationsUsed: 0,
      aiRegenerationLimit: 0,
      aiRegenerationsRemaining: 0,

      cycleStart: null,
    };
  }

  const entitlements = CONTENT_WORKSPACE_PLANS[plan];

  const [workspaceCount, collaboratorCount, usage] = await Promise.all([
    getActiveWorkspaceCount(account.id),
    getCollaboratorCount(account.id),
    getOrCreateContentWorkspaceUsage(account.id),
  ]);

  const storageBytes = Number(usage.storageBytes);
  const storageReservedBytes = Number(usage.storageReservedBytes);
  const storageLimitBytes = entitlements.storageBytes;

  return {
    plan,
    billingStatus: account.contentWorkspaceBillingStatus,
    hasAccess: canAccessContentWorkspace(account),

    activeWorkspaces: workspaceCount,
    workspaceLimit: entitlements.activeWorkspaces,

    collaborators: collaboratorCount,
    collaboratorLimit: entitlements.collaborators,

    storageBytes,
    storageReservedBytes,
    storageLimitBytes,

    storageRemainingBytes: Math.max(
      0,
      storageLimitBytes - storageBytes - storageReservedBytes
    ),

    aiGenerationsUsed: usage.aiGenerationsUsed,
    aiGenerationLimit: entitlements.aiGenerations,
    aiGenerationsRemaining: Math.max(
      0,
      entitlements.aiGenerations - usage.aiGenerationsUsed
    ),

    aiRegenerationsUsed: usage.aiRegenerationsUsed,
    aiRegenerationLimit: entitlements.aiRegenerations,
    aiRegenerationsRemaining: Math.max(
      0,
      entitlements.aiRegenerations - usage.aiRegenerationsUsed
    ),

    cycleStart: usage.cycleStart,
  };
}

/**
 * Checks whether another Content Workspace can be created.
 */
/**
 * Checks whether another Content Workspace can be created.
 *
 * A creator who has never used their Content Workspace trial may
 * create their first workspace. The creation route starts the
 * 3-day trial immediately after the workspace is created.
 */
export async function canCreateContentWorkspace(
  account: ContentWorkspaceAccount
): Promise<{
  allowed: boolean;
  reason?: string;
  usage: ContentWorkspaceUsage;
}> {
  const usage = await getContentWorkspaceUsage(account);

 const hasUnusedTrial =
  !!usage.plan &&
  account.contentWorkspaceTrialUsedAt === null;

  if (!usage.hasAccess && !hasUnusedTrial) {
    return {
      allowed: false,
      reason:
        "Your Content Workspace subscription or trial is not active.",
      usage,
    };
  }

  if (
    usage.activeWorkspaces >= usage.workspaceLimit
  ) {
    return {
      allowed: false,
      reason: `Your ${usage.plan} plan allows up to ${
        usage.workspaceLimit
      } active Content Workspace${
        usage.workspaceLimit === 1 ? "" : "s"
      }.`,
      usage,
    };
  }

  return {
    allowed: true,
    usage,
  };
}
/**
 * Checks whether another collaborator can be added.
 */
export async function canAddContentWorkspaceCollaborator(
  account: ContentWorkspaceAccount
): Promise<{
  allowed: boolean;
  reason?: string;
  usage: ContentWorkspaceUsage;
}> {
  const usage = await getContentWorkspaceUsage(account);

  if (!usage.hasAccess) {
    return {
      allowed: false,
      reason: "Your Content Workspace subscription or trial is not active.",
      usage,
    };
  }

  if (usage.collaborators >= usage.collaboratorLimit) {
    return {
      allowed: false,
      reason: `Your ${usage.plan} plan allows up to ${usage.collaboratorLimit} collaborators.`,
      usage,
    };
  }

  return {
    allowed: true,
    usage,
  };
}

function formatStorageBytes(bytes: number): string {
  if (bytes >= 1_000_000_000) {
    return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
  }

  if (bytes >= 1_000_000) {
    return `${(bytes / 1_000_000).toFixed(2)} MB`;
  }

  if (bytes >= 1_000) {
    return `${(bytes / 1_000).toFixed(2)} KB`;
  }

  return `${bytes} bytes`;
}

/**
 * Creates a storage reservation for a specific upload.
 *
 * The reservation is tied to the creator, calendar and R2 file key.
 * This prevents one upload from accidentally finalizing or releasing
 * another upload's reservation.
 */
export async function reserveContentWorkspaceStorage(
  creatorId: string,
  calendarId: string,
  fileKey: string,
  bytes: number
): Promise<{
  allowed: boolean;
  reason?: string;
  reservationId?: string;
  storageBytes: number;
  storageReservedBytes: number;
  storageLimitBytes: number;
  storageRemainingBytes: number;
}> {
  if (!Number.isSafeInteger(bytes) || bytes <= 0) {
    return {
      allowed: false,
      reason: "A valid file size is required.",
      storageBytes: 0,
      storageReservedBytes: 0,
      storageLimitBytes: 0,
      storageRemainingBytes: 0,
    };
  }

  if (!fileKey || !calendarId) {
    return {
      allowed: false,
      reason: "A valid upload destination is required.",
      storageBytes: 0,
      storageReservedBytes: 0,
      storageLimitBytes: 0,
      storageRemainingBytes: 0,
    };
  }

  const creator = await db.creator.findUnique({
    where: { id: creatorId },
    select: {
      contentWorkspacePlan: true,
      contentWorkspaceBillingStatus: true,
      contentWorkspaceTrialEndsAt: true,
      isComped: true,
    },
  });

  if (!creator) {
    return {
      allowed: false,
      reason: "Creator not found.",
      storageBytes: 0,
      storageReservedBytes: 0,
      storageLimitBytes: 0,
      storageRemainingBytes: 0,
    };
  }

  const plan = getContentWorkspacePlan(creator);

  if (!plan || !canAccessContentWorkspace(creator)) {
    return {
      allowed: false,
      reason: "Your Content Workspace subscription or trial is not active.",
      storageBytes: 0,
      storageReservedBytes: 0,
      storageLimitBytes: 0,
      storageRemainingBytes: 0,
    };
  }

  const storageLimitBytes = CONTENT_WORKSPACE_PLANS[plan].storageBytes;

  /*
   * Ensure the calendar belongs to this creator.
   * This prevents a caller from creating a reservation against
   * an unrelated workspace.
   */
  const calendar = await db.socialCalendar.findUnique({
    where: { id: calendarId },
    select: {
      managerId: true,
    },
  });

  if (!calendar || calendar.managerId !== creatorId) {
    return {
      allowed: false,
      reason: "Content Workspace not found.",
      storageBytes: 0,
      storageReservedBytes: 0,
      storageLimitBytes,
      storageRemainingBytes: 0,
    };
  }

  await getOrCreateContentWorkspaceUsage(creatorId);

  const result = await db.$transaction(async (tx) => {
    const current = await tx.contentWorkspaceUsage.findUnique({
      where: { creatorId },
      select: {
        storageBytes: true,
        storageReservedBytes: true,
      },
    });

    if (!current) {
      return {
        allowed: false as const,
        storageBytes: 0,
        storageReservedBytes: 0,
      };
    }

    const storageBytes = Number(current.storageBytes);
    const storageReservedBytes = Number(current.storageReservedBytes);
    const remaining =
      storageLimitBytes - storageBytes - storageReservedBytes;

    if (bytes > remaining) {
      return {
        allowed: false as const,
        storageBytes,
        storageReservedBytes,
      };
    }

    await tx.contentWorkspaceUsage.update({
      where: { creatorId },
      data: {
        storageReservedBytes: {
          increment: BigInt(bytes),
        },
      },
    });

    const reservation =
      await tx.contentWorkspaceStorageReservation.create({
        data: {
          creatorId,
          calendarId,
          fileKey,
          bytes: BigInt(bytes),
          status: "PENDING",
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
        },
        select: {
          id: true,
        },
      });

    return {
      allowed: true as const,
      reservationId: reservation.id,
      storageBytes,
      storageReservedBytes: storageReservedBytes + bytes,
    };
  });

  if (!result.allowed) {
    return {
      allowed: false,
      reason: `This upload exceeds your available Content Workspace storage. You have ${formatStorageBytes(
        Math.max(
          0,
          storageLimitBytes -
            result.storageBytes -
            result.storageReservedBytes
        )
      )} remaining.`,
      storageBytes: result.storageBytes,
      storageReservedBytes: result.storageReservedBytes,
      storageLimitBytes,
      storageRemainingBytes: Math.max(
        0,
        storageLimitBytes -
          result.storageBytes -
          result.storageReservedBytes
      ),
    };
  }

  return {
    allowed: true,
    reservationId: result.reservationId,
    storageBytes: result.storageBytes,
    storageReservedBytes: result.storageReservedBytes,
    storageLimitBytes,
    storageRemainingBytes: Math.max(
      0,
      storageLimitBytes -
        result.storageBytes -
        result.storageReservedBytes
    ),
  };
}

/**
 * Finalizes one specific upload reservation.
 *
 * This is idempotent: a reservation already marked COMPLETED
 * cannot be counted again.
 */
export async function finalizeContentWorkspaceStorageReservation(
  reservationId: string,
  creatorId: string,
  calendarId: string,
  fileKey: string
): Promise<{
  success: boolean;
  bytes: number;
  alreadyFinalized?: boolean;
  error?: string;
}> {
  if (!reservationId || !creatorId || !calendarId || !fileKey) {
    return {
      success: false,
      bytes: 0,
      error: "Invalid storage reservation.",
    };
  }

  return db.$transaction(async (tx) => {
    const reservation =
      await tx.contentWorkspaceStorageReservation.findUnique({
        where: { id: reservationId },
      });

    if (!reservation) {
      return {
        success: false,
        bytes: 0,
        error: "Storage reservation not found.",
      };
    }

    if (
      reservation.creatorId !== creatorId ||
      reservation.calendarId !== calendarId ||
      reservation.fileKey !== fileKey
    ) {
      return {
        success: false,
        bytes: 0,
        error: "Storage reservation does not match this upload.",
      };
    }

    if (
      reservation.status ===
      ("COMPLETED" as ContentWorkspaceStorageReservationStatus)
    ) {
      return {
        success: true,
        bytes: Number(reservation.bytes),
        alreadyFinalized: true,
      };
    }

    if (
      reservation.status !==
      ("PENDING" as ContentWorkspaceStorageReservationStatus)
    ) {
      return {
        success: false,
        bytes: 0,
        error: "This storage reservation is no longer active.",
      };
    }

    const bytes = Number(reservation.bytes);

    if (!Number.isSafeInteger(bytes) || bytes <= 0) {
      return {
        success: false,
        bytes: 0,
        error: "Invalid reserved file size.",
      };
    }

    const usage = await tx.contentWorkspaceUsage.findUnique({
      where: { creatorId },
      select: {
        storageReservedBytes: true,
      },
    });

    if (!usage || Number(usage.storageReservedBytes) < bytes) {
      return {
        success: false,
        bytes: 0,
        error: "Storage reservation accounting is inconsistent.",
      };
    }

    await tx.contentWorkspaceUsage.update({
      where: { creatorId },
      data: {
        storageReservedBytes: {
          decrement: BigInt(bytes),
        },
        storageBytes: {
          increment: BigInt(bytes),
        },
      },
    });

    await tx.contentWorkspaceStorageReservation.update({
      where: { id: reservationId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    return {
      success: true,
      bytes,
    };
  });
}

/**
 * Releases one specific pending upload reservation.
 *
 * This is idempotent: COMPLETED and RELEASED reservations are not
 * deducted a second time.
 */
export async function releaseContentWorkspaceStorageReservation(
  reservationId: string,
  creatorId: string,
  calendarId: string,
  fileKey: string
): Promise<{
  success: boolean;
  bytes: number;
  alreadyReleased?: boolean;
  error?: string;
}> {
  if (!reservationId || !creatorId || !calendarId || !fileKey) {
    return {
      success: false,
      bytes: 0,
      error: "Invalid storage reservation.",
    };
  }

  return db.$transaction(async (tx) => {
    const reservation =
      await tx.contentWorkspaceStorageReservation.findUnique({
        where: { id: reservationId },
      });

    if (!reservation) {
      return {
        success: false,
        bytes: 0,
        error: "Storage reservation not found.",
      };
    }

    if (
      reservation.creatorId !== creatorId ||
      reservation.calendarId !== calendarId ||
      reservation.fileKey !== fileKey
    ) {
      return {
        success: false,
        bytes: 0,
        error: "Storage reservation does not match this upload.",
      };
    }

    if (
      reservation.status ===
      ("RELEASED" as ContentWorkspaceStorageReservationStatus)
    ) {
      return {
        success: true,
        bytes: Number(reservation.bytes),
        alreadyReleased: true,
      };
    }

    if (
      reservation.status !==
      ("PENDING" as ContentWorkspaceStorageReservationStatus)
    ) {
      return {
        success: false,
        bytes: 0,
        error: "This storage reservation is no longer pending.",
      };
    }

    const bytes = Number(reservation.bytes);

    const usage = await tx.contentWorkspaceUsage.findUnique({
      where: { creatorId },
      select: {
        storageReservedBytes: true,
      },
    });

    if (!usage) {
      return {
        success: false,
        bytes: 0,
        error: "Content Workspace usage record not found.",
      };
    }

    const reservedBytes = Number(usage.storageReservedBytes);
    const releaseBytes = Math.min(reservedBytes, bytes);

    if (releaseBytes > 0) {
      await tx.contentWorkspaceUsage.update({
        where: { creatorId },
        data: {
          storageReservedBytes: {
            decrement: BigInt(releaseBytes),
          },
        },
      });
    }

    await tx.contentWorkspaceStorageReservation.update({
      where: { id: reservationId },
      data: {
        status: "RELEASED",
        releasedAt: new Date(),
      },
    });

    return {
      success: true,
      bytes: releaseBytes,
    };
  });
}

/**
 * Removes confirmed storage usage after a Content Workspace file
 * is deleted.
 */
export async function releaseContentWorkspaceStorage(
  creatorId: string,
  bytes: number
): Promise<void> {
  if (!Number.isSafeInteger(bytes) || bytes <= 0) {
    return;
  }

  await db.$transaction(async (tx) => {
    const usage = await tx.contentWorkspaceUsage.findUnique({
      where: { creatorId },
      select: {
        storageBytes: true,
      },
    });

    if (!usage) {
      return;
    }

    const currentBytes = Number(usage.storageBytes);
    const releaseBytes = Math.min(currentBytes, bytes);

    if (releaseBytes <= 0) {
      return;
    }

    await tx.contentWorkspaceUsage.update({
      where: { creatorId },
      data: {
        storageBytes: {
          decrement: BigInt(releaseBytes),
        },
      },
    });
  });
}

/**
 * Atomically consumes one AI generation.
 */
export async function consumeAiGeneration(
  creatorId: string
): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
}> {
  const creator = await db.creator.findUnique({
    where: { id: creatorId },
    select: {
      contentWorkspacePlan: true,
      contentWorkspaceBillingStatus: true,
      contentWorkspaceTrialEndsAt: true,
      isComped: true,
    },
  });

  if (!creator) {
    return {
      allowed: false,
      used: 0,
      limit: 0,
      remaining: 0,
    };
  }

  const plan = getContentWorkspacePlan(creator);

  if (!plan || !canAccessContentWorkspace(creator)) {
    return {
      allowed: false,
      used: 0,
      limit: 0,
      remaining: 0,
    };
  }

  const limit = CONTENT_WORKSPACE_PLANS[plan].aiGenerations;
  const usage = await getOrCreateContentWorkspaceUsage(creatorId);

  if (usage.aiGenerationsUsed >= limit) {
    return {
      allowed: false,
      used: usage.aiGenerationsUsed,
      limit,
      remaining: 0,
    };
  }

  const updated = await db.contentWorkspaceUsage.update({
    where: { creatorId },
    data: {
      aiGenerationsUsed: {
        increment: 1,
      },
    },
  });

  return {
    allowed: true,
    used: updated.aiGenerationsUsed,
    limit,
    remaining: Math.max(0, limit - updated.aiGenerationsUsed),
  };
}

/**
 * Atomically consumes one AI regeneration.
 */
export async function consumeAiRegeneration(
  creatorId: string
): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
}> {
  const creator = await db.creator.findUnique({
    where: { id: creatorId },
    select: {
      contentWorkspacePlan: true,
      contentWorkspaceBillingStatus: true,
      contentWorkspaceTrialEndsAt: true,
      isComped: true,
    },
  });

  if (!creator) {
    return {
      allowed: false,
      used: 0,
      limit: 0,
      remaining: 0,
    };
  }

  const plan = getContentWorkspacePlan(creator);

  if (!plan || !canAccessContentWorkspace(creator)) {
    return {
      allowed: false,
      used: 0,
      limit: 0,
      remaining: 0,
    };
  }

  const limit = CONTENT_WORKSPACE_PLANS[plan].aiRegenerations;
  const usage = await getOrCreateContentWorkspaceUsage(creatorId);

  if (usage.aiRegenerationsUsed >= limit) {
    return {
      allowed: false,
      used: usage.aiRegenerationsUsed,
      limit,
      remaining: 0,
    };
  }

  const updated = await db.contentWorkspaceUsage.update({
    where: { creatorId },
    data: {
      aiRegenerationsUsed: {
        increment: 1,
      },
    },
  });

  return {
    allowed: true,
    used: updated.aiRegenerationsUsed,
    limit,
    remaining: Math.max(0, limit - updated.aiRegenerationsUsed),
  };
}
/**
 * Releases expired pending Content Workspace storage reservations.
 *
 * This is intended to run from a scheduled maintenance job.
 * Each reservation is handled transactionally so its reserved bytes
 * are released exactly once.
 */
export async function cleanupExpiredContentWorkspaceStorageReservations(): Promise<{
  processed: number;
  released: number;
  failed: number;
  releasedBytes: number;
}> {
  const now = new Date();

  const reservations =
    await db.contentWorkspaceStorageReservation.findMany({
      where: {
        status: "PENDING",
        expiresAt: {
          lte: now,
        },
      },
      select: {
        id: true,
        creatorId: true,
        bytes: true,
      },
      orderBy: {
        expiresAt: "asc",
      },
      take: 100,
    });

  let released = 0;
  let failed = 0;
  let releasedBytes = 0;

  for (const reservation of reservations) {
    try {
      const result = await db.$transaction(async (tx) => {
        const current =
          await tx.contentWorkspaceStorageReservation.findUnique({
            where: { id: reservation.id },
            select: {
              creatorId: true,
              bytes: true,
              status: true,
              expiresAt: true,
            },
          });

        if (
          !current ||
          current.status !== "PENDING" ||
          current.expiresAt > now
        ) {
          return {
            released: false,
            bytes: 0,
          };
        }

        const bytes = Number(current.bytes);

        if (!Number.isSafeInteger(bytes) || bytes <= 0) {
          await tx.contentWorkspaceStorageReservation.update({
            where: { id: reservation.id },
            data: {
              status: "RELEASED",
              releasedAt: now,
            },
          });

          return {
            released: true,
            bytes: 0,
          };
        }

        const usage = await tx.contentWorkspaceUsage.findUnique({
          where: {
            creatorId: current.creatorId,
          },
          select: {
            storageReservedBytes: true,
          },
        });

        if (!usage) {
          await tx.contentWorkspaceStorageReservation.update({
            where: { id: reservation.id },
            data: {
              status: "RELEASED",
              releasedAt: now,
            },
          });

          return {
            released: true,
            bytes: 0,
          };
        }

        const reservedBytes = Number(usage.storageReservedBytes);
        const releaseBytes = Math.min(reservedBytes, bytes);

        if (releaseBytes > 0) {
          await tx.contentWorkspaceUsage.update({
            where: {
              creatorId: current.creatorId,
            },
            data: {
              storageReservedBytes: {
                decrement: BigInt(releaseBytes),
              },
            },
          });
        }

        await tx.contentWorkspaceStorageReservation.update({
          where: {
            id: reservation.id,
          },
          data: {
            status: "RELEASED",
            releasedAt: now,
          },
        });

        return {
          released: true,
          bytes: releaseBytes,
        };
      });

      if (result.released) {
        released += 1;
        releasedBytes += result.bytes;
      }
    } catch {
      failed += 1;
    }
  }

  return {
    processed: reservations.length,
    released,
    failed,
    releasedBytes,
  };
}