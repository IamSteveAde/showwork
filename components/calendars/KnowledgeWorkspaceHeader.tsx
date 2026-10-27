import { BookOpenText, Fingerprint, ArrowDown, Sparkles } from "lucide-react";
import styles from "./KnowledgeStudio.module.css";
export default function KnowledgeWorkspaceHeader({ clientName }: { clientName: string }) {
  return <header className={styles.hero}>
    <div><p className={styles.eyebrow}><Sparkles size={14}/> AI Studio / Knowledge</p><h1>The business behind<br/><span>every good idea.</span></h1><p>Bring the facts and personality of <strong>{clientName}</strong> together. Give content and conversations a clearer foundation.</p><div className={styles.heroLinks}><a href="#knowledge-sources"><BookOpenText size={15}/> Business sources <ArrowDown size={13}/></a><a href="#brand-personality"><Fingerprint size={15}/> Brand personality <ArrowDown size={13}/></a></div></div>
    <div className={styles.heroArt} aria-hidden="true"><span className={styles.backCard}/><div className={styles.artCard}><BookOpenText size={30} strokeWidth={1.4}/><span/><span/><span/></div><span className={styles.artVoice}><Fingerprint size={24}/></span></div>
  </header>;
}
