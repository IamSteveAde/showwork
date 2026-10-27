/** Local platform artwork; accompanying controls provide the accessible name. */
export default function PlatformBrandIcon({ platform, size = 20 }: { platform: string; size?: number }) {
  const files: Record<string, string> = { WHATSAPP: "whatsapp", INSTAGRAM: "instagram", TIKTOK: "tiktok", YOUTUBE: "youtube", FACEBOOK: "facebook", X: "x", LINKEDIN: "linkedin" };
  const name = files[platform];
  return name ? <img src={`/images/integrations/${name}.svg`} width={size} height={size} alt="" aria-hidden="true" style={{ objectFit: "contain", flexShrink: 0 }} /> : null;
}
