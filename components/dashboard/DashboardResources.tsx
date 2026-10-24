import { ArrowUpRight, BookOpen, ChevronDown, CirclePlay, Headphones, Layers3, MessageCircle, MessagesSquare, Sparkles, Users } from "lucide-react";
import styles from "./DashboardResources.module.css";

const COMMUNITY_URL = "https://chat.whatsapp.com/GVRHGFaFW5Z0yOOWbWmrn0?mode=gi_t";

export default function DashboardResources() {
  return (
    <section className={styles.section} aria-labelledby="dashboard-resources-title">
      <div className={styles.heading}>
        <div><p className={styles.eyebrow}>A little extra, for you</p><h2 id="dashboard-resources-title">Find your rhythm. Find your people.</h2></div>
        <p>Learn something new, share an idea, or get a hand.</p>
      </div>
      <div className={styles.grid}>
        <article className={`${styles.card} ${styles.tutorial}`}>
          <div className={styles.topline}><span className={styles.category}><BookOpen size={14} aria-hidden="true" /> The quick introduction</span><span className={styles.tag}>Start here</span></div>
          <details className={styles.tour}>
            <summary>
              <div className={styles.preview} aria-hidden="true">
                <div className={styles.previewWindow}>
                  <div className={styles.windowBar}><Layers3 size={13} /><span>YOUR MARKETING WORKSPACE</span><i /><i /><i /></div>
                  <div className={styles.previewBody}><div className={styles.previewRail}><span /><span /><span /></div><div className={styles.previewTiles}><span /><span /><span /></div></div>
                </div>
                <span className={styles.play}><CirclePlay size={29} strokeWidth={1.5} /></span>
                <span className={styles.previewCaption}>A clearer view of what’s possible</span>
              </div>
              <h3>Meet your Marketing Workspace</h3>
              <p>From your first idea to the final approval. See how everything connects.</p>
              <span className={styles.tutorialAction}>Watch the walkthrough <ChevronDown size={16} className={styles.chevron} aria-hidden="true" /></span>
            </summary>
            <div className={styles.videoWrap}><iframe loading="lazy" src="https://www.youtube.com/embed/2UFJNWqFnxQ" title="Showwork Marketing Workspace tutorial" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /></div>
          </details>
        </article>
        <article className={`${styles.card} ${styles.community}`}>
          <div className={styles.topline}><span className={styles.category}><Users size={14} aria-hidden="true" /> Good company</span><ArrowUpRight size={16} aria-hidden="true" /></div>
          <div className={styles.communityArt} aria-hidden="true"><span className={styles.orbit} /><span className={styles.personOne}><Users size={26} strokeWidth={1.5} /></span><span className={styles.personTwo}><MessageCircle size={23} strokeWidth={1.5} /></span><span className={styles.personThree}><Sparkles size={22} strokeWidth={1.5} /></span><span className={styles.artLabel}>Ideas get better together.</span></div>
          <h3>Your kind of creative people.</h3>
          <p>Find your circle in Creativo. Share ideas, ask questions, and build alongside other creators.</p>
          <a href={COMMUNITY_URL} target="_blank" rel="noopener noreferrer" className={styles.action}>Meet the community <ArrowUpRight size={17} aria-hidden="true" /><span className="sr-only"> on WhatsApp (opens in a new tab)</span></a>
        </article>
        <article className={`${styles.card} ${styles.support}`}>
          <div className={styles.topline}><span className={styles.category}><Headphones size={14} aria-hidden="true" /> A real helping hand</span><ArrowUpRight size={16} aria-hidden="true" /></div>
          <div className={styles.supportArt} aria-hidden="true"><span className={styles.supportIcon}><MessagesSquare size={34} strokeWidth={1.4} /></span><span className={styles.chatBubble}>Where should I start?</span><span className={styles.chatReply}><span /><span /><span /></span></div>
          <h3>A conversation away.</h3>
          <p>Big plans or a small question? Tell our team what you’re working on. We’ll help you find your next step.</p>
          <a href="https://wa.me/2347018819588?text=Hello%20Showwork%2C%20I%27d%20like%20help%20choosing%20where%20to%20start." target="_blank" rel="noopener noreferrer" className={styles.action}>Talk to our team <ArrowUpRight size={17} aria-hidden="true" /><span className="sr-only"> on WhatsApp (opens in a new tab)</span></a>
        </article>
      </div>
    </section>
  );
}
