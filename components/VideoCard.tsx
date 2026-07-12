"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import type { MediaItem } from "@/app/[slug]/DeliveryPage";

export default function VideoCard({
  video,
  onOpen,
}: {
  video: MediaItem;
  onOpen: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inView = useInView(containerRef, { once: false, margin: "-10%" });
  const nearView = useInView(containerRef, { once: true, margin: "800px" });
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (nearView) setShouldLoad(true);
  }, [nearView]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (inView) vid.play().catch(() => {});
    else vid.pause();
  }, [inView, shouldLoad]);

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5 }}
      onClick={onOpen}
      className="relative aspect-[9/16] cursor-pointer overflow-hidden rounded-2xl bg-black/40"
    >
      {shouldLoad && (
        <video
          ref={videoRef}
          src={video.url}
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className="absolute bottom-0 left-0 h-16 w-full bg-gradient-to-t from-black/60 to-transparent" />
    </motion.div>
  );
}
