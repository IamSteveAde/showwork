import { ChartPie, CircleCheck, GitPullRequest, Images, Layers3 } from "lucide-react";
import PlatformBrandIcon from "./PlatformBrandIcon";
import { overviewStage, overviewStages, type OverviewPost } from "@/lib/workspaceOverview";
import styles from "./ReportingProductionSummary.module.css";

const names: Record<string, string> = { INSTAGRAM: "Instagram", TIKTOK: "TikTok", FACEBOOK: "Facebook", LINKEDIN: "LinkedIn", X: "X", YOUTUBE: "YouTube" };
const colors = ["#1768e8", "#7565d9", "#25a6a0", "#e59648", "#d575a5", "#517ba6"];
export default function ReportingProductionSummary({ posts }: { posts: (OverviewPost & { hasContent: boolean })[] }) {
  const total = posts.length;
  const platforms = [...new Set(posts.map(post => post.platform))].map(platform => ({ platform, count: posts.filter(post => post.platform === platform).length })).sort((a,b) => b.count-a.count);
  const stages = overviewStages.map(stage => ({ ...stage, count: posts.filter(post => overviewStage(post) === stage.id).length }));
  const approved = posts.filter(post => ["ready", "published"].includes(overviewStage(post))).length;
  const attached = posts.filter(post => post.hasContent).length;
  const percentage = total ? Math.round(approved / total * 100) : 0;
  let offset = 0;
  const segments = platforms.map((row, i) => {
    const start = offset; offset += row.count / total * 100;
    return `${colors[i % colors.length]} ${start}% ${offset}%`;
  });
  return <section className={styles.section} aria-label="Workspace production summary">
    <div className={styles.heading}><div><span>Behind the performance</span><h3>Your content pipeline.</h3></div><p>Entire workspace · All dates and platforms<br/>Planning and review data, separate from the report filters above.</p></div>
    <div className={styles.grid}>
      <article className={styles.card}>
        <header><div className={styles.icon}><ChartPie size={19}/></div><div><span>Channel distribution</span><h4>Where your content lives</h4></div><span className={styles.badge}>{platforms.length} {platforms.length === 1 ? "channel" : "channels"}</span></header>
        <div className={styles.distribution}>
          <div className={styles.donut} role="img" aria-label={`${total} workspace posts. ${platforms.map(row => `${names[row.platform] || row.platform}: ${row.count}`).join(", ")}`} style={{ background: segments.length ? `conic-gradient(${segments.join(",")})` : "#e9eff8" }}><div><Layers3 size={17}/><strong>{total}</strong><span>workspace posts</span></div></div>
          <div className={styles.platforms}>{platforms.length ? platforms.map((row,i) => <div key={row.platform} className={styles.platform}><div><PlatformBrandIcon platform={row.platform} size={21}/><span>{names[row.platform] || row.platform}</span><strong>{row.count}</strong><small>{Math.round(row.count / total * 100)}%</small></div><div className={styles.track}><i style={{ width: `${row.count / total * 100}%`, background: colors[i % colors.length] }}/></div></div>) : <p>Add your first post to see your channel mix.</p>}</div>
        </div>
        <footer className={styles.note}>{platforms.length === 1 ? `All content is currently planned for ${names[platforms[0].platform] || platforms[0].platform}.` : platforms.length ? `${names[platforms[0].platform] || platforms[0].platform} has the largest share of your planned content.` : "Your publishing mix will appear as you build your plan."}</footer>
      </article>
      <article className={styles.card}>
        <header><div className={styles.icon}><GitPullRequest size={19}/></div><div><span>Review & readiness</span><h4>From idea to approved</h4></div></header>
        <div className={styles.approval}><div><strong>{percentage}<small>%</small></strong><span>Fully approved</span></div><p><CircleCheck size={17}/><b>{approved} of {total}</b> posts cleared internal and client review</p></div>
        <div className={styles.stageTrack} role="img" aria-label={stages.map(stage => `${stage.label}: ${stage.count}`).join(", ")}>{stages.filter(stage => stage.count > 0).map(stage => <i key={stage.id} style={{ width: `${stage.count / total * 100}%`, background: stage.color }}/>)}</div>
        <div className={styles.stages}>{stages.map(stage => <div key={stage.id}><i style={{ background: stage.color }}/><span>{stage.label}</span><strong>{stage.count}</strong></div>)}</div>
        <footer className={styles.attachments}><Images size={19}/><div><strong>Creative assets attached</strong><span>{total ? `${total-attached} ${total-attached === 1 ? "post has" : "posts have"} no attached media` : "Add posts to track creative readiness"}</span></div><b>{attached}<small> / {total}</small></b></footer>
      </article>
    </div>
  </section>;
}
