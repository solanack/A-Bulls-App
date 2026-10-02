import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { callUniverseTool } from "@/lib/universe-intelligence";
import { anchorBolts, isPublicAddress, replayToolInput, tapeEvents, type ReplaySubject, type TapeBolt, type TapeCandle } from "@/lib/field/replay-tape";
import { drawTape } from "@/lib/field/replay-tape-render";
import { TraderSigil } from "@/components/trader-sigil";
import { callsign } from "@/lib/field/trader-sheet";

type Data = Record<string, unknown>;
const obj = (value: unknown): Data => value && typeof value === "object" && !Array.isArray(value) ? value as Data : {};

function VersusTape({ label, wallet, candles, bolts, start, end, cursor, scaleMode }: {
  label: string; wallet: string; candles: TapeCandle[]; bolts: TapeBolt[]; start: number; end: number; cursor: number; scaleMode: "log" | "linear";
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = hostRef.current, canvas = canvasRef.current;
    if (!host || !canvas) return;
    const draw = () => {
      const width = Math.max(280, host.clientWidth), height = 220, dpr = Math.min(1.75, globalThis.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext("2d"); if (!ctx) return;
      ctx.setTransform(dpr,0,0,dpr,0,0);
      drawTape(ctx,{width,height,candles,bolts,start,end,cursor,scaleMode,scarPx:14,pad:{top:38,right:54,bottom:28,left:8}});
    };
    draw();
    const ro = new ResizeObserver(draw); ro.observe(host); return () => ro.disconnect();
  }, [candles,bolts,start,end,cursor,scaleMode]);
  return <section className="rs-vs__lane" ref={hostRef}>
    <header><TraderSigil wallet={wallet} size={32}/><div><b>{label}</b><span>{callsign(wallet)} · {bolts.length} prints</span></div></header>
    <canvas ref={canvasRef} role="img" aria-label={`${label} Replay tape`}/>
  </section>;
}

export function ReplayVersusPanel({ subject, traderLabel, candles, heroBolts, start, end, cursor, scaleMode, onClose }: {
  subject: ReplaySubject; traderLabel: string; candles: TapeCandle[]; heroBolts: TapeBolt[]; start: number; end: number; cursor: number; scaleMode: "log" | "linear"; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [wallet,setWallet] = useState("");
  const [rivalBolts,setRivalBolts] = useState<TapeBolt[]>([]);
  const [rivalLabel,setRivalLabel] = useState("RIVAL");
  const [status,setStatus] = useState<"idle"|"loading"|"ready"|"error">("idle");
  const [error,setError] = useState("");
  useEffect(()=>{dialog.current?.showModal();return()=>dialog.current?.close();},[]);
  async function loadRival(){
    const nextWallet=wallet.trim();
    if(!isPublicAddress(nextWallet)||nextWallet.toLowerCase()===subject.wallet.toLowerCase()){setError("Enter a different public wallet address.");return;}
    setStatus("loading");setError("");
    try{
      const rivalSubject:ReplaySubject={...subject,wallet:nextWallet,fromTs:start,toTs:end,cursor:null};
      const response=obj(await callUniverseTool({data:{tool:"replay",input:replayToolInput(rivalSubject)}}));
      if(response.ok===false)throw new Error(String(response.error??"Replay unavailable"));
      const bundle=obj(response.bundle),events=tapeEvents(bundle.events,obj(bundle.subject).quoteMint);
      const bolts=anchorBolts(events,candles,start,end);
      if(!bolts.length)throw new Error("No retained buy or sell prints for this wallet on the same token/window.");
      setRivalBolts(bolts);setRivalLabel(String(obj(bundle.subject).displayName||callsign(nextWallet)));setStatus("ready");
    }catch(cause){setStatus("error");setError(cause instanceof Error?cause.message:"Could not load rival tape.");}
  }
  return <dialog ref={dialog} className="rs-vs" onCancel={e=>{e.preventDefault();onClose();}} aria-label="Versus Replay">
    <div className="rs-vs__card">
      <header className="rs-vs__head"><div><b>VERSUS MODE</b><span>Same token · same clock · two retained tapes</span></div><button className="rs-icon" type="button" aria-label="Close Versus" onClick={onClose}><X size={17}/></button></header>
      <div className="rs-vs__setup">
        <input value={wallet} onChange={e=>setWallet(e.target.value)} placeholder="Paste second public wallet" aria-label="Second trader wallet"/>
        <button type="button" onClick={()=>void loadRival()} disabled={status==="loading"}>{status==="loading"?"READING…":"LOAD RIVAL"}</button>
      </div>
      {error?<p className="rs-vs__error" role="alert">{error}</p>:null}
      <div className="rs-vs__stack">
        <VersusTape label={traderLabel} wallet={subject.wallet} candles={candles} bolts={heroBolts} start={start} end={end} cursor={cursor} scaleMode={scaleMode}/>
        {status==="ready"?<VersusTape label={rivalLabel} wallet={wallet.trim()} candles={candles} bolts={rivalBolts} start={start} end={end} cursor={cursor} scaleMode={scaleMode}/>:<div className="rs-vs__empty">Load another public wallet. Both tapes race on this Replay clock; missing values stay —.</div>}
      </div>
    </div>
  </dialog>;
}
