import { composeGuidedStory } from './trickster-composer.mjs';
import { buildStoryTimeline } from './trickster-timeline.mjs';
import { chooseExportPlan,detectExportCapabilities } from './trickster-export-capabilities.mjs';

function node(tag,className,text) {
  const item=document.createElement(tag);
  if(className) item.className=className;
  if(text!=null) item.textContent=text;
  return item;
}

export class TricksterStudio {
  #host;
  #root;
  #bundle=null;
  #manifest=null;
  #timeline=null;
  #onExport;
  #onOpenEvidence;
  #status;

  constructor({host,onExport,onOpenEvidence}) {
    if(!(host instanceof Element)) throw new TypeError('host element is required');
    this.#host=host;
    this.#onExport=onExport;
    this.#onOpenEvidence=onOpenEvidence;
    this.#root=node('section','trickster-studio');
    this.#root.setAttribute('aria-labelledby','tricksterTitle');
    this.#renderEmpty();
    this.#host.replaceChildren(this.#root);
  }

  #header() {
    const header=node('header','trickster-studio__header');
    const copy=node('div');
    copy.append(node('small','','DATA STORY STUDIO'));
    const title=node('h1','','Trickster');
    title.id='tricksterTitle';
    copy.append(title,node('p','','Turn verified public-chain evidence into a cinematic, shareable story—without editing a timeline.'));
    this.#status=node('span','status-pill','WAITING FOR EVIDENCE');
    header.append(copy,this.#status);
    return header;
  }

  #renderEmpty() {
    this.#root.replaceChildren(this.#header());
    const empty=node('div','trickster-empty');
    empty.append(
      node('strong','','Start from evidence, not a blank canvas.'),
      node('p','','Open a wallet, transaction, token, NFT, or network event in Intelligence, then choose Create Story.'),
      node('button','primary','OPEN INTELLIGENCE')
    );
    empty.querySelector('button').addEventListener('click',()=>this.#onOpenEvidence?.());
    this.#root.append(empty);
  }

  loadEvidence(bundle) {
    if(!bundle?.storyType||!bundle?.subject||!bundle?.coverage||!bundle?.evidence?.length) {
      throw new TypeError('complete evidence bundle is required');
    }
    this.#bundle=structuredClone(bundle);
    this.#manifest=composeGuidedStory({
      id:bundle.id||`story-${Date.now()}`,
      storyType:bundle.storyType,
      subject:bundle.subject,
      coverage:bundle.coverage,
      evidence:bundle.evidence,
      claims:bundle.claims||[],
      output:bundle.output||{}
    });
    this.#timeline=buildStoryTimeline(this.#manifest,{fps:30,maxSeconds:90});
    this.#renderReady();
    return this.#manifest;
  }

  #renderReady() {
    this.#root.replaceChildren(this.#header());
    this.#status.textContent=this.#manifest.coverage.verifiedPercent===100?'VERIFIED EVIDENCE':'PARTIAL COVERAGE';
    const layout=node('div','trickster-layout');
    const preview=node('section','trickster-preview');
    preview.setAttribute('aria-label','Story preview');
    preview.append(node('div','trickster-preview__frame',this.#manifest.storyType.replaceAll('-',' ').toUpperCase()));
    preview.append(node('p','',`${this.#timeline.durationSeconds.toFixed(1)} seconds · ${this.#manifest.output.aspectRatio} · ${this.#timeline.scenes.length} scenes`));

    const scenes=node('ol','trickster-scenes');
    for(const scene of this.#timeline.scenes) {
      const item=node('li','trickster-scene');
      const number=node('span','',String(scenes.children.length+1).padStart(2,'0'));
      const copy=node('div');
      copy.append(node('strong','',scene.type.replaceAll('-',' ')));
      copy.append(node('small','',`${(scene.durationFrames/this.#timeline.fps).toFixed(1)}s · ${scene.claims.length} evidence-backed claims`));
      item.append(number,copy);
      scenes.append(item);
    }

    const disclosure=node('p','notice',this.#manifest.coverage.statement);
    const exportButton=node('button','primary','CREATE VIDEO');
    exportButton.type='button';
    exportButton.addEventListener('click',()=>this.export());
    const evidenceButton=node('button','secondary','REVIEW EVIDENCE');
    evidenceButton.type='button';
    evidenceButton.addEventListener('click',()=>this.#onOpenEvidence?.(this.#manifest));
    const actions=node('div','trickster-actions');
    actions.append(evidenceButton,exportButton);
    const plan=chooseExportPlan(detectExportCapabilities(),{aspectRatio:this.#manifest.output.aspectRatio});
    const planText=node('small','trickster-export-plan',
      plan.mode==='on-device-webcodecs'
        ? `Phone-ready ${plan.width}×${plan.height} ${plan.fps}fps MP4/WebM export`
        : 'This device will use the safe rendering fallback.'
    );
    layout.append(preview,scenes);
    this.#root.append(layout,disclosure,planText,actions);
  }

  async export() {
    if(!this.#manifest||!this.#timeline) throw new Error('story_not_ready');
    this.#status.textContent='PREPARING VIDEO';
    try {
      const result=await this.#onExport?.({
        manifest:this.#manifest,
        timeline:this.#timeline,
        plan:chooseExportPlan(detectExportCapabilities(),{aspectRatio:this.#manifest.output.aspectRatio})
      });
      this.#status.textContent=result?'VIDEO READY':'EXPORT AVAILABLE';
      return result;
    } catch(error) {
      this.#status.textContent='RETRY AVAILABLE';
      throw error;
    }
  }

  destroy() {
    this.#root.remove();
  }
}
