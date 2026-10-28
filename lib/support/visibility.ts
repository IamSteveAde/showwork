// Public delivery slugs occupy the root namespace; known product routes are explicit.
const platformRoots = new Set(['admin','api','blog','book-demo','calendars','content-workspace','creativo','dashboard','data-deletion','delivery','forgot-password','help','invites','leaderboard','login','managed-invites','portfolio','privacy','reset-password','signup','social-calendar','spotlight','start','terms','testimonial','webinars','welcome']);
export function isClientView(pathname: string, hostname = '') {
 const host = hostname.toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '');
 if ((host.endsWith('.useshowwork.com') && host !== 'www.useshowwork.com') || host.endsWith('.localhost')) return true;
 const path = pathname.replace(/\/+$/, '') || '/';
 if (/^\/(?:social-calendar|portfolio|testimonial)\//.test(path)) return true;
 const root = path.split('/')[1];
 return !!root && !platformRoots.has(root);
}
