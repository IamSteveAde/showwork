import Link from "next/link";
import { ArrowUpRight, Check, FileImage, Play, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./WorkspaceCard.module.css";

type Props = {
  title: string; product: string; description: string; href: string;
  action: string; icon: ReactNode; variant: "workspace" | "delivery" | "portfolio"; index: string;
};

function ProductIllustration({ variant }: { variant: Props["variant"] }) {
  return (
    <div className={styles.visual} aria-hidden="true">
      {variant === "workspace" ? (
        <>
          <div className={styles.calendar}>
            <div className={styles.windowBar}><span /><span /><span /><b>Content plan</b></div>
            <div className={styles.calendarHeader}><b>Ideas with context.</b><Sparkles size={15} /></div>
            <div className={styles.calendarDays}>{["M", "T", "W", "T", "F"].map((day, i) => <span key={i}>{day}</span>)}</div>
            <div className={styles.calendarCells}>{Array.from({ length: 15 }, (_, i) => <span key={i} className={i === 6 || i === 8 || i === 12 ? styles.scheduled : ""}>{i === 6 ? "Create" : i === 8 ? "Review" : i === 12 ? "Publish" : ""}</span>)}</div>
          </div>
          <div className={styles.floatBadge}><span className={styles.check}><Check size={12} /></span>Plan. Approve. Publish.</div>
        </>
      ) : variant === "delivery" ? (
        <>
          <div className={styles.fileBack} />
          <div className={styles.filePanel}>
            <div className={styles.windowBar}><span /><span /><span /><b>Client delivery</b></div>
            <div className={styles.fileArtwork}><span className={styles.artSun} /><span className={styles.artMountain} /><span className={styles.play}><Play size={17} fill="currentColor" /></span></div>
            <div className={styles.fileCaption}><FileImage size={17} /><div><b>The final cut</b><span>Files, feedback & final downloads</span></div><span className={styles.check}><Check size={12} /></span></div>
          </div>
          <div className={styles.floatBadge}><span className={styles.check}><Check size={12} /></span>Review. Approve. Deliver.</div>
        </>
      ) : (
        <div className={styles.portfolioArtwork}><span>YOUR<br />NEXT<br /><i>CHAPTER.</i></span><div className={styles.portfolioShape} /><small>Your projects. Your story. One link.</small></div>
      )}
    </div>
  );
}

export default function WorkspaceCard({ title, product, description, href, action, icon, variant, index }: Props) {
  return (
    <Link href={href} className={`${styles.card} ${styles[variant]}`}>
      <div className={styles.cardTop}><span className={styles.product}>{icon}{product}</span><span className={styles.index}>{index}</span></div>
      <ProductIllustration variant={variant} />
      <div className={styles.copy}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.description}>{description}</p>

      </div>
      <div className={styles.cardFooter}><span>{action}</span><span className={styles.arrow}><ArrowUpRight size={20} aria-hidden="true" /></span></div>
    </Link>
  );
}
