import {CircleHelp} from 'lucide-react';
import {helpHref,type HelpProduct} from '@/lib/help/routes';
export default function HelpLink({product='workspace',guide,canonical=false,className='',showIcon=true}:{product?:HelpProduct;guide?:string;canonical?:boolean;className?:string;showIcon?:boolean}) {
 return <a href={helpHref(product,guide,canonical)} target="_blank" rel="noopener noreferrer" className={`inline-flex min-h-9 items-center gap-2 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 ${className}`}>{showIcon&&<CircleHelp size={15} aria-hidden="true"/>}<span>Help & guides</span><span className="sr-only"> (opens in a new tab)</span></a>;
}
