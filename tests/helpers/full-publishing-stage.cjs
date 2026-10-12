'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {load}=require('./load-typescript.cjs');
exports.installFullSchema=async function(cluster){
 const url=new URL(cluster.stageUrl);if(url.hostname!=='127.0.0.1'||url.pathname!=='/'+cluster.database)throw Error('Disposable staging required');
 const command=spawnSync(path.resolve('node_modules/.bin/prisma'),['migrate','diff','--from-empty','--to-schema-datamodel','prisma/schema.prisma','--script'],{encoding:'utf8',env:{PATH:process.env.PATH,DATABASE_URL:'postgresql://offline.invalid/unused',DIRECT_URL:'postgresql://offline.invalid/unused'},maxBuffer:8*1024*1024});
 if(command.status!==0)throw Error('Offline Prisma schema generation failed');
 for(const statement of command.stdout.split(';').map(s=>s.trim()).filter(Boolean))await cluster.stage.$executeRawUnsafe(statement);
 for(const statement of fs.readFileSync(path.resolve('scripts/publishing-reliability/schema.sql'),'utf8').split(';').map(s=>s.trim()).filter(Boolean))await cluster.stage.$executeRawUnsafe(statement);
};
exports.fixtures=async function(db,count,{prefix='native',sameAccount=false,expiredTokens=false,media='photo'}={}){
 const platforms=['INSTAGRAM','TIKTOK','FACEBOOK','LINKEDIN','X'];const {tikTokConsentHash}=load('lib/tiktokConsent.ts'),{emptyTikTokSettings,TIKTOK_CONSENT_VERSION}=load('lib/tiktokSettings.ts');
 const settings={...emptyTikTokSettings,privacyLevel:'SELF_ONLY'};
 await db.creator.create({data:{id:prefix+'-owner',email:prefix+'@synthetic.invalid',passwordHash:'synthetic-unusable-password',contentWorkspacePlan:'UNLIMITED',contentWorkspaceBillingStatus:'ACTIVE'}});
 const calendars=new Set();const posts=[];const due=new Date(Date.now()-10000);
 for(let i=0;i<count;i++){
  const calendarId=prefix+'-calendar-'+(sameAccount?0:Math.floor(i/5));
  if(!calendars.has(calendarId)){
   calendars.add(calendarId);await db.socialCalendar.create({data:{id:calendarId,slug:calendarId,clientName:'Synthetic staging only',passwordHash:'synthetic-unusable-password',managerId:prefix+'-owner'}});
   await db.socialConnection.createMany({data:platforms.map(platform=>({id:calendarId+'-'+platform,calendarId,platform,platformAccountId:calendarId+'-'+platform,accessToken:'synthetic-token-'+calendarId+'-'+platform,refreshToken:'synthetic-refresh-'+calendarId+'-'+platform,accessTokenExpiresAt:new Date(Date.now()+(expiredTokens?-1000:3600000)),refreshTokenExpiresAt:new Date(Date.now()+86400000),tokenScopes:'pages_manage_posts pages_read_engagement tweet.write media.write w_member_social video.publish'}))});
  }
  const platform=platforms[i%5],id=prefix+'-'+i,type=media==='video'?'VIDEO':'PHOTO';
  const assets=[{id:id+'-asset',fileKey:id+(type==='VIDEO'?'.mp4':'.png'),mediaType:type,displayOrder:0,sizeBytes:1000n}];
  const content={caption:'Synthetic integration post '+id,cta:null,hashtags:null,taggedAccounts:null,linkUrl:null,postType:type==='VIDEO'?'Video':'Feed',assets};
  const account=calendarId+'-TIKTOK';
  const post=await db.calendarPost.create({data:{id,calendarId,platform,postDate:due,approvalStatus:'APPROVED',...content,assets:{create:assets},instagramPublishStatus:'SCHEDULED',tikTokPublishStatus:'SCHEDULED',publishStatus:'SCHEDULED',...(platform==='TIKTOK'?{tikTokSettings:settings,tikTokPrivacyLevel:'SELF_ONLY',tikTokConsentAt:new Date(),tikTokConsentBy:prefix+'-owner',tikTokConsentAccountId:account,tikTokConsentVersion:TIKTOK_CONSENT_VERSION,tikTokConsentHash:tikTokConsentHash(content,settings,account)}:{})}});posts.push(post);
 }
 return posts;
};
