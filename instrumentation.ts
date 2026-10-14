/** Default-off Next startup hook. Build and ordinary startup do not install canonical publishing. */
export async function register(){
 if(process.env.NEXT_RUNTIME==='nodejs'){
 const {publishingHostConfiguration}=await import('./lib/publishing/hostConfiguration');
 const config=publishingHostConfiguration(process.env);
 if(!config.application)return;
 if(process.env.SHOWWORK_PUBLISHING_PROTOCOL!=='canonical')throw Error('CANONICAL_APPLICATION_PROTOCOL_REQUIRED');
 if(!process.env.JWT_SECRET||!process.env.CRON_SECRET||!process.env.RESEND_API_KEY)throw Error('CANONICAL_APPLICATION_CREDENTIALS_REQUIRED');
 const {installShowworkApplicationHost,nativePublishingNotification}=await import('./lib/publishing/applicationHost');
 installShowworkApplicationHost(config,{fetch:globalThis.fetch,cronSecret:process.env.CRON_SECRET,notify:nativePublishingNotification(process.env.RESEND_API_KEY)});
 }
}
