#!/usr/bin/env node
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const origin=String(process.argv[2]||process.env.PUBLIC_APP_ORIGIN||"").replace(/\/$/,"");
if(!/^https?:\/\//.test(origin))throw new Error("Pass the production app origin as argv[2] or PUBLIC_APP_ORIGIN");
const out=String(process.argv[3]||"/workspace/screenshots/afterbell-live-journey.json");
mkdirSync(dirname(out),{recursive:true});

const viewports=[{name:"desktop",width:1280,height:800},{name:"mobile",width:390,height:844}];
const results={origin,viewports:{}};

function assert(condition,message){if(!condition)throw new Error(message);}
function callsign(wallet){return wallet.length>=8?`${wallet.slice(0,4)}…${wallet.slice(-4)}`:wallet;}
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
async function openFreshPage(browser,vp){
  const page=await browser.newPage({viewport:{width:vp.width,height:vp.height}});
  const errors={console:[],page:[]};page.on("console",msg=>{if(msg.type()==="error")errors.console.push(msg.text());});page.on("pageerror",err=>errors.page.push(String(err?.message||err)));
  const response=await page.goto(`${origin}/?galaxy=afterbell`,{waitUntil:"domcontentloaded",timeout:45000});
  assert((response?.status()??0)===200,`${vp.name}: HTTP ${response?.status()??0}`);
  await page.waitForFunction(()=>{const el=document.querySelector("main.field-shell");return el?.getAttribute("data-galaxy")==="afterbell"&&Number(el.getAttribute("data-field-count")||0)>0;},null,{timeout:30000});
  const api=await page.evaluate(async()=>{
    const auditResponse=await fetch("/api/intelligence/afterbell/audit",{cache:"no-store"}),audit=await auditResponse.json();
    const mints=[...new Set((Array.isArray(audit?.assets)?audit.assets:[]).map(row=>String(row?.mint||"").trim()).filter(Boolean))];
    if(!auditResponse.ok||!audit?.ok||!mints.length)return{ok:false,status:auditResponse.status,audit,mints,traderUrl:null,traderPayload:null};
    const traderPath="/api/intelligence/afterbell/traders?mints="+encodeURIComponent(mints.join(","))+"&limit=50";
    const traderResponse=await fetch(traderPath,{cache:"no-store"}),traderPayload=await traderResponse.json();
    return{ok:traderResponse.ok&&traderPayload?.ok===true,status:traderResponse.status,audit,mints,traderUrl:new URL(traderPath,location.origin).toString(),traderPayload};
  });
  const traderPayload=api.traderPayload,traderUrl=api.traderUrl;
  assert(api.ok===true&&traderPayload?.ok===true&&traderUrl,`${vp.name}: live Afterbell trader payload unavailable`);
  const initial=await shellState(page);
  assert(initial.count===traderPayload.items.length,`${vp.name}: STAR count ${initial.count} != live API count ${traderPayload.items.length}`);
  for(let i=0;i<traderPayload.items.length;i++){
    const row=traderPayload.items[i],prev=traderPayload.items[i-1];
    assert(!/^STAR\s*·?\s*AFTERBELL\s*#/i.test(String(row.displayName||""))&&!/AFTERBELL\s*#/i.test(String(row.displayName||"")),`${vp.name}: numeric Afterbell identity leaked`);
    assert(Number(row.uniqueAfterCloseTxCount)===Number(row.transactionCount),`${vp.name}: unique tx contract mismatch`);
    if(row.displayNameSource==="wallet-callsign")assert(row.displayName===callsign(row.wallet),`${vp.name}: unstable wallet callsign for ${row.wallet}`);
    if(prev){const a=Number(prev.uniqueAfterCloseTxCount),b=Number(row.uniqueAfterCloseTxCount);assert(a>=b,`${vp.name}: ranking not descending unique tx count`);if(a===b)assert(String(prev.wallet).localeCompare(String(row.wallet))<=0,`${vp.name}: deterministic tie-break changed`);}
    assert((row.latestTrades||[]).length<=3,`${vp.name}: more than three latest trades exposed`);
  }
  assert(errors.console.length===0,`${vp.name}: console errors before interaction: ${errors.console.join(" | ")}`);
  assert(errors.page.length===0,`${vp.name}: page errors before interaction: ${errors.page.join(" | ")}`);
  return{page,traderPayload,traderUrl,errors,initial};
}
async function emptyCoverageProbe(page,traderUrl){
  const u=new URL(traderUrl);u.searchParams.set("from","1");u.searchParams.set("to","2");
  const body=await page.evaluate(async url=>{const r=await fetch(url,{cache:"no-store"});return{status:r.status,body:await r.json()};},u.toString());
  assert(body.status===200,"empty coverage probe failed");
  assert(body.body.coverage==="empty"&&Array.isArray(body.body.items)&&body.body.items.length===0,"empty coverage did not stay honestly empty");
  assert(/No retained|Empty coverage stays empty/i.test(String(body.body.disclosure||"")),"empty coverage disclosure missing");
  return body.body.disclosure;
}

const browser=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
try{
  for(const vp of viewports){
    const {page,traderPayload,traderUrl,errors,initial}=await openFreshPage(browser,vp);
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

    const replayPageData=await openFreshPage(browser,vp),rp=replayPageData.page,re=await enterStar(rp),rpSelection=await selectPlanet(rp,re.box);
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
