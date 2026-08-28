const text=value=>String(value==null?'':value).trim();
const freezeEntry=value=>Object.freeze({focusId:text(value.focusId),focusKind:text(value.focusKind||'entity')});

export class FieldInvestigationTrail{
  #entries=[];#cursor=-1;#limit;
  constructor({limit=12}={}){this.#limit=Math.max(2,Math.min(50,Math.trunc(Number(limit)||12)));}
  visit(hub={}){
    const entry=freezeEntry(hub);if(!entry.focusId)return this.state();
    if(this.#entries[this.#cursor]?.focusId===entry.focusId)return this.state();
    this.#entries=this.#entries.slice(0,this.#cursor+1);this.#entries.push(entry);
    if(this.#entries.length>this.#limit)this.#entries=this.#entries.slice(-this.#limit);
    this.#cursor=this.#entries.length-1;return this.state();
  }
  back(){if(this.#cursor<=0)return null;this.#cursor-=1;return this.current();}
  forward(){if(this.#cursor<0||this.#cursor>=this.#entries.length-1)return null;this.#cursor+=1;return this.current();}
  current(){return this.#cursor>=0?this.#entries[this.#cursor]:null;}
  state(){return Object.freeze({current:this.current(),canBack:this.#cursor>0,canForward:this.#cursor>=0&&this.#cursor<this.#entries.length-1,depth:this.#entries.length,cursor:this.#cursor});}
  clear(){this.#entries=[];this.#cursor=-1;return this.state();}
}
