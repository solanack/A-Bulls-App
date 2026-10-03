#!/usr/bin/env node
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { afterbellTradersPath, assertAfterbellTraderRows, callsign, isAfterbellTraderPayload, isAfterbellTradersRequest, loadRegistryMintHints, mintsForTraderComparison, pageTraderPayload, selectRegistryFetch } from "./afterbell-live-journey-compare.mjs";

function assert(condition,message){if(!condition)throw new Error(message);}
async function thread(page){return await page.evaluate(()=>{try{return JSON.parse(sessionStorage.getItem("abulls:research-thread:v1")||"null");}catch{return null;}});}
async function shellState(page){return await page.locator("main.field-shell").evaluate(el=>({galaxy:el.getAttribute("data-galaxy"),section:el.getAttribute("data-field-section"),count:Number(el.getAttribute("data-field-count")||0),mode:el.getAttribute("data-mode"),coverage:el.getAttribute("data-coverage")}));}
async function pick(page,x,y){await page.evaluate(({x,y})=>globalThis.__ABULLS_PICK?.(x,y),{x,y});await page.waitForTimeout(100);}
async function enterStar(page){
  const box=await page.locator("canvas.universe-canvas").boundingBox();if(!box)throw new Error("Field canvas missing");
  const xs=[.5,.42,.58,.34,.66,.26,.74],ys=[.42,.5,.34,.58,.26,.66];
  for(const yf of ys)for(const xf of xs){
    await pick(page,box.x+box.width*xf,box.y+box.height*yf);
    const state=await shellState(page);
    if(state.section==="trader-system")return{box,state};
  }
  throw new Error("Could not select an Afterbell trader STAR on the live canvas");
}
async function selectPlanet(page,box){
  const candidates=[];
  await page.waitForTimeout(3000);
  for(const r of [.1,.16,.22,.28,.34,.42])for(let i=0;i<24;i++){const a=i/24*Math.PI*2;candidates.push([box.x+box.width/2+Math.cos(a)*Math.min(box.width,box.height)*r,box.y+box.height/2+Math.sin(a)*Math.min(box.width,box.height)*r]);}
  const cometReceipts=[];
  for(const [x,y] of candidates){
    await pick(page,x,y);
    const state=await shellState(page),ctx=await thread(page);
    if(state.mode==="replay"&&ctx?.entrySignature){cometReceipts.push(ctx.entrySignature);return{kind:"comet",ctx,cometReceipts};}
    if(state.mode==="explore"&&ctx?.mint)return{kind:"planet",ctx,cometReceipts};
  }
  throw new Error("Could not select an xStock PLANET or retained trade COMET in the live Afterbell trader system");
}
function watchTraderResponses(page){
  const captured=[],requests=[];let pending=0;
  const onRequest=request=>{requests.push(request.url());};
  const onResponse=response=>{
    const url=response.url();let contentType="",contentLength=0;
    try{const headers=response.headers();contentType=headers["content-type"]||"";contentLength=Number(headers["content-length"]||0);}catch{contentType="";}
    const direct=isAfterbellTradersRequest(url);
    if(!direct&&!/json/i.test(contentType))return;
    if(/\.(?:js|css|map|png|svg|webp|gif|jpg|jpeg|woff2?)(?:\?|$)/i.test(url))return;
    if(contentLength>2_000_000)return;
    pending+=1;
    void (async()=>{
      try{if(!response.ok())return;const payload=await response.json();if(direct||isAfterbellTraderPayload(payload))captured.push({url,payload});}
      catch{/* body was not the traders payload */}
      finally{pending-=1;}
    })();
  };
  page.on("request",onRequest);page.on("response",onResponse);
  return {captured,requests,async flush(){const start=Date.now();while(pending>0&&Date.now()-start<5000)await new Promise(resolve=>setTimeout(resolve,25));},stop(){page.off("request",onRequest);page.off("response",onResponse);}};
}
async function fetchRegistryTraders(page,origin,registryMints){
  const traderPath=afterbellTradersPath(registryMints),traderUrl=new URL(traderPath,origin).toString();
  const result=await page.evaluate(async path=>{const traderResponse=await fetch(path,{cache:"no-store"});let traderPayload=null;try{traderPayload=await traderResponse.json();}catch{traderPayload=null;}return{ok:traderResponse.ok&&traderPayload?.ok===true,status:traderResponse.status,traderPayload};},traderPath);
  return {...result,traderUrl};
}
async function openFreshPage(browser,vp,origin){
  const page=await browser.newPage({viewport:{width:vp.width,height:vp.height}});
  const errors={console:[],page:[]};page.on("console",msg=>{if(msg.type()==="error")errors.console.push(msg.text());});page.on("pageerror",err=>errors.page.push(String(err?.message||err)));
  const watch=watchTraderResponses(page);
  try{
    const response=await page.goto(`${origin}/?galaxy=afterbell`,{waitUntil:"domcontentloaded",timeout:45000});
    assert((response?.status()??0)===200,`${vp.name}: HTTP ${response?.status()??0}`);
    await page.waitForFunction(()=>{const el=document.querySelector("main.field-shell");return el?.getAttribute("data-galaxy")==="afterbell"&&Number(el.getAttribute("data-field-count")||0)>0;},null,{timeout:30000});
    await watch.flush();
    const registryMints=loadRegistryMintHints(),comparisonMints=mintsForTraderComparison({requestUrls:watch.requests,registryMints});
    let initial=await shellState(page);
    const pageHit=pageTraderPayload(watch.captured,comparisonMints,initial.count);
    let traderPayload=pageHit?.traderPayload??null;
    const traderUrl=new URL(afterbellTradersPath(comparisonMints),origin).toString();
    if(!(pageHit&&pageHit.traderPayload.items.length===initial.count)){
      // Hydrate is a server function, so /api/intelligence/afterbell/traders may not
      // appear as a browser response. Re-read that route for the mints the page
      // requested — registry mintHints when the request was not visible — and retry
      // once if a trade lands between the Field render and this call.
      if(!pageHit){
        watch.stop();
        const fetches=[];
        for(let attempt=0;attempt<2;attempt++){
          fetches.push(await fetchRegistryTraders(page,origin,comparisonMints));
          initial=await shellState(page);
          const selected=selectRegistryFetch(fetches,initial.count);
          traderPayload=selected?.traderPayload??traderPayload;
          if(selected?.matched)break;
        }
      }
    }
    assert(traderPayload?.ok===true&&traderUrl,`${vp.name}: live Afterbell trader payload unavailable`);
    assert(initial.count===traderPayload.items.length,`${vp.name}: STAR count ${initial.count} != live API count ${traderPayload.items.length}`);
    assertAfterbellTraderRows(traderPayload.items,vp.name);
    assert(errors.console.length===0,`${vp.name}: console errors before interaction: ${errors.console.join(" | ")}`);
    assert(errors.page.length===0,`${vp.name}: page errors before interaction: ${errors.page.join(" | ")}`);
    return{page,traderPayload,traderUrl,errors,initial};
  }finally{watch.stop();}
}
async function emptyCoverageProbe(page,traderUrl){
  const u=new URL(traderUrl);u.searchParams.set("from","1");u.searchParams.set("to","2");
  const body=await page.evaluate(async url=>{const r=await fetch(url,{cache:"no-store"});return{status:r.status,body:await r.json()};},u.toString());
  assert(body.status===200,"empty coverage probe failed");
  assert(body.body.coverage==="empty"&&Array.isArray(body.body.items)&&body.body.items.length===0,"empty coverage did not stay honestly empty");
  assert(/No retained|Empty coverage stays empty/i.test(String(body.body.disclosure||"")),"empty coverage disclosure missing");
  return body.body.disclosure;
}

