import type { Metadata } from 'next';
import ProductHelpCenter from '@/components/help/ProductHelpCenter';
import { deliveryGuides } from '@/lib/help/deliveryGuides';
export const metadata: Metadata = {
  title:'Project Delivery Help & Guides | Showwork',
  description:'Step-by-step help for project uploads, client access, file reviews, revisions, payment confirmation, downloads and managed-project collaboration in Showwork.',
  alternates:{canonical:'/help/project-delivery'},
};
export default async function DeliveryHelpPage({searchParams}:{searchParams:Promise<{guide?:string|string[]}>}) {
  const params=await searchParams;
  const guide=typeof params.guide==='string' && deliveryGuides.some(item=>item.id===params.guide) ? params.guide : undefined;
  return <ProductHelpCenter product="delivery" initialGuideId={guide}/>;
}
