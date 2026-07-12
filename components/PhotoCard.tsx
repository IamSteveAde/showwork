"use client";

import { motion } from "framer-motion";
import type { MediaItem } from "@/app/[slug]/DeliveryPage";

export default function PhotoCard({
  photo,
  onOpen,
}: {
  photo: MediaItem;
  onOpen: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5 }}
      onClick={onOpen}
      className="relative aspect-[3/4] cursor-pointer overflow-hidden rounded-xl bg-black/30"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url}
        alt={photo.caption}
        className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
      />
    </motion.div>
  );
}
