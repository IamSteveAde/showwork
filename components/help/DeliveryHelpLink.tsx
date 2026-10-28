import HelpLink from './HelpLink';
export default function DeliveryHelpLink({guide,className=''}:{guide?:string;className?:string}) {
 return <HelpLink product="delivery" guide={guide} className={`justify-center rounded-full border border-white/20 bg-white/5 px-3 text-xs text-white/80 hover:bg-white/10 ${className}`}/>;
}
