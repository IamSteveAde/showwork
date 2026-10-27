import type { ReactNode } from "react";
import { ArrowUpRight, ArrowRight, CalendarDays, CircleCheck, Clock3, Layers3, Users, Sparkles, MoveUpRight, MessageSquareText, BookOpen, Radio, CheckCheck } from "lucide-react";
import WorkspaceActionButton from "./WorkspaceActionButton";
import { buildWorkspaceOverview, overviewStage, overviewStages, type OverviewPost } from "@/lib/workspaceOverview";
import styles from "./WorkspaceOverview.module.css";

const platformName = (value: string) => ({ INSTAGRAM: "Instagram", TIKTOK: "TikTok", FACEBOOK: "Facebook", LINKEDIN: "LinkedIn", YOUTUBE: "YouTube", X: "X", WHATSAPP: "WhatsApp" }[value] || value);
export default function WorkspaceOverview({ clientName, posts, totalMembers, aiActive, clientUrl, now = new Date().toISOString(), availableSections }: { clientName: string; posts: OverviewPost[]; totalMembers: number; aiActive: boolean; clientUrl: string; now?: string; availableSections: string[] }) {
  function Action({ target, className, children }: { target: string; className: string; children: ReactNode }) {
    if (!availableSections.includes(target)) return null;
    return <WorkspaceActionButton target={target} className={className}>{children}</WorkspaceActionButton>;
  }
  const { stages, days, upcoming, platforms } = buildWorkspaceOverview(posts, new Date(now));
  const count = (id: string) => stages.find(s => s.id === id)?.count ?? 0;
  const attention = count("internal") + count("revision") + count("client");
  const maxDay = Math.max(1, ...days.map(day => day.count));
  let cumulative = 0;
  const segments = stages.filter(s => s.count).map(stage => {
    const from = cumulative; cumulative += stage.count / posts.length * 100;
    return `${stage.color} ${from}% ${cumulative}%`;
  }).join(",");
  const metrics = [
    { label: "Total content", value: posts.length, note: "All posts · including AI drafts", icon: Layers3, tone: "blue", target: "content" },
    { label: "Needs attention", value: attention, note: "Internal, client review & changes", icon: Clock3, tone: "amber", target: "content" },
    { label: "Published", value: count("published"), note: "Confirmed publishing status", icon: CircleCheck, tone: "green", target: "content" },
    { label: "Your team", value: totalMembers, note: "People with workspace access", icon: Users, tone: "violet", target: "team" },
  ];
  return <div className={styles.dashboard}>
    <section className={styles.welcome}>
      <div><p className={styles.eyebrow}><span/> Your workspace, at a glance</p><h1>A little clarity.<br/><span>A lot of possibility.</span></h1><p className={styles.intro}>Here’s where the work stands for <strong>{clientName}</strong>. Make room for your next great idea.</p></div>
      <div className={styles.welcomeAction}><div className={styles.date}><CalendarDays size={15}/>{new Date(now).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}</div><Action target="content" className={styles.primary}>Open content planner <ArrowUpRight size={17}/></Action></div>
    </section>
    <section className={styles.metrics} aria-label="Workspace totals">{metrics.map(({ label, value, note, icon: Icon, tone, target }) => { const Metric = availableSections.includes(target) ? WorkspaceActionButton : "div"; return <Metric key={label} target={target} className={styles.metric}><div className={styles.metricTop}><span>{label}</span><span data-tone={tone} className={styles.icon}><Icon size={19}/></span></div><strong>{value.toLocaleString()}</strong><p>{note}</p></Metric>; })}</section>
    <div className={styles.mainGrid}>
      <section className={styles.card} aria-labelledby="overview-flow"><div className={styles.cardHeading}><div><p className={styles.kicker}>The bigger picture</p><h2 id="overview-flow">Good work is moving.</h2></div><Action target="content" className={styles.textLink}>View workflow <ArrowUpRight size={15}/></Action></div>
        <div className={styles.flow}><div className={styles.donut} style={{ background: posts.length ? `conic-gradient(${segments})` : "#eef1f5" }} role="img" aria-label={stages.map(stage => `${stage.label}: ${stage.count}`).join(", ")}><div><strong>{posts.length}</strong><span>total posts</span></div></div><div className={styles.legend}>{stages.map(stage => <div key={stage.id}><span className={styles.dot} style={{ background: stage.color }}/><span>{stage.label}</span><strong>{stage.count}</strong></div>)}</div></div>
        <div className={styles.flowNote}><CheckCheck size={17}/><p>{count("internal") ? `${count("internal")} posts are still in internal review. They stay private until your team approves them.` : posts.length ? "Internal review comes before client review. Keep feedback in one place as work moves forward." : "Your workflow will take shape as you add your first posts."}</p></div>
      </section>
      <section className={styles.focusCard}><div className={styles.focusTop}><span className={styles.focusIcon}><MoveUpRight size={21}/></span><span>Your next move</span></div><h2>{attention ? "A little momentum goes a long way." : "Space for something great."}</h2><p>{attention ? "Clear the next review, resolve the feedback, keep the ideas moving." : "Start a new idea or explore what your audience wants to hear next."}</p><div className={styles.attentionList}>{[
        { label: "Internal review", value: count("internal") }, { label: "Changes requested", value: count("revision") }, { label: "Client review", value: count("client") },
      ].map(item => <Action key={item.label} target="content" className={styles.attentionItem}><span>{item.label}</span><strong>{item.value}</strong><ArrowRight size={15}/></Action>)}</div><Action target={attention ? "content" : aiActive ? "generate" : "knowledge"} className={styles.focusAction}>{attention ? "Keep work moving" : "Develop your next idea"}<ArrowUpRight size={17}/></Action></section>
    </div>
    <div className={styles.secondGrid}>
      <section className={styles.card} aria-labelledby="overview-calendar"><div className={styles.cardHeading}><div><p className={styles.kicker}>Make room for consistency</p><h2 id="overview-calendar">The next two weeks.</h2></div><span className={styles.pill}>{days.reduce((sum, day) => sum + day.count, 0)} planned</span></div><p className={styles.chartCaption}>Posts by calendar date · next 14 days · UTC · excludes AI drafts</p><div className={styles.chart} role="img" aria-label={days.map(day => `${day.date}: ${day.count} posts`).join(", ")}>{days.map((day, i) => <div key={day.date} className={styles.chartColumn} title={`${day.date}: ${day.count} posts`}><span className={styles.chartCount}>{day.count || ""}</span><div className={styles.barTrack}><div className={styles.bar} data-today={i === 0} style={{ height: `${day.count / maxDay * 100}%`, minHeight: day.count ? 6 : 2, opacity: day.count ? 1 : .15 }}/></div><span className={styles.chartDate}>{i === 0 ? "Today" : day.date.slice(8)}</span></div>)}</div><div className={styles.chartFooter}><span>Planning volume, rather than social performance.</span><Action target="analytics" className={styles.textLink}>Explore analytics <ArrowUpRight size={14}/></Action></div></section>
      <section className={styles.card} aria-labelledby="overview-next"><div className={styles.cardHeading}><div><p className={styles.kicker}>Coming into focus</p><h2 id="overview-next">Up next.</h2></div><CalendarDays size={19} className={styles.muted}/></div>{upcoming.length ? <div className={styles.upcoming}>{upcoming.map(post => { const date = new Date(post.postDate); const stage = overviewStages.find(s => s.id === overviewStage(post))!; return <Action key={post.id} target="content" className={styles.upcomingRow}><span className={styles.dateTile}><span>{date.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" })}</span><strong>{date.getUTCDate()}</strong></span><span className={styles.postCopy}><strong>{post.contentIdea || post.hook || post.caption || "Untitled post"}</strong><span>{platformName(post.platform)} · <span>{stage.label}</span></span></span><ArrowUpRight size={15} className={styles.muted}/></Action>; })}</div> : <div className={styles.empty}><CalendarDays size={27}/><p>No upcoming posts yet.</p><span>Add an idea to your content planner to give it a place on the calendar.</span></div>}<Action target="content" className={styles.fullLink}>View your calendar <ArrowRight size={15}/></Action></section>
    </div>
    <div className={styles.bottomGrid}>
      <section className={styles.aiCard}><div className={styles.aiMark}><Sparkles size={22}/></div><div><p className={styles.kicker}>An idea is only the beginning</p><h2>Give your next idea a head start.</h2><p>Bring your business knowledge, research and brand voice into a brief your team can make their own.</p><div className={styles.aiLinks}><Action target={aiActive ? "generate" : "knowledge"} className={styles.primary}>Open AI Studio <ArrowUpRight size={16}/></Action><Action target="research" className={styles.textLink}>Explore research <ArrowRight size={15}/></Action></div></div></section>
      <section className={styles.card}><div className={styles.cardHeading}><div><p className={styles.kicker}>Across your channels</p><h2>Content mix.</h2></div><Radio size={18} className={styles.muted}/></div>{platforms.length ? <div className={styles.platforms}>{platforms.map((item, i) => <div key={item.platform}><div><span>{platformName(item.platform)}</span><strong>{item.count} <span>posts</span></strong></div><div className={styles.platformTrack}><span style={{ width: `${item.count / posts.length * 100}%`, background: ["#1768e8", "#7c83e8", "#62b6bd", "#a7b9df"][i % 4] }}/></div></div>)}</div> : <p className={styles.chartCaption}>Your platform mix appears when you add posts.</p>}<Action target="channels" className={styles.fullLink}>Manage channels <ArrowRight size={15}/></Action></section>
    </div>
    <section className={styles.shortcuts} aria-label="Workspace shortcuts"><Action target="inbox" className={styles.shortcut}><MessageSquareText size={19}/><span>Keep conversations going</span><ArrowUpRight size={16}/></Action><Action target="knowledge" className={styles.shortcut}><BookOpen size={19}/><span>Build your business knowledge</span><ArrowUpRight size={16}/></Action>{clientUrl && <a href={clientUrl} target="_blank" rel="noopener noreferrer" className={styles.shortcut}><Users size={19}/><span>See the client experience</span><ArrowUpRight size={16}/></a>}</section>
  </div>;
}
