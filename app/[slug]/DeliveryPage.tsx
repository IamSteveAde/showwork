"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import EmailGate from "@/components/EmailGate";
import PasswordGate from "@/components/PasswordGate";
import ProjectContent from "@/components/ProjectContent";
import ManagedProjectClientView from "@/components/ManagedProjectClientView";
import type { ReviewEntry } from "@/components/ReviewControls";

export interface MediaItem {
  id: string;
  type: "PHOTO" | "VIDEO" | "DOCUMENT" | "PDF";
  url: string;
  caption: string;
  approvalStatus: "PENDING" | "APPROVED" | "NEEDS_REVISION";
  approvalNote: string | null;
  reviews: ReviewEntry[];
}

export interface DeliveryFolder {
  id: string;
  name: string;
  media: MediaItem[];
}

export interface DeliverySection {
  id: string;
  name: string;
  mediaType: "PHOTO" | "VIDEO" | "DOCUMENT" | "PDF";
  media: MediaItem[];
  folders: DeliveryFolder[];
}

interface ManagedProjectClientData {
  name: string;
  publishedAt: string | null;
  tasks: { id: string; title: string; status: "TODO" | "IN_PROGRESS" | "DONE" }[];
  brief: {
    objective: string | null;
    background: string | null;
    targetAudience: string | null;
    creativeDirection: string | null;
    deliverables: string | null;
    brandGuidelines: string | null;
    references: string | null;
    requiredFormats: string | null;
    platforms: string | null;
    importantNotes: string | null;
    deadline: string | null;
  } | null;
}

interface DeliveryPageProps {
  projectId: string;
  clientName: string;
  badgeVisible: boolean;
  primaryColor: string;
  bgColor: string;
  logoUrl: string | null;
  media: MediaItem[];
  sections: DeliverySection[];
  ungroupedMedia: MediaItem[];
  heroMedia: MediaItem | null;
  heroTagline: string | null;
  deliveryStatus: "DELIVERED" | "APPROVED" | "PAID";
  initiallyUnlocked: boolean;
  initialViewerEmail: string | null;
  initialViewerName: string | null;
  // Null for every regular delivery (the vast majority) — only set
  // when this delivery was created through the project-management
  // flow. Governs the one behavior change on this page: which view
  // renders once the viewer is past both gates.
  managedProject: ManagedProjectClientData | null;
}

export default function DeliveryPage({
  projectId,
  clientName,
  badgeVisible,
  primaryColor,
  bgColor,
  logoUrl,
  media,
  sections,
  ungroupedMedia,
  heroMedia,
  heroTagline,
  deliveryStatus,
  initiallyUnlocked,
  initialViewerEmail,
  initialViewerName,
  managedProject,
}: DeliveryPageProps) {
  // If this browser already unlocked this project before (checked
  // server-side via a signed cookie), start straight past both gates
  // instead of asking again on every refresh — name included, now that
  // it's embedded in that same signed token alongside the email.
  const [viewerName, setViewerName] = useState<string | null>(initialViewerName);
  const [viewerEmail, setViewerEmail] = useState<string | null>(initialViewerEmail);
  const [unlocked, setUnlocked] = useState(initiallyUnlocked);

  // The one new decision on this page: once unlocked, does the client
  // see task/progress status, or the actual delivered files? Only
  // ever the progress view when there's a linked managed project AND
  // it hasn't been published yet — every regular delivery (no managed
  // project at all) and every published one still goes straight to
  // ProjectContent exactly as before.
  const showManagedProgress = !!managedProject && !managedProject.publishedAt;

  return (
    <div style={{ background: bgColor, minHeight: "100vh" }}>
      <AnimatePresence mode="wait">
        {!viewerEmail ? (
          <EmailGate
            key="email"
            projectId={projectId}
            clientName={clientName}
            primaryColor={primaryColor}
            logoUrl={logoUrl}
            onSubmitted={(name, email) => {
              setViewerName(name);
              setViewerEmail(email);
            }}
          />
        ) : !unlocked ? (
          <PasswordGate
            key="password"
            projectId={projectId}
            clientName={clientName}
            primaryColor={primaryColor}
            logoUrl={logoUrl}
            viewerEmail={viewerEmail}
            viewerName={viewerName}
            onUnlock={() => setUnlocked(true)}
          />
        ) : showManagedProgress ? (
          <ManagedProjectClientView
            key="progress"
            clientName={clientName}
            projectName={managedProject!.name}
            primaryColor={primaryColor}
            bgColor={bgColor}
            logoUrl={logoUrl}
            brief={managedProject!.brief}
            tasks={managedProject!.tasks}
          />
        ) : (
          <ProjectContent
            key="content"
            clientName={clientName}
            primaryColor={primaryColor}
            logoUrl={logoUrl}
            badgeVisible={badgeVisible}
            media={media}
            sections={sections}
            ungroupedMedia={ungroupedMedia}
            heroMedia={heroMedia}
            heroTagline={heroTagline}
            viewerName={viewerName}
            viewerEmail={viewerEmail}
            deliveryStatus={deliveryStatus}
          />
        )}
      </AnimatePresence>
    </div>
  );
}