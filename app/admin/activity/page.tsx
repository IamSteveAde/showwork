import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdminEmail } from "@/lib/admin";

const PAGE_SIZE = 40;

type ActivityCategory =
  | "ACCOUNT"
  | "PROJECT_DELIVERY"
  | "PORTFOLIO"
  | "CONTENT_WORKSPACE"
  | "COLLABORATION"
  | "CLIENT_ACTIVITY"
  | "BILLING";

type Activity = {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorEmail: string;
  category: ActivityCategory;
  action: string;
  description: string;
  timestamp: Date;
  href: string;
  meta?: string;
  amount?: number;
};

const CATEGORY_META: Record<
  ActivityCategory,
  {
    label: string;
    bg: string;
    text: string;
    dot: string;
  }
> = {
  ACCOUNT: {
    label: "Account",
    bg: "bg-slate-100",
    text: "text-slate-700",
    dot: "bg-slate-500",
  },
  PROJECT_DELIVERY: {
    label: "Project Delivery",
    bg: "bg-blue-50",
    text: "text-blue-700",
    dot: "bg-blue-500",
  },
  PORTFOLIO: {
    label: "Portfolio",
    bg: "bg-violet-50",
    text: "text-violet-700",
    dot: "bg-violet-500",
  },
  CONTENT_WORKSPACE: {
    label: "Content Workspace",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  COLLABORATION: {
    label: "Collaboration",
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-500",
  },
  CLIENT_ACTIVITY: {
    label: "Client activity",
    bg: "bg-pink-50",
    text: "text-pink-700",
    dot: "bg-pink-500",
  },
  BILLING: {
    label: "Billing",
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    dot: "bg-indigo-500",
  },
};

function formatNgn(amount: number) {
  return `₦${amount.toLocaleString("en-NG")}`;
}

function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();

  if (diffMs < 0) {
    return "In the future";
  }

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  }

  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  if (days < 30) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  return date.toLocaleDateString("en-NG", {
    timeZone: "Africa/Lagos",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fullDate(date: Date): string {
  return date.toLocaleString("en-NG", {
    timeZone: "Africa/Lagos",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function dayLabel(date: Date): string {
  const parts = (value: Date) => new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(value);
  const todayKey = parts(new Date());
  const dateKey = parts(date);
  const startToday = new Date(`${todayKey}T00:00:00Z`);
  const startDate = new Date(`${dateKey}T00:00:00Z`);
  const diffDays = Math.floor((startToday.getTime() - startDate.getTime()) / 86_400_000);

  if (diffDays === 0) {
    return "Today";
  }

  if (diffDays === 1) {
    return "Yesterday";
  }

  if (diffDays < 7) {
    return date.toLocaleDateString("en-NG", {
      timeZone: "Africa/Lagos",
      weekday: "long",
    });
  }

  return date.toLocaleDateString("en-NG", {
    timeZone: "Africa/Lagos",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getInitials(name: string, email: string): string {
  const source = name.trim() || email.split("@")[0] || "?";

  const parts = source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function categoryFromPaymentType(type: string): ActivityCategory {
  if (
    type === "CALENDAR_SUBSCRIPTION_INITIAL" ||
    type === "CALENDAR_SUBSCRIPTION_RENEWAL"
  ) {
    return "CONTENT_WORKSPACE";
  }

  if (
    type === "PORTFOLIO_SUBSCRIPTION_INITIAL" ||
    type === "PORTFOLIO_SUBSCRIPTION_RENEWAL"
  ) {
    return "PORTFOLIO";
  }

  if (type === "PROJECT_ONE_TIME") {
    return "PROJECT_DELIVERY";
  }

  return "BILLING";
}

function paymentAction(type: string): string {
  switch (type) {
    case "PROJECT_ONE_TIME":
      return "Project payment received";

    case "SUBSCRIPTION_INITIAL":
      return "Project Delivery subscription started";

    case "SUBSCRIPTION_RENEWAL":
      return "Project Delivery subscription renewed";

    case "PORTFOLIO_SUBSCRIPTION_INITIAL":
      return "Portfolio subscription started";

    case "PORTFOLIO_SUBSCRIPTION_RENEWAL":
      return "Portfolio subscription renewed";

    case "CALENDAR_SUBSCRIPTION_INITIAL":
      return "Content Workspace subscription started";

    case "CALENDAR_SUBSCRIPTION_RENEWAL":
      return "Content Workspace subscription renewed";

    case "AI_ASSISTANT_SUBSCRIPTION_INITIAL":
      return "AI subscription started";

    case "AI_ASSISTANT_SUBSCRIPTION_RENEWAL":
      return "AI subscription renewed";

    default:
      return "Payment received";
  }
}

function categoryLabel(category: ActivityCategory) {
  return CATEGORY_META[category].label;
}

function sortActivities(activities: Activity[]) {
  return activities.sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );
}

function groupByDay(activities: Activity[]) {
  const groups = new Map<string, Activity[]>();

  for (const activity of activities) {
    const key = dayLabel(activity.timestamp);

    const existing = groups.get(key);

    if (existing) {
      existing.push(activity);
    } else {
      groups.set(key, [activity]);
    }
  }

  return Array.from(groups.entries()).map(([label, items]) => ({
    label,
    items,
  }));
}

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    page?: string;
  }>;
}) {
  const creator = await getCurrentCreator();

  if (!creator) {
    redirect("/login");
  }

  if (!isAdminEmail(creator.email)) {
    notFound();
  }

  const params = await searchParams;

  const query = (params.q ?? "").trim().toLowerCase();

  const requestedCategory = params.category ?? "ALL";

  const currentPage = Math.max(
    1,
    Number.parseInt(params.page ?? "1", 10) || 1
  );

  /*
   * IMPORTANT:
   * Keep these queries sequential.
   *
   * The current database pool is configured with connection_limit=1.
   * Running these in Promise.all() causes P2024 connection-pool timeouts.
   */

  // ------------------------------------------------------------
  // CREATOR ACCOUNTS
  // ------------------------------------------------------------

  const creators = await db.creator.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  const creatorMap = new Map(
    creators.map((item) => [
      item.id,
      {
        name: item.name || "Unnamed creator",
        email: item.email,
      },
    ])
  );

  // ------------------------------------------------------------
  // PROJECT DELIVERY
  // ------------------------------------------------------------

const projects = await db.project.findMany({
  select: {
    id: true,
    clientName: true,
    creatorId: true,
    deliveryStatus: true,
    createdAt: true,
    updatedAt: true,
  },
  orderBy: {
    updatedAt: "desc",
  },
  take: 500,
});

  // ------------------------------------------------------------
  // PROJECT MEDIA
  // ------------------------------------------------------------

const media = await db.media.findMany({
  select: {
    id: true,
    projectId: true,
    fileKey: true,
    type: true,
    caption: true,
    createdAt: true,
  },
  orderBy: {
    createdAt: "desc",
  },
  take: 500,
});

  // ------------------------------------------------------------
  // PROJECT REVIEWS
  // ------------------------------------------------------------

  const mediaReviews = await db.mediaReview.findMany({
    select: {
      id: true,
      mediaId: true,
      reviewerName: true,
      reviewerEmail: true,
      status: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 500,
  });

  // ------------------------------------------------------------
  // VIDEO COMMENTS
  // ------------------------------------------------------------

  const videoComments = await db.videoComment.findMany({
    select: {
      id: true,
      mediaId: true,
      reviewerName: true,
      reviewerEmail: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 500,
  });

  // ------------------------------------------------------------
  // PROJECT VIEWER EMAILS
  // ------------------------------------------------------------

  const viewerEmails = await db.viewerEmail.findMany({
    select: {
      id: true,
      projectId: true,
      name: true,
      email: true,
      viewedAt: true,
    },
    orderBy: {
      viewedAt: "desc",
    },
    take: 500,
  });

  // ------------------------------------------------------------
  // PROJECT COLLABORATORS
  // ------------------------------------------------------------

  const projectCollaborators = await db.projectCollaborator.findMany({
    select: {
      id: true,
      projectId: true,
      creatorId: true,
      addedAt: true,
    },
    orderBy: {
      addedAt: "desc",
    },
    take: 500,
  });

  // ------------------------------------------------------------
  // PROJECT INVITES
  // ------------------------------------------------------------

  const projectInvites = await db.projectInvite.findMany({
    select: {
      id: true,
      projectId: true,
      invitedByCreatorId: true,
      email: true,
      status: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 500,
  });

  // ------------------------------------------------------------
  // PORTFOLIOS
  // ------------------------------------------------------------

  const portfolios = await db.portfolio.findMany({
    select: {
      id: true,
      creatorId: true,
      slug: true,
      companyName: true,
      createdAt: true,
      updatedAt: true,
      viewCount: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 500,
  });

  // ------------------------------------------------------------
  // CONTENT WORKSPACES
  // ------------------------------------------------------------

  const calendars = await db.socialCalendar.findMany({
    select: {
      id: true,
      slug: true,
      clientName: true,
      managerId: true,
      planStatus: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 500,
  });

  // ------------------------------------------------------------
  // CONTENT WORKSPACE POSTS
  // ------------------------------------------------------------

  const calendarPosts = await db.calendarPost.findMany({
    select: {
      id: true,
      calendarId: true,
      platform: true,
      postDate: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 500,
  });

  // ------------------------------------------------------------
  // CONTENT WORKSPACE COLLABORATORS
  // ------------------------------------------------------------

  const calendarCollaborators =
    await db.calendarCollaborator.findMany({
      select: {
        id: true,
        calendarId: true,
        creatorId: true,
        role: true,
        addedAt: true,
      },
      orderBy: {
        addedAt: "desc",
      },
      take: 500,
    });

  // ------------------------------------------------------------
  // CONTENT WORKSPACE INVITES
  // ------------------------------------------------------------

  const calendarInvites = await db.calendarInvite.findMany({
    select: {
      id: true,
      calendarId: true,
      invitedByCreatorId: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      respondedAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 500,
  });

  // ------------------------------------------------------------
  // CONTENT WORKSPACE CLIENT VIEWS
  // ------------------------------------------------------------

  const calendarViewerEmails =
    await db.calendarViewerEmail.findMany({
      select: {
        id: true,
        calendarId: true,
        name: true,
        email: true,
        viewedAt: true,
      },
      orderBy: {
        viewedAt: "desc",
      },
      take: 500,
    });

  // ------------------------------------------------------------
  // BUSINESS KNOWLEDGE DOCUMENTS
  // ------------------------------------------------------------

  const businessDocuments =
    await db.calendarBusinessDocument.findMany({
      select: {
        id: true,
        calendarId: true,
        originalName: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 500,
    });

  // ------------------------------------------------------------
  // PAYMENTS
  // ------------------------------------------------------------

  const payments = await db.paymentRecord.findMany({
    select: {
      id: true,
      creatorId: true,
      amountNgn: true,
      type: true,
      tier: true,
      cycle: true,
      portfolioId: true,
      calendarId: true,
      paystackReference: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 500,
  });

  // ------------------------------------------------------------
  // BUILD LOOKUP MAPS
  // ------------------------------------------------------------

  const projectMap = new Map(
    projects.map((project) => [project.id, project])
  );

  const portfolioMap = new Map(
    portfolios.map((portfolio) => [portfolio.id, portfolio])
  );

  const calendarMap = new Map(
    calendars.map((calendar) => [calendar.id, calendar])
  );

  const mediaMap = new Map(
    media.map((item) => [item.id, item])
  );

  // ------------------------------------------------------------
  // ACTIVITY COLLECTION
  // ------------------------------------------------------------

  const activities: Activity[] = [];

  // ------------------------------------------------------------
  // ACCOUNT CREATION
  // ------------------------------------------------------------

  for (const item of creators) {
    const account = creatorMap.get(item.id);

    if (!account) {
      continue;
    }

    activities.push({
      id: `creator-created-${item.id}`,
      creatorId: item.id,
      creatorName: account.name,
      creatorEmail: account.email,
      category: "ACCOUNT",
      action: "Account created",
      description: `${account.name} joined Showwork`,
      timestamp: item.createdAt,
      href: `/admin/creators/${item.id}`,
      meta: account.email,
    });
  }

  // ------------------------------------------------------------
  // LOGIN ACTIVITY
  // ------------------------------------------------------------

  for (const item of creators) {
    if (!item.lastLoginAt) {
      continue;
    }

    const account = creatorMap.get(item.id);

    if (!account) {
      continue;
    }

    activities.push({
      id: `creator-login-${item.id}-${item.lastLoginAt.getTime()}`,
      creatorId: item.id,
      creatorName: account.name,
      creatorEmail: account.email,
      category: "ACCOUNT",
      action: "Signed in",
      description: `${account.name} signed in to Showwork`,
      timestamp: item.lastLoginAt,
      href: `/admin/creators/${item.id}`,
      meta: account.email,
    });
  }

  // ------------------------------------------------------------
  // PROJECT CREATION / UPDATES
  // ------------------------------------------------------------

  for (const project of projects) {
    const account = creatorMap.get(project.creatorId);

    if (!account) {
      continue;
    }

    activities.push({
      id: `project-created-${project.id}`,
      creatorId: project.creatorId,
      creatorName: account.name,
      creatorEmail: account.email,
      category: "PROJECT_DELIVERY",
      action: "Project created",
     description: `${account.name} created "${project.clientName}"`,
      timestamp: project.createdAt,
      href: `/admin/creators/${project.creatorId}`,
      meta: project.deliveryStatus,
    });

  }

  // ------------------------------------------------------------
  // MEDIA UPLOADS
  // ------------------------------------------------------------

  for (const item of media) {
    const project = projectMap.get(item.projectId);

    if (!project) {
      continue;
    }

    const account = creatorMap.get(project.creatorId);

    if (!account) {
      continue;
    }

    activities.push({
      id: `media-${item.id}`,
      creatorId: project.creatorId,
      creatorName: account.name,
      creatorEmail: account.email,
      category: "PROJECT_DELIVERY",
      action: "File uploaded",
      description: `${account.name} uploaded "${
  item.caption ||
  item.fileKey.split("/").pop() ||
  "Uploaded file"
}"`,
      timestamp: item.createdAt,
      href: `/admin/creators/${project.creatorId}`,
      meta: project.clientName,
    });
  }

  // ------------------------------------------------------------
  // MEDIA REVIEWS
  // ------------------------------------------------------------

  for (const review of mediaReviews) {
    const item = mediaMap.get(review.mediaId);

    if (!item) {
      continue;
    }

    const project = projectMap.get(item.projectId);

    if (!project) {
      continue;
    }

    const account = creatorMap.get(project.creatorId);

    if (!account) {
      continue;
    }

    activities.push({
      id: `media-review-${review.id}`,
      creatorId: project.creatorId,
      creatorName: review.reviewerName || review.reviewerEmail,
      creatorEmail: review.reviewerEmail,
      category: "CLIENT_ACTIVITY",
      action:
        review.status === "APPROVED"
          ? "File approved"
          : "Revision requested",
      description:
        review.status === "APPROVED"
          ? `${review.reviewerName || review.reviewerEmail} approved a file`
          : `${review.reviewerName || review.reviewerEmail} requested a revision`,
      timestamp: review.createdAt,
      href: `/admin/creators/${project.creatorId}`,
      meta: project.clientName,
    });
  }

  // ------------------------------------------------------------
  // VIDEO COMMENTS
  // ------------------------------------------------------------

  for (const comment of videoComments) {
    const item = mediaMap.get(comment.mediaId);

    if (!item) {
      continue;
    }

    const project = projectMap.get(item.projectId);

    if (!project) {
      continue;
    }

    const account = creatorMap.get(project.creatorId);

    if (!account) {
      continue;
    }

    activities.push({
      id: `video-comment-${comment.id}`,
      creatorId: project.creatorId,
      creatorName: comment.reviewerName || comment.reviewerEmail,
      creatorEmail: comment.reviewerEmail,
      category: "CLIENT_ACTIVITY",
      action: "Video feedback added",
      description: `${comment.reviewerName || comment.reviewerEmail} left video feedback`,
      timestamp: comment.createdAt,
      href: `/admin/creators/${project.creatorId}`,
      meta: project.clientName,
    });
  }

  // ------------------------------------------------------------
  // PROJECT CLIENT VIEWS
  // ------------------------------------------------------------

  for (const view of viewerEmails) {
    const project = projectMap.get(view.projectId);

    if (!project) {
      continue;
    }

    const account = creatorMap.get(project.creatorId);

    if (!account) {
      continue;
    }

    activities.push({
      id: `project-view-${view.id}`,
      creatorId: project.creatorId,
      creatorName: view.name || view.email,
      creatorEmail: view.email,
      category: "CLIENT_ACTIVITY",
      action: "Client viewed project",
      description: `${view.name || view.email} viewed "${project.clientName}"`,
      timestamp: view.viewedAt,
      href: `/admin/creators/${project.creatorId}`,
      meta: view.email,
    });
  }

  // ------------------------------------------------------------
  // PROJECT COLLABORATORS
  // ------------------------------------------------------------

  for (const membership of projectCollaborators) {
    const project = projectMap.get(membership.projectId);

    if (!project) {
      continue;
    }

    const owner = creatorMap.get(project.creatorId);
    const collaborator = creatorMap.get(membership.creatorId);

    if (!owner) {
      continue;
    }

    activities.push({
      id: `project-collaborator-${membership.id}`,
      creatorId: membership.creatorId,
      creatorName: collaborator?.name || "Collaborator",
      creatorEmail: collaborator?.email || "",
      category: "COLLABORATION",
      action: "Joined project",
description: `${collaborator?.name || collaborator?.email || "A creator"} joined "${project.clientName}"`,
      timestamp: membership.addedAt,
      href: `/admin/creators/${membership.creatorId}`,
      meta: `Owner: ${owner.name}`,
    });
  }

  // ------------------------------------------------------------
  // PROJECT INVITES
  // ------------------------------------------------------------

  for (const invite of projectInvites) {
    const project = projectMap.get(invite.projectId);
    const account = creatorMap.get(invite.invitedByCreatorId);

    if (!project || !account) {
      continue;
    }

    activities.push({
      id: `project-invite-${invite.id}`,
      creatorId: invite.invitedByCreatorId,
      creatorName: account.name,
      creatorEmail: account.email,
      category: "COLLABORATION",
      action: "Project invitation sent",
      description: `${account.name} invited ${invite.email} to "${project.clientName}"`,
      timestamp: invite.createdAt,
      href: `/admin/creators/${invite.invitedByCreatorId}`,
      meta: `Status: ${invite.status}`,
    });
  }

  // ------------------------------------------------------------
  // PORTFOLIO CREATION
  // ------------------------------------------------------------

  for (const portfolio of portfolios) {
    const account = creatorMap.get(portfolio.creatorId);

    if (!account) {
      continue;
    }

    activities.push({
      id: `portfolio-created-${portfolio.id}`,
      creatorId: portfolio.creatorId,
      creatorName: account.name,
      creatorEmail: account.email,
      category: "PORTFOLIO",
      action: "Portfolio created",
      description: `${account.name} created "${portfolio.companyName}"`,
      timestamp: portfolio.createdAt,
      href: `/admin/creators/${portfolio.creatorId}`,
      meta: `/${portfolio.slug}`,
    });

  }

  // ------------------------------------------------------------
  // CONTENT WORKSPACE CREATION
  // ------------------------------------------------------------

  for (const calendar of calendars) {
    const account = creatorMap.get(calendar.managerId);

    if (!account) {
      continue;
    }

    activities.push({
      id: `calendar-created-${calendar.id}`,
      creatorId: calendar.managerId,
      creatorName: account.name,
      creatorEmail: account.email,
      category: "CONTENT_WORKSPACE",
      action: "Workspace created",
      description: `${account.name} created the "${calendar.clientName}" workspace`,
      timestamp: calendar.createdAt,
      href: `/admin/creators/${calendar.managerId}`,
      meta: calendar.planStatus,
    });

  }

  // ------------------------------------------------------------
  // CONTENT POSTS
  // ------------------------------------------------------------

  for (const post of calendarPosts) {
    const calendar = calendarMap.get(post.calendarId);

    if (!calendar) {
      continue;
    }

    const account = creatorMap.get(calendar.managerId);

    if (!account) {
      continue;
    }

    activities.push({
      id: `calendar-post-created-${post.id}`,
      creatorId: calendar.managerId,
      creatorName: account.name,
      creatorEmail: account.email,
      category: "CONTENT_WORKSPACE",
      action: "Content created",
      description: `${account.name} created ${post.platform} content for "${calendar.clientName}"`,
      timestamp: post.createdAt,
      href: `/admin/creators/${calendar.managerId}`,
      meta: post.platform,
    });

  }

  // ------------------------------------------------------------
  // CALENDAR COLLABORATORS
  // ------------------------------------------------------------

  for (const membership of calendarCollaborators) {
    const calendar = calendarMap.get(membership.calendarId);

    if (!calendar) {
      continue;
    }

    const account = creatorMap.get(membership.creatorId);

    if (!account) {
      continue;
    }

    activities.push({
      id: `calendar-collaborator-${membership.id}`,
      creatorId: membership.creatorId,
      creatorName: account.name,
      creatorEmail: account.email,
      category: "COLLABORATION",
      action: "Joined workspace",
      description: `${account.name} joined "${calendar.clientName}"`,
      timestamp: membership.addedAt,
      href: `/admin/creators/${membership.creatorId}`,
      meta: membership.role,
    });
  }

  // ------------------------------------------------------------
  // CALENDAR INVITES
  // ------------------------------------------------------------

  for (const invite of calendarInvites) {
    const calendar = calendarMap.get(invite.calendarId);
    const account = creatorMap.get(invite.invitedByCreatorId);

    if (!calendar || !account) {
      continue;
    }

    activities.push({
      id: `calendar-invite-${invite.id}`,
      creatorId: invite.invitedByCreatorId,
      creatorName: account.name,
      creatorEmail: account.email,
      category: "COLLABORATION",
      action: "Workspace invitation sent",
      description: `${account.name} invited ${invite.email} to "${calendar.clientName}"`,
      timestamp: invite.createdAt,
      href: `/admin/creators/${invite.invitedByCreatorId}`,
      meta: `Status: ${invite.status}`,
    });
  }

  // ------------------------------------------------------------
  // CALENDAR CLIENT VIEWS
  // ------------------------------------------------------------

  for (const view of calendarViewerEmails) {
    const calendar = calendarMap.get(view.calendarId);

    if (!calendar) {
      continue;
    }

    const account = creatorMap.get(calendar.managerId);

    if (!account) {
      continue;
    }

    activities.push({
      id: `calendar-view-${view.id}`,
      creatorId: calendar.managerId,
      creatorName: view.name || view.email,
      creatorEmail: view.email,
      category: "CLIENT_ACTIVITY",
      action: "Client viewed workspace",
      description: `${view.name || view.email} viewed "${calendar.clientName}"`,
      timestamp: view.viewedAt,
      href: `/admin/creators/${calendar.managerId}`,
      meta: view.email,
    });
  }

  // ------------------------------------------------------------
  // BUSINESS KNOWLEDGE
  // ------------------------------------------------------------

  for (const document of businessDocuments) {
    const calendar = calendarMap.get(document.calendarId);

    if (!calendar) {
      continue;
    }

    const account = creatorMap.get(calendar.managerId);

    if (!account) {
      continue;
    }

    activities.push({
      id: `business-document-${document.id}`,
      creatorId: calendar.managerId,
      creatorName: account.name,
      creatorEmail: account.email,
      category: "CONTENT_WORKSPACE",
      action: "Business knowledge uploaded",
      description: `${account.name} uploaded "${document.originalName}"`,
      timestamp: document.createdAt,
      href: `/admin/creators/${calendar.managerId}`,
      meta: calendar.clientName,
    });
  }

  // ------------------------------------------------------------
  // PAYMENTS
  // ------------------------------------------------------------

  for (const payment of payments) {
    const account = creatorMap.get(payment.creatorId);

    if (!account) {
      continue;
    }

    const category = categoryFromPaymentType(payment.type);

    let description = `${account.name} made a payment`;

    if (payment.type.includes("CALENDAR")) {
      const calendar = payment.calendarId
        ? calendarMap.get(payment.calendarId)
        : undefined;

      description = calendar
        ? `${account.name} paid for "${calendar.clientName}"`
        : `${account.name} paid for Content Workspace`;
    } else if (payment.type.includes("PORTFOLIO")) {
      const portfolio = payment.portfolioId
        ? portfolioMap.get(payment.portfolioId)
        : undefined;

      description = portfolio
        ? `${account.name} paid for "${portfolio.companyName}"`
        : `${account.name} paid for a portfolio`;
    } else {
      description = `${account.name} completed a Project Delivery payment`;
    }

    activities.push({
      id: `payment-${payment.id}`,
      creatorId: payment.creatorId,
      creatorName: account.name,
      creatorEmail: account.email,
      category,
      action: paymentAction(payment.type),
      description,
      timestamp: payment.createdAt,
      href: `/admin/creators/${payment.creatorId}`,
      meta: [
        payment.tier || null,
        payment.cycle || null,
        payment.paystackReference
          ? `Ref: ${payment.paystackReference}`
          : null,
      ]
        .filter(Boolean)
        .join(" · "),
      amount: payment.amountNgn,
    });
  }

  // ------------------------------------------------------------
  // SORT
  // ------------------------------------------------------------

  const sortedActivities = sortActivities(activities);

  // ------------------------------------------------------------
  // SEARCH + CATEGORY FILTER
  // ------------------------------------------------------------

  const filteredActivities = sortedActivities.filter((activity) => {
    const matchesCategory =
      requestedCategory === "ALL" ||
      activity.category === requestedCategory;

    if (!matchesCategory) {
      return false;
    }

    if (!query) {
      return true;
    }

    const searchable = [
      activity.creatorName,
      activity.creatorEmail,
      activity.action,
      activity.description,
      activity.meta || "",
      categoryLabel(activity.category),
    ]
      .join(" ")
      .toLowerCase();

    return searchable.includes(query);
  });

  // ------------------------------------------------------------
  // PAGINATION
  // ------------------------------------------------------------

  const totalActivities = filteredActivities.length;

  const totalPages = Math.max(
    1,
    Math.ceil(totalActivities / PAGE_SIZE)
  );

  const safePage = Math.min(currentPage, totalPages);

  const paginatedActivities = filteredActivities.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const groupedActivities = groupByDay(paginatedActivities);

  // ------------------------------------------------------------
  // METRICS
  // ------------------------------------------------------------

  const uniqueActiveCreators = new Set(
    sortedActivities
      .filter((activity) => {
        const diff =
          Date.now() - activity.timestamp.getTime();

        return diff <= 7 * 24 * 60 * 60 * 1000;
      })
      .map((activity) => activity.creatorId)
  ).size;

  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  );

  const recentActivities = sortedActivities.filter(
    (activity) => activity.timestamp >= sevenDaysAgo
  );

  const recentPayments = recentActivities.filter(
    (activity) => activity.category === "BILLING"
  );

  const recentRevenue = recentActivities.reduce(
    (sum, activity) => sum + (activity.amount || 0),
    0
  );

  const categoryCounts = sortedActivities.reduce(
    (acc, activity) => {
      acc[activity.category] =
        (acc[activity.category] || 0) + 1;

      return acc;
    },
    {} as Record<ActivityCategory, number>
  );

  function pageHref(page: number) {
    const params = new URLSearchParams();

    if (query) {
      params.set("q", query);
    }

    if (requestedCategory !== "ALL") {
      params.set("category", requestedCategory);
    }

    params.set("page", String(page));

    return `/admin/activity?${params.toString()}`;
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F6F7F9] text-slate-950">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
        {/* ---------------------------------------------------- */}
        {/* HEADER */}
        {/* ---------------------------------------------------- */}

        <header className="mb-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex items-center gap-2">
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-slate-950"
                >
                  <span aria-hidden="true">←</span>
                  Admin
                </Link>

                <span className="text-slate-300">/</span>

                <span className="text-xs font-medium text-slate-400">
                  Activity
                </span>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 8v4l2.5 2.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                    />
                  </svg>
                </div>

                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Platform operations
                  </p>

                  <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                    Activity &amp; Audit
                  </h1>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                    A chronological view of the activity currently
                    recorded across creator accounts, Project Delivery,
                    Portfolios, Content Workspaces, collaboration,
                    client activity and billing.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Link
                href="/admin"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
              >
                Overview
              </Link>

              <Link
                href="/admin/creators"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
              >
                Creators
              </Link>

              <Link
                href="/dashboard"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-950 px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-slate-800"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </header>

        {/* ---------------------------------------------------- */}
        {/* METRICS */}
        {/* ---------------------------------------------------- */}

        <section className="mb-6 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-slate-500">
                Recorded events
              </p>

              <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                All time
              </span>
            </div>

            <p className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
              {sortedActivities.length.toLocaleString()}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Activity records currently available
            </p>
          </div>

          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-slate-500">
                Active creators
              </p>

              <span className="rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                7 days
              </span>
            </div>

            <p className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
              {uniqueActiveCreators.toLocaleString()}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Creators with recorded activity
            </p>
          </div>

          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-slate-500">
                Events this week
              </p>

              <span className="rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">
                Recent
              </span>
            </div>

            <p className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
              {recentActivities.length.toLocaleString()}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Across every tracked product
            </p>
          </div>

          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-slate-500">
                Recent revenue
              </p>

              <span className="rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-700">
                7 days
              </span>
            </div>

            <p className="mt-4 truncate text-2xl font-semibold tracking-tight text-slate-950">
              {formatNgn(recentRevenue)}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {recentPayments.length} payment event
              {recentPayments.length === 1 ? "" : "s"}
            </p>
          </div>
        </section>

        {/* ---------------------------------------------------- */}
        {/* ACTIVITY BREAKDOWN */}
        {/* ---------------------------------------------------- */}

        <section className="mb-6 min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <p className="text-sm font-semibold text-slate-950">
              Activity breakdown
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Where the recorded platform activity is coming from.
            </p>
          </div>

          <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
            {(
              Object.keys(CATEGORY_META) as ActivityCategory[]
            ).map((category) => {
              const meta = CATEGORY_META[category];

              return (
                <Link
                  key={category}
                  href={`/admin/activity?category=${category}`}
                  className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3 transition-all hover:border-slate-300 hover:bg-white hover:shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`}
                    />

                    <span className="truncate text-[11px] font-medium text-slate-600">
                      {meta.label}
                    </span>
                  </div>

                  <p className="mt-2 text-lg font-semibold text-slate-950">
                    {(categoryCounts[category] || 0).toLocaleString()}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ---------------------------------------------------- */}
        {/* FILTERS */}
        {/* ---------------------------------------------------- */}

        <section className="mb-6 min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <form
            action="/admin/activity"
            method="get"
            className="flex min-w-0 flex-col gap-3 lg:flex-row"
          >
            <div className="relative min-w-0 flex-1">
              <svg
                viewBox="0 0 24 24"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="11" cy="11" r="7" />
                <path
                  strokeLinecap="round"
                  d="m20 20-4-4"
                />
              </svg>

              <input
                type="search"
                name="q"
                defaultValue={params.q ?? ""}
                placeholder="Search creator, email, activity, project, workspace..."
                className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <select
              name="category"
              defaultValue={requestedCategory}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-800 outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100 lg:w-[220px]"
            >
              <option value="ALL">All activity</option>
              <option value="ACCOUNT">Account</option>
              <option value="PROJECT_DELIVERY">
                Project Delivery
              </option>
              <option value="PORTFOLIO">Portfolio</option>
              <option value="CONTENT_WORKSPACE">
                Content Workspace
              </option>
              <option value="COLLABORATION">
                Collaboration
              </option>
              <option value="CLIENT_ACTIVITY">
                Client activity
              </option>
              <option value="BILLING">Billing</option>
            </select>

            <button
              type="submit"
              className="h-11 shrink-0 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              Search activity
            </button>

            {(params.q || requestedCategory !== "ALL") && (
              <Link
                href="/admin/activity"
                className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950"
              >
                Clear
              </Link>
            )}
          </form>
        </section>

        {/* ---------------------------------------------------- */}
        {/* RESULT HEADER */}
        {/* ---------------------------------------------------- */}

        <div className="mb-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-950">
              Activity timeline
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Showing{" "}
              {paginatedActivities.length.toLocaleString()} of{" "}
              {totalActivities.toLocaleString()} matching events
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Live platform records
            </span>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* TIMELINE */}
        {/* ---------------------------------------------------- */}

        {groupedActivities.length > 0 ? (
          <div className="min-w-0 space-y-8">
            {groupedActivities.map((group) => (
              <section key={group.label} className="min-w-0">
                <div className="mb-3 flex items-center gap-3">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {group.label}
                  </h3>

                  <div className="h-px flex-1 bg-slate-200" />

                  <span className="text-[11px] font-medium text-slate-400">
                    {group.items.length}
                  </span>
                </div>

                <div className="relative min-w-0">
                  <div className="absolute bottom-5 left-[19px] top-5 hidden w-px bg-slate-200 sm:block" />

                  <div className="space-y-3">
                    {group.items.map((activity) => {
                      const category =
                        CATEGORY_META[activity.category];

                      const initials = getInitials(
                        activity.creatorName,
                        activity.creatorEmail
                      );

                      return (
                        <Link
                          key={activity.id}
                          href={activity.href}
                          className="group relative block min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-[1px] hover:border-slate-300 hover:shadow-md sm:p-5"
                        >
                          <div className="flex min-w-0 gap-3 sm:gap-4">
                            {/* Timeline marker */}
                            <div className="relative z-10 hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-[#F6F7F9] bg-slate-950 text-[10px] font-bold text-white sm:flex">
                              {initials}
                            </div>

                            {/* Mobile marker */}
                            <div
                              className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full sm:hidden ${category.dot}`}
                            />

                            <div className="min-w-0 flex-1">
                              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                                    <span
                                      className={`inline-flex max-w-full items-center rounded-full px-2 py-1 text-[10px] font-semibold ${category.bg} ${category.text}`}
                                    >
                                      {category.label}
                                    </span>

                                    <span className="text-[11px] text-slate-400">
                                      {relativeTime(
                                        activity.timestamp
                                      )}
                                    </span>
                                  </div>

                                  <h4 className="mt-2 break-words text-sm font-semibold text-slate-950 group-hover:text-slate-700">
                                    {activity.action}
                                  </h4>

                                  <p className="mt-1 break-words text-sm leading-6 text-slate-600">
                                    {activity.description}
                                  </p>
                                </div>

                                <div className="shrink-0 text-left sm:text-right">
                                  <p className="text-[11px] font-medium text-slate-400">
                                    {activity.timestamp.toLocaleTimeString(
                                      "en-NG",
                                      {
                                        timeZone: "Africa/Lagos",
                                        hour: "numeric",
                                        minute: "2-digit",
                                      }
                                    )}
                                  </p>

                                  <p className="mt-1 hidden text-[10px] text-slate-400 sm:block">
                                    {fullDate(
                                      activity.timestamp
                                    )}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-4 flex min-w-0 flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex min-w-0 items-center gap-2">
                                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[9px] font-bold text-slate-600 sm:hidden">
                                    {initials}
                                  </div>

                                  <div className="min-w-0">
                                    <p className="truncate text-xs font-semibold text-slate-800">
                                      {activity.creatorName}
                                    </p>

                                    <p className="truncate text-[10px] text-slate-400">
                                      {activity.creatorEmail}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex min-w-0 items-center justify-between gap-3 sm:justify-end">
                                  {activity.meta && (
                                    <span className="min-w-0 max-w-[70%] truncate rounded-lg bg-slate-50 px-2.5 py-1.5 text-[10px] font-medium text-slate-500">
                                      {activity.meta}
                                    </span>
                                  )}

                                  {typeof activity.amount ===
                                    "number" && (
                                    <span className="shrink-0 text-sm font-semibold text-slate-950">
                                      {formatNgn(
                                        activity.amount
                                      )}
                                    </span>
                                  )}

                                  <span className="shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500">
                                    →
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="11" cy="11" r="7" />
                <path
                  strokeLinecap="round"
                  d="m20 20-4-4"
                />
              </svg>
            </div>

            <h3 className="mt-4 text-sm font-semibold text-slate-950">
              No activity found
            </h3>

            <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">
              Nothing matches the current search or activity
              filter. Try a different creator, email, category or
              search term.
            </p>

            <Link
              href="/admin/activity"
              className="mt-5 inline-flex h-9 items-center justify-center rounded-xl bg-slate-950 px-4 text-xs font-semibold text-white hover:bg-slate-800"
            >
              View all activity
            </Link>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* PAGINATION */}
        {/* ---------------------------------------------------- */}

        {totalPages > 1 && (
          <div className="mt-6 flex min-w-0 flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              Page{" "}
              <span className="font-semibold text-slate-800">
                {safePage}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-800">
                {totalPages}
              </span>
            </p>

            <div className="flex items-center gap-2">
              {safePage > 1 ? (
                <Link
                  href={pageHref(safePage - 1)}
                  className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  ← Previous
                </Link>
              ) : (
                <span className="inline-flex h-9 cursor-not-allowed items-center justify-center rounded-xl border border-slate-100 bg-slate-50 px-3 text-xs font-semibold text-slate-300">
                  ← Previous
                </span>
              )}

              <div className="hidden items-center gap-1 sm:flex">
                {Array.from(
                  {
                    length: Math.min(totalPages, 5),
                  },
                  (_, index) => {
                    let pageNumber = index + 1;

                    if (totalPages > 5) {
                      if (safePage <= 3) {
                        pageNumber = index + 1;
                      } else if (safePage >= totalPages - 2) {
                        pageNumber =
                          totalPages - 4 + index;
                      } else {
                        pageNumber = safePage - 2 + index;
                      }
                    }

                    return (
                      <Link
                        key={pageNumber}
                        href={pageHref(pageNumber)}
                        className={`inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-xs font-semibold ${
                          pageNumber === safePage
                            ? "bg-slate-950 text-white"
                            : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {pageNumber}
                      </Link>
                    );
                  }
                )}
              </div>

              {safePage < totalPages ? (
                <Link
                  href={pageHref(safePage + 1)}
                  className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Next →
                </Link>
              ) : (
                <span className="inline-flex h-9 cursor-not-allowed items-center justify-center rounded-xl border border-slate-100 bg-slate-50 px-3 text-xs font-semibold text-slate-300">
                  Next →
                </span>
              )}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* AUDIT NOTE */}
        {/* ---------------------------------------------------- */}

        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v4M12 17h.01M10.3 4.6 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3l-7.4-12.4a2 2 0 0 0-3.4 0Z"
                />
              </svg>
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold text-amber-900">
                Audit coverage
              </p>

              <p className="mt-1 text-xs leading-5 text-amber-800">
                This timeline is built from activity records already
                persisted by the current Showwork database. It does
                not invent historical events that were never stored.
                For immutable, event-by-event auditing of every edit
                and admin action, the platform will eventually need
                a dedicated audit-event log.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
