"use client";

import { useState } from "react";

/**
 * Wraps a cover image or video with a pulsing placeholder that stays
 * visible until the real media has actually finished loading — an
 * <img>/<video> with nothing behind it just shows the parent's own
 * background (usually solid black) the whole time it's downloading,
 * which reads as "this section is empty" to an impatient viewer,
 * rather than "this is still loading."
 */
export default function MediaWithSkeleton({
  src,
  type,
  alt = "",
  className = "",
  videoProps,
}: {
  src: string;
  type: "PHOTO" | "VIDEO";
  alt?: string;
  className?: string;
  videoProps?: React.VideoHTMLAttributes<HTMLVideoElement>;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      {/* Sits underneath, absolutely positioned, and only actually
          fades out once the real media below has fired its own load
          event — a fixed timer or CSS-only fade would risk hiding
          this before the image is genuinely ready, defeating the
          whole point. */}
      <div
        className="absolute inset-0 animate-pulse"
        style={{
          background: "linear-gradient(110deg, rgba(255,255,255,0.04) 8%, rgba(255,255,255,0.09) 18%, rgba(255,255,255,0.04) 33%)",
          opacity: loaded ? 0 : 1,
          transition: "opacity 0.4s ease-out",
        }}
      />
      {type === "VIDEO" ? (
        <video
          src={src}
          onLoadedData={() => setLoaded(true)}
          className={className}
          style={{ opacity: loaded ? undefined : 0, transition: "opacity 0.4s ease-out" }}
          {...videoProps}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          onLoad={() => setLoaded(true)}
          className={className}
          style={{ opacity: loaded ? undefined : 0, transition: "opacity 0.4s ease-out" }}
        />
      )}
    </>
  );
}