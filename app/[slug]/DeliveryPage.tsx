"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import EmailGate from "@/components/EmailGate";
import PasswordGate from "@/components/PasswordGate";
import ProjectContent from "@/components/ProjectContent";
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

export interface DeliverySection {
  id: string;
  name: string;
  mediaType: "PHOTO" | "VIDEO" | "DOCUMENT" | "PDF";
  media: MediaItem[];
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
}: DeliveryPageProps) {
  // If this browser already unlocked this project before (checked
  // server-side via a signed cookie), start straight past both gates
  // instead of asking again on every refresh — name included, now that
  // it's embedded in that same signed token alongside the email.
  const [viewerName, setViewerName] = useState<string | null>(initialViewerName);
  const [viewerEmail, setViewerEmail] = useState<string | null>(initialViewerEmail);
  const [unlocked, setUnlocked] = useState(initiallyUnlocked);

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