// Node --import preload for existing browser checks. Assertions stay unchanged;
// only platform transport is isolated, as required for this visual experiment.
import {chromium} from 'playwright';
const launch=chromium.launch.bind(chromium);
const attached=new WeakSet();
async function isolate(context){
  if(attached.has(context))return;attached.add(context);
  await context.route('**/*',route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.pathname==='/api/highscores')return route.fulfill({status:200,contentType:'application/json',body:request.method()==='GET'?'[]':'{"ok":true,"mock":true}'});
    if(['http:','https:'].includes(url.protocol)&&!['127.0.0.1','localhost'].includes(url.hostname))return route.abort();
    return route.continue();
  });
}
chromium.launch=async function(options){
  const browser=await launch(options),newContext=browser.newContext.bind(browser),newPage=browser.newPage.bind(browser);
  browser.newContext=async options=>{const context=await newContext(options);await isolate(context);return context;};
  browser.newPage=async options=>{const page=await newPage(options);await isolate(page.context());return page;};
  return browser;
};
