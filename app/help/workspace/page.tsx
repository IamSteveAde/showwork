import type { Metadata } from 'next';
import WorkspaceHelpCenter from '@/components/help/WorkspaceHelpCenter';
import { workspaceGuides } from '@/lib/help/workspaceGuides';
export const metadata: Metadata = {
  title: 'Marketing Workspace Help & Guides | Showwork',
  description: 'Step-by-step help for content planning, AI Studio, business knowledge, research, approvals, publishing, inbox, leads, reporting and team access in Showwork.',
  alternates: { canonical: '/help/workspace' },
};
export default async function WorkspaceHelpPage({ searchParams }: { searchParams: Promise<{ guide?: string | string[] }> }) {
  const params = await searchParams;
  const guide = typeof params.guide === 'string' && workspaceGuides.some(item=>item.id===params.guide) ? params.guide : undefined;
  return <WorkspaceHelpCenter initialGuideId={guide}/>;
}
