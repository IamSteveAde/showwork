import { Check, Eye, Heart, MessageCircle, PartyPopper, Play, Sparkles, ThumbsUp, TriangleAlert, Hand } from "lucide-react";

/** Render imported caption emoji as SVGs without modifying the source content. */
export default function IconText({ text }: { text: string }) {
  const parts = [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)];
  return <>{parts.map(({ segment, index }) => {
    if (!/[\p{Extended_Pictographic}\p{Regional_Indicator}\u20E3]/u.test(segment)) return segment;
    const Icon = /[👀👁]/u.test(segment) ? Eye
      : /[🎉🎊🥳]/u.test(segment) ? PartyPopper
      : /[❤♥💙💚💛💜🖤🤍💗💖💕]/u.test(segment) ? Heart
      : /[👍]/u.test(segment) ? ThumbsUp
      : /[✅✔☑]/u.test(segment) ? Check
      : /[⚠🚨]/u.test(segment) ? TriangleAlert
      : /[▶⏯]/u.test(segment) ? Play
      : /[👋🤝🙌]/u.test(segment) ? Hand
      : /[💬🗨]/u.test(segment) ? MessageCircle : Sparkles;
    return <Icon key={index} aria-label="Caption symbol" role="img" style={{ display: "inline-block", width: "1em", height: "1em", verticalAlign: "-.12em", marginInline: ".1em" }} strokeWidth={1.7} />;
  })}</>;
}