async function main(){
  const origin=String(process.argv[2]||process.env.PUBLIC_APP_ORIGIN||"").replace(/\/$/,"");
  if(!/^https?:\/\//.test(origin))throw new Error("Pass the production app origin as argv[2] or PUBLIC_APP_ORIGIN");
  const out=String(process.argv[3]||"/workspace/screenshots/afterbell-live-journey.json");
  mkdirSync(dirname(out),{recursive:true});
  const viewports=[{name:"desktop",width:1280,height:800},{name:"mobile",width:390,height:844}];
  const results={origin,viewports:{}};
  const browser=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
  try{
    for(const vp of viewports){
      const {page,traderPayload,traderUrl,errors,initial}=await openFreshPage(browser,vp,origin);
      const emptyDisclosure=await emptyCoverageProbe(page,traderUrl);
      const entered=await enterStar(page),detail=page.locator('[aria-label="Afterbell trader details"]');
      await detail.waitFor({state:"visible",timeout:10000});
      const detailText=await detail.innerText(),label=(await detail.locator("strong").first().innerText()).trim(),starThread=await thread(page);
      assert(starThread?.galaxyId==="afterbell"&&Boolean(starThread.wallet),`${vp.name}: STAR thread missing Afterbell wallet`);
      assert(starThread.mint==null,`${vp.name}: STAR selection guessed mint ${starThread.mint}`);
      assert(!/AFTERBELL\s*#\d+/i.test(label)&&!/STAR\s*·\s*AFTERBELL/i.test(label),`${vp.name}: numeric STAR identity remains: ${label}`);
      const selectedTrader=(traderPayload.items||[]).find(row=>String(row.wallet||"")===String(starThread.wallet||""));
      assert(selectedTrader,`${vp.name}: selected trader is missing from the live payload`);
      assert(/Research only/i.test(detailText)&&/COMETS/i.test(detailText),`${vp.name}: compact trader disclosure incomplete`);
      assert((selectedTrader.latestTrades||[]).length>0,`${vp.name}: selected trader has no retained COMETS in the live payload`);
      assert(entered.state.count>0,`${vp.name}: selected trader system has zero xStock PLANETS`);
      const identitySource=String(selectedTrader.displayNameSource||"");
      if(identitySource==="wallet-callsign")assert(label===callsign(starThread.wallet),`${vp.name}: visible callsign is not deterministic`);

      let selection=await selectPlanet(page,entered.box);
      let cometReceipt=selection.kind==="comet"?selection.ctx.entrySignature:null;
      if(selection.kind==="comet"){
        await page.goto(`${origin}/?galaxy=afterbell`,{waitUntil:"domcontentloaded",timeout:45000});
        await page.waitForFunction(()=>{const el=document.querySelector("main.field-shell");return el?.getAttribute("data-galaxy")==="afterbell"&&Number(el.getAttribute("data-field-count")||0)>0;},null,{timeout:30000});
        const reentered=await enterStar(page);selection=await selectPlanet(page,reentered.box);
      }
      assert(selection.ctx?.mint,`${vp.name}: no mint after PLANET/COMET selection`);
      const selectedThread=selection.ctx;
      if(selection.kind==="planet"){
        assert(selectedThread.fromTs&&selectedThread.toTs,`${vp.name}: selected PLANET thread missing Afterbell window`);
        const evidence=page.getByRole("button",{name:"EVIDENCE",exact:true});await evidence.waitFor({state:"visible",timeout:5000});assert(!(await evidence.isDisabled()),`${vp.name}: Evidence stayed disabled after PLANET selection`);
        await evidence.click();await page.waitForFunction(()=>document.querySelector("main.field-shell")?.getAttribute("data-mode")==="evidence",null,{timeout:10000});
        const evidenceThread=await thread(page);assert(evidenceThread.wallet===selectedThread.wallet&&evidenceThread.mint===selectedThread.mint,`${vp.name}: Evidence lost Afterbell thread context`);
        assert(!/Pick a trade first/i.test(await page.locator("body").innerText()),`${vp.name}: Evidence treated selected Afterbell mint as missing`);
      }

      const replayPageData=await openFreshPage(browser,vp,origin),rp=replayPageData.page,re=await enterStar(rp),rpSelection=await selectPlanet(rp,re.box);
      if(rpSelection.kind==="planet"){
        const replay=rp.getByRole("button",{name:"REPLAY",exact:true});await replay.waitFor({state:"visible",timeout:5000});assert(!(await replay.isDisabled()),`${vp.name}: Replay stayed disabled after PLANET selection`);await replay.click();
      }
      await rp.waitForFunction(()=>document.querySelector("main.field-shell")?.getAttribute("data-mode")==="replay",null,{timeout:10000});
      const replayThread=await thread(rp);assert(Boolean(replayThread?.wallet)&&Boolean(replayThread?.mint),`${vp.name}: Replay missing wallet×mint thread context`);assert(!/Pick a trade first/i.test(await rp.locator("body").innerText()),`${vp.name}: Replay guessed/missed selected mint`);
      if(rpSelection.kind==="comet"){assert(Boolean(replayThread.entrySignature),`${vp.name}: COMET Replay did not retain receipt signature`);cometReceipt=cometReceipt||replayThread.entrySignature;}

      results.viewports[vp.name]={initialStarCount:initial.count,apiStarCount:traderPayload.items.length,selectedLabel:label,identitySource,selectedWallet:starThread.wallet,planetCount:entered.state.count,latestComets:(selectedTrader.latestTrades||[]).length,selectedMint:selectedThread.mint,replayMint:replayThread.mint,evidenceVerified:selection.kind==="planet",cometReceiptObserved:Boolean(cometReceipt||rpSelection.kind==="comet"),emptyCoverageDisclosure:emptyDisclosure,consoleErrors:errors.console,pageErrors:errors.page};
      await page.close();await rp.close();
    }
    results.ok=true;writeFileSync(out,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
  }catch(error){results.ok=false;results.error=String(error?.stack||error);writeFileSync(out,JSON.stringify(results,null,2));console.error(JSON.stringify(results,null,2));process.exitCode=1;}
  finally{await browser.close();}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
