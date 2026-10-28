import Image from 'next/image';
/** Shared fictional character identity; adjacent text supplies the accessible name. */
export default function RandyAvatar({ size = 40, className = '' }: { size?: number; className?: string }) {
 return <Image src="/images/randy/avatar.webp" width={size} height={size} alt="" aria-hidden="true" unoptimized className={className} style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
}
