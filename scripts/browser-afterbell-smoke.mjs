#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { chromium } from "playwright";

const origin=String(process.argv[2]||"https://abullsapp.com").replace(/\/$/,"");
const outJson=String(process.argv[3]||"/workspace/screenshots/afterbell-journey.json");
const viewports=[
  {name:"desktop",width:1280,height:800},
  {name:"mobile",width:390,height:844},
];

mkdirSync(dirname(outJson),{recursive:true});
const browser=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
const verdict={url:`${origin}/afterbell/`,viewports:{}};
try{
  for(const vp of viewports){
    const page=await browser.newPage({viewport:{width:vp.width,height:vp.height}});
    const errors={consoleErrors:[],pageErrors:[]};
    page.on("console",msg=>{if(msg.type()==="error")errors.consoleErrors.push(msg.text());});
    page.on("pageerror",err=>errors.pageErrors.push(String(err?.message||err)));
    const response=await page.goto(`${origin}/afterbell/`,{waitUntil:"domcontentloaded",timeout:45000});
    await page.waitForSelector('main.field-shell[data-galaxy="afterbell"]',{timeout:30000});
    await page.waitForFunction(()=>{
      const el=document.querySelector('main.field-shell[data-galaxy="afterbell"]');
      return Number(el?.getAttribute("data-field-count")||0)>0;
    },null,{timeout:30000});
    const state=await page.locator("main.field-shell").evaluate(el=>({
      galaxy:el.getAttribute("data-galaxy"),
      section:el.getAttribute("data-field-section"),
      count:Number(el.getAttribute("data-field-count")||0),
      coverage:el.getAttribute("data-coverage"),
      fallback:el.getAttribute("data-field-fallback"),
    }));
    const hasCanvas=(await page.locator("canvas").count())>0;
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1);
    const screenshot=`/workspace/screenshots/afterbell-${vp.name}.png`;
    await page.screenshot({path:screenshot,fullPage:false});
    verdict.viewports[vp.name]={
      status:response?.status()??0,
      finalUrl:page.url(),
      ...state,
      hasCanvas,
      horizontalOverflow:overflow,
      consoleErrors:errors.consoleErrors,
      pageErrors:errors.pageErrors,
      screenshot,
    };
    if((response?.status()??0)!==200)throw new Error(`${vp.name}: HTTP ${response?.status()??0}`);
    if(state.galaxy!=="afterbell")throw new Error(`${vp.name}: did not hydrate into Afterbell`);
    if(state.section!=="galaxy")throw new Error(`${vp.name}: unexpected Field section ${state.section}`);
    if(!Number.isFinite(state.count)||state.count<1)throw new Error(`${vp.name}: Afterbell materialized zero trader STARS`);
    if(!hasCanvas)throw new Error(`${vp.name}: Field canvas missing`);
    if(overflow)throw new Error(`${vp.name}: horizontal overflow`);
    if(errors.consoleErrors.length||errors.pageErrors.length)throw new Error(`${vp.name}: browser errors detected`);
    await page.close();
  }
  verdict.ok=true;
  writeFileSync(outJson,JSON.stringify(verdict,null,2));
  console.log(JSON.stringify(verdict,null,2));
}catch(error){
  verdict.ok=false;
  verdict.error=String(error?.message||error);
  writeFileSync(outJson,JSON.stringify(verdict,null,2));
  console.error(JSON.stringify(verdict,null,2));
  process.exitCode=1;
}finally{
  await browser.close();
}
