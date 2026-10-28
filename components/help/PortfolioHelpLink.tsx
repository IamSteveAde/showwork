import HelpLink from './HelpLink';
export default function PortfolioHelpLink({className=''}:{className?:string}) {
 return <HelpLink product="portfolio" className={`justify-center rounded-full border border-slate-200 bg-white px-3 text-xs text-slate-600 hover:bg-blue-50 ${className}`}/>;
}
