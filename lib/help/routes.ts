export type HelpProduct = 'workspace' | 'delivery' | 'portfolio';
export const HELP_PATHS: Record<HelpProduct,string> = {workspace:'/help/workspace',delivery:'/help/project-delivery',portfolio:'/help/portfolio'};
export function helpHref(product:HelpProduct='workspace',guide?:string,canonical=false) {
  const path=HELP_PATHS[product]+(guide?`?guide=${encodeURIComponent(guide)}`:'');
  // Public portfolio subdomains must open the main app, not a rewritten tenant path.
  return canonical ? new URL(path,process.env.NEXT_PUBLIC_APP_URL || 'https://useshowwork.com').toString() : path;
}
