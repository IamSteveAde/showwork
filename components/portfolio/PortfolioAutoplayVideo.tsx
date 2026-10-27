"use client";

import { useEffect, useRef } from "react";

let activeVideo: HTMLVideoElement | null = null;
const visibleVideos = new Set<HTMLVideoElement>();

function activate(video: HTMLVideoElement) {
  if (activeVideo !== video) {
    activeVideo?.pause();
    activeVideo = video;
  }
  video.play().catch(() => {
    if (activeVideo === video) activeVideo = null;
  });
}

function pause(video: HTMLVideoElement) {
  visibleVideos.delete(video);
  video.pause();
  if (activeVideo === video) {
    activeVideo = null;
    const replacement = visibleVideos.values().next().value as HTMLVideoElement | undefined;
    if (replacement) activate(replacement);
  }
}

export function pauseAutoplayVideos() {
  activeVideo?.pause();
  activeVideo = null;
}

export function resumeVisibleAutoplayVideo() {
  if (!activeVideo) {
    const visible = visibleVideos.values().next().value as HTMLVideoElement | undefined;
    if (visible) activate(visible);
  }
}

export default function PortfolioAutoplayVideo({
  src,
  poster,
  className,
  style,
  enabled = true,
  controls = false,
  muted = true,
  onClick,
  onAspectRatio,
}: {
  src: string;
  poster?: string | null;
  className?: string;
  style?: React.CSSProperties;
  enabled?: boolean;
  controls?: boolean;
  muted?: boolean;
  onClick?: () => void;
  onAspectRatio?: (ratio: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const visibleRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !enabled) {
      if (video) pause(video);
      return;
    }

    // Fetch metadata only near the viewport. Offscreen/hidden videos must
    // not compete with visible photos or the active video's playback.
    const previewObserver = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || poster) return;
      if (video.getAttribute("src") !== src) {
        video.preload = "metadata";
        video.src = src;
        video.load();
      }
    }, { rootMargin: "300px" });
    previewObserver.observe(video);
    const observer = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry.isIntersecting && entry.intersectionRatio >= 0.35;
        if (visibleRef.current) {
          if (video.getAttribute("src") !== src) { video.src = src; video.load(); }
          visibleVideos.add(video);
          const isDesktopHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
          if (!isDesktopHover || !activeVideo || activeVideo === video) activate(video);
        } else pause(video);
      },
      { threshold: [0, 0.35, 0.6] },
    );
    observer.observe(video);
    return () => {
      observer.disconnect();
      previewObserver.disconnect();
      visibleRef.current = false;
      pause(video);
    };
  }, [enabled, src, poster]);

  return (
    <video
      ref={videoRef}
      src={controls ? src : undefined}
      poster={poster || undefined}
      onLoadedMetadata={event => {
        const video = event.currentTarget;
        if (video.videoWidth && video.videoHeight) onAspectRatio?.(video.videoWidth / video.videoHeight);
      }}
      controls={controls}
      autoPlay={false}
      muted={muted}
      loop={!controls}
      playsInline
      preload="none"
      controlsList="nodownload noremoteplayback"
      disablePictureInPicture
      className={className}
      style={style}
      onPointerEnter={() => {
        if (visibleRef.current && videoRef.current) activate(videoRef.current);
      }}
      onClick={onClick}
      draggable={false}
    />
  );
}
