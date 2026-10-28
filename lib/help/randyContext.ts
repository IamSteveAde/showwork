import type {HelpProduct} from './routes';
export const RANDY_PRODUCTS:Record<HelpProduct,string>={workspace:'Marketing Workspace',delivery:'Project Delivery',portfolio:'Portfolio'};
export function randyProduct(path:string):HelpProduct {
 if(/^\/(?:help\/portfolio|dashboard\/portfolio|portfolio)(?:\/|$)/.test(path))return 'portfolio';
 if(/^\/(?:help\/project-delivery|dashboard\/(?:projects|new|new-managed|managed)|delivery)(?:\/|$)/.test(path))return 'delivery';
 if(/^\/dashboard\/[^/]+$/.test(path)&&!['/dashboard/profile','/dashboard/billing','/dashboard/calendars','/dashboard/start'].includes(path))return 'delivery';
 return 'workspace';
}
export function humanSupportUrl(product:HelpProduct){return `https://wa.me/2347018819588?text=${encodeURIComponent(`Hello Showwork Support. I'd like to speak with a person about ${RANDY_PRODUCTS[product]}. I came from Randy, the help assistant. I'll describe the issue here.`)}`;}
