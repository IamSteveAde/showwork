import type { BusinessResearchResult } from "@/lib/openai";
export const RESEARCH_BRIEF_EVENT = "showwork-research-brief";
const pending = new Map<string, string>();
export function opportunityInstructions(finding: BusinessResearchResult["findings"][number]) {
  return `Develop a creative brief from this research opportunity. Treat research as a hypothesis, never proof of business capabilities. Verify claims against current Business Knowledge.\nOpportunity: ${finding.title}\nObservation: ${finding.learning}\nBusiness relevance: ${finding.relevance || "Assess against current knowledge."}\nExperiment: ${finding.application}\nUncertainty: ${finding.uncertainty || "Requires validation."}\nSuccess measure: ${finding.successMeasure || "Choose a relevant metric; do not promise results."}\nEvidence date: ${finding.evidenceDate || "Unavailable"}\nSources:\n${finding.sourceUrls.join("\n")}`;
}
export function queueResearchBrief(id: string, text: string) {
  pending.set(id, text);
  try { sessionStorage.setItem(`research-brief:${id}`, text); } catch { /* Memory fallback. */ }
  window.dispatchEvent(new CustomEvent(RESEARCH_BRIEF_EVENT));
}
export function consumeResearchBrief(id: string) {
  let value = pending.get(id);
  try { value ??= sessionStorage.getItem(`research-brief:${id}`) ?? undefined; sessionStorage.removeItem(`research-brief:${id}`); } catch { /* Memory fallback. */ }
  pending.delete(id); return value;
}
