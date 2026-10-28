import type {Metadata} from 'next';
import ProductHelpCenter from '@/components/help/ProductHelpCenter';
import {portfolioGuides} from '@/lib/help/portfolioGuides';
export const metadata:Metadata={title:'Portfolio Help & Guides | Showwork',description:'Step-by-step help for creating a Showwork portfolio, identity and banners, image/video/document collections, section covers, sharing, testimonials and agency portfolios.',alternates:{canonical:'/help/portfolio'}};
export default async function PortfolioHelpPage({searchParams}:{searchParams:Promise<{guide?:string|string[]}>}) {
 const params=await searchParams;
 const guide=typeof params.guide==='string'&&portfolioGuides.some(item=>item.id===params.guide)?params.guide:undefined;
 return <ProductHelpCenter product="portfolio" initialGuideId={guide}/>;
}
