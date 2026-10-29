import { randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
import { sourceFingerprint } from '@/lib/knowledge/retrieval';
import { sourceAllowed } from '@/lib/knowledge/researchPlan';
import { getBusinessKnowledgeContext } from '@/lib/knowledge/context';
import { queueBusinessResearch, executeBusinessResearch } from '@/lib/knowledge/research';
import { businessChatAnswer, type BusinessChatAnswer, type RandySource } from './answer';
import type { BusinessResearchResult } from '@/lib/openai';

export async function finishBusinessChat(conversationId: string, calendarId: string, question: string, research: boolean, canManage: boolean, lease: Date, approvedResearch = false) {
  let answer: BusinessChatAnswer;
  try {
    const [calendar, documents, messages] = await Promise.all([
      db.socialCalendar.findUniqueOrThrow({
        where: { id: calendarId },
        select: {
          clientName: true,
          headerTitle: true,
          headerDescription: true,
          aiBusinessSummary: true,
          instagramUsername: true,
          tikTokUsername: true,
          facebookPageName: true,
          xUsername: true,
          linkedinName: true,
          researchPlan: true,
        },
      }),
      db.calendarBusinessDocument.findMany({ where: { calendarId }, select: { id: true, originalName: true, extractedText: true, websiteUrl: true } }),
      db.workspaceRandyMessage.findMany({ where: { conversationId }, orderBy: { createdAt: 'desc' }, take: 12 }),
    ]);
    const connectedChannels = [
      calendar.instagramUsername ? `Instagram (@${calendar.instagramUsername})` : null,
      calendar.tikTokUsername ? `TikTok (@${calendar.tikTokUsername})` : null,
      calendar.facebookPageName ? `Facebook Page (${calendar.facebookPageName})` : null,
      calendar.xUsername ? `X (@${calendar.xUsername})` : null,
      calendar.linkedinName ? `LinkedIn (${calendar.linkedinName})` : null,
    ].filter(Boolean);
    const websites = documents.map(d => d.websiteUrl).filter(Boolean);
    const workspaceProfile = [
      `WORKSPACE PROFILE:`,
      `- Brand/Client Name: ${calendar.clientName}`,
      calendar.headerTitle ? `- Headline/Tagline: ${calendar.headerTitle}` : null,
      calendar.headerDescription ? `- Workspace Overview: ${calendar.headerDescription}` : null,
      websites.length ? `- Public Website(s): ${websites.join(', ')}` : null,
      connectedChannels.length ? `- Connected Social Channels: ${connectedChannels.join(', ')}` : `- Connected Social Channels: None connected yet`,
      `- Internet Research Scope: Live web research, market trends, competitors, audience demographics, and industry developments relating to ${calendar.clientName}.`,
    ].filter(Boolean).join('\n');
    const history = messages.reverse().map(m => ({ role: m.role, text: [String((m.body as BusinessChatAnswer).text || ''), (m.body as BusinessChatAnswer).proposal ? 'Proposed knowledge (not saved unless confirmed): ' + JSON.stringify((m.body as BusinessChatAnswer).proposal) : '', (m.body as BusinessChatAnswer).contentBrief ? 'Content prompt: ' + JSON.stringify((m.body as BusinessChatAnswer).contentBrief) : ''].filter(Boolean).join('\n').slice(0, 7000) }));
    if (approvedResearch) {
      // The existing research engine maintains cooldowns, source exclusions and provenance.
      // The user-confirmed public topic combined with workspace brand context is passed to web search.
      const focus = [
        question.slice(0, 1000),
        `Brand: ${calendar.clientName}`,
        calendar.headerTitle ? `Industry/Focus: ${calendar.headerTitle}` : null,
        websites.length ? `Website: ${websites[0]}` : null,
      ].filter(Boolean).join(' | ');
      const run = await queueBusinessResearch(calendarId, focus);
      if (run.focus !== focus || run.status === 'RUNNING') throw Error('Please wait for the current workspace research to finish.');
      await executeBusinessResearch(run.id, { publicTopicOnly: true });
      const completed = await db.businessResearchRun.findFirst({ where: { id: run.id, calendarId } });
      if (completed?.status !== 'SUCCEEDED') throw Error('Research did not finish');
      const result = completed.result as BusinessResearchResult;
      const findings = result.findings.filter(f => !completed.excludedFindingIds.includes(f.id));
      const sources: RandySource[] = (result.sources || []).map((s, index) => ({ id: `research:${run.id}:${index}`, title: s.title, url: s.url }));
      answer = { text: [result.summary, ...findings.map(f => `${f.title}\n${f.learning}\n${f.application}${f.uncertainty ? `\nUncertainty: ${f.uncertainty}` : ''}`), ...(result.unknowns.length ? ['Still unclear:\n' + result.unknowns.join('\n')] : [])].join('\n\n'), sources };
    } else {
      const context = await getBusinessKnowledgeContext(calendarId, [question, ...history.slice(-4).map(m => m.text)].join('\n'), 'analytics');
      // A current source-derived overview and retrieved evidence are supplied by the existing context builder.
      const researchRun = await db.businessResearchRun.findFirst({ where: { calendarId, status: 'SUCCEEDED', sourceHash: sourceFingerprint(documents), completedAt: { gte: new Date(Date.now() - 30 * 86400000) } }, orderBy: { completedAt: 'desc' } });
      const result = researchRun?.result as BusinessResearchResult | null;
      const sources: RandySource[] = documents.map(d => ({ id: d.id, title: d.originalName }));
      // External source links are offered only when the context builder actually included current research.
      if (context.includes('EXTERNAL RESEARCH') && researchRun && result) sources.push(...(result.sources || []).filter(s => sourceAllowed(s.url, (calendar.researchPlan as { excludedDomains?: string[] } | null)?.excludedDomains || [])).map((s, i) => ({ id: `research:${researchRun.id}:${i}`, title: s.title, url: s.url })));
      const fullContext = [
        workspaceProfile,
        calendar.aiBusinessSummary ? `WORKSPACE BUSINESS OVERVIEW:\n${calendar.aiBusinessSummary.slice(0, 6000)}` : null,
        context,
        calendar.researchPlan ? `WORKSPACE RESEARCH PREFERENCES (goals and preferences, not business facts): ${JSON.stringify(calendar.researchPlan)}` : null,
        `INTERNET RESEARCH ACCESS:\nYou have live access to suggest and execute internet research specifically relating to ${calendar.clientName}'s brand, channels, competitors, and target market.`,
      ].filter(Boolean).join('\n\n');
      answer = await businessChatAnswer({ question, business: calendar.clientName, context: fullContext, history: history.slice(0, -1), sources, canManage, prepareResearch: research });
      if (!canManage) delete answer.proposal;
      if (!research) delete answer.researchPlan;
    }
  } catch (error) {
    const cooldown = error instanceof Error && /Please wait|Add business/.test(error.message) ? error.message : null;
    answer = { text: cooldown || (research ? 'I couldn’t complete that research. Please try a more specific question. Nothing was added to Business Knowledge.' : 'I couldn’t finish that reply. Please try again. Your conversation is saved, and no knowledge was changed.'), sources: [] };
  }
  await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "WorkspaceRandyConversation" WHERE "id" = ${conversationId} FOR UPDATE`;
    const current = await tx.workspaceRandyConversation.findFirst({ where: { id: conversationId, calendarId, processingAt: lease } });
    if (!current) return; // A timed-out older request must never complete over a newer one.
    await tx.workspaceRandyMessage.create({ data: { id: randomUUID(), conversationId, role: 'assistant', body: JSON.parse(JSON.stringify(answer)) } });
    await tx.workspaceRandyConversation.update({ where: { id: conversationId }, data: { processingAt: null } });
  }, { timeout: 20000 });
}
