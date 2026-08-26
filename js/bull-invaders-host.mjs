function node(tag,className,text){
  const el=document.createElement(tag);
  if(className)el.className=className;
  if(text!=null)el.textContent=text;
  return el;
}

function html(strings,...values){
  return String.raw({raw:strings},...values);
}

export function createBullInvadersHost(){
  const root=node('section','bull-invaders-vnext');
  root.id='invadersGameView';
  root.classList.add('view','active');
  root.setAttribute('aria-label','Bull Invaders');
  root.innerHTML=html`
    <aside class="bull-invaders-vnext__loadout" aria-label="Bull Invaders loadout">
      <div class="bull-invaders-vnext__loadout-head">
        <small>ONLY GAME · BULL INVADERS</small>
        <h2>Stampede Control</h2>
        <p>Choose Ranked or Campaign, select an unlocked craft, then launch.</p>
      </div>
      <div class="campaign-loadout">
        <div class="campaign-ship-preview"><img id="selectedShipPreview" src="assets/v7/player-ship.webp" alt="Bull Invaders player ship"/></div>
        <label id="epochSelectField" hidden><span>Campaign epoch</span><select id="epochSelect" aria-label="Select unlocked epoch"></select></label>
        <label><span>Player ship</span><select id="shipSelect" aria-label="Select unlocked player ship"></select></label>
        <article class="epoch-sector-card" id="epochSectorCard">
          <span id="epochSectorCode">EPOCH 01</span>
          <b id="epochSectorName">Genesis Grid</b>
          <small id="epochSectorTag">Green-cyan validator lanes awaken.</small>
        </article>
        <div class="campaign-progress" aria-hidden="true"><i id="epochUnlockProgress"></i></div>
        <small id="campaignStatus">0/10 EPOCHS cleared</small>
        <b id="campaignNextUnlock">Clear EPOCH 1 to unlock the next craft</b>
      </div>
      <div class="run-mode-selector" role="radiogroup" aria-label="Run mode">
        <label><input type="radio" name="invaderMode" value="ranked" checked/><span><b>Ranked</b><small>Verified competitive rules</small></span></label>
        <label><input type="radio" name="invaderMode" value="arcade"/><span><b>Campaign</b><small>10 EPOCH progression</small></span></label>
      </div>
      <label class="play-record-toggle" for="recordRunToggle"><span><b>Record next run</b><small>Memory-only until you save/share</small></span><input type="checkbox" id="recordRunToggle"/></label>
      <button type="button" id="startInvaders" class="primary bull-invaders-vnext__launch">START THE STAMPEDE</button>
    </aside>

    <div class="game-wrap invaders-wrap bull-invaders-vnext__game" data-game-state="ready">
      <div class="game-head invaders-game-head">
        <b>BULL INVADERS</b>
        <div class="hud invader-head-hud" aria-label="Score, level, lives and mode">
          <div><small>Score</small><b id="invaderScore">0</b></div>
          <div><small>Level</small><b id="invaderLevel">1/19</b></div>
          <div><small>Lives</small><b id="invaderLives">♥♥♥</b></div>
          <div><small>Mode</small><b id="invaderModeHud">RANKED</b></div>
        </div>
        <span id="invaderBossName" hidden>BEAR WAVE</span>
        <div class="game-head-actions">
          <span class="recording-live" id="invaderRecordingLive" hidden aria-live="polite">● REC</span>
          <button id="pauseInvaders" type="button">PAUSE</button>
          <button id="exitInvaders" type="button">EXIT</button>
        </div>
      </div>

      <div class="area" id="invadersArea">
        <div class="game-media-layer" id="invadersMediaLayer">
          <img id="invadersImageBackground" class="game-media" hidden alt=""/>
          <video id="invadersVideoBackground" class="game-media" hidden muted playsinline loop></video>
          <div class="stream-background" id="invadersMediaScene" hidden><div id="invadersMediaPlayerHost"></div></div>
        </div>
        <canvas id="invadersCanvas" aria-label="Bull Invaders game canvas"></canvas>
        <button class="media-sound game-utility-hidden" id="invadersMediaSound" type="button" hidden disabled aria-hidden="true" tabindex="-1">MEDIA</button>
        <div class="media-status game-utility-hidden" id="invadersMediaStatus" hidden aria-hidden="true"></div>
        <div class="invader-action-stack" aria-label="Special weapons and stored powerups">
          <div class="rocket-controls"><button id="invaderRocketButton" class="rocket-button" type="button"><span>🚀</span><b>SPECIAL ROCKET</b><small id="invaderRocketCount">3</small></button></div>
          <div class="power-controls"><button id="invaderPowerSlot" class="power-slot power-slot--empty power-magazine" type="button" disabled><img id="invaderPowerAsset" alt="" hidden width="36" height="36"/><span id="invaderPowerLabel">EMPTY · 0/4</span><span class="power-magazine-cells" id="invaderPowerCells" aria-hidden="true"><i></i><i></i><i></i><i></i></span></button></div>
        </div>
        <div class="touch-hint">HOLD + DRAG TO MOVE · AUTO-FIRE WHILE HELD</div>

        <div class="overlay invader-result-overlay" id="invadersOver" role="dialog" aria-modal="true" aria-labelledby="invadersOverTitle">
          <div class="result-stage">
            <div class="eyebrow" id="invadersOverEyebrow">RUN ENDED</div>
            <h2 id="invadersOverTitle">YOU'RE REKT</h2>
            <div class="result-stat-grid">
              <div class="stat"><small>Score</small><b id="invaderFinalScore">0</b></div>
              <div class="stat"><small>Time</small><b id="invaderFinalTime">0:00</b></div>
              <div class="stat"><small>Grade</small><b id="invaderFinalGrade">D</b></div>
              <div class="stat"><small>Kills</small><b id="invaderFinalKills">0</b></div>
              <div class="stat result-level-stat"><small>Sector</small><b id="invaderFinalLevel">1/19</b></div>
            </div>
            <article class="ship-unlock-stage" id="shipUnlockStage" hidden><span>CRAFT SYNCED</span><img id="shipUnlockImage" alt="Active player craft"/><b id="shipUnlockName"></b><small id="shipUnlockTag"></small></article>
            <article class="epoch-bridge-stage" id="epochBridgeStage" hidden><span id="epochBridgeCode">NEXT EPOCH</span><b id="epochBridgeName"></b><small id="epochBridgeTag"></small><i aria-hidden="true"></i></article>
            <button class="primary result-primary" id="invaderAgain" type="button">RUN IT BACK</button>
            <button class="secondary result-secondary" id="invaderSecondaryAction" type="button" hidden>SKIP TO NEXT EPOCH</button>
            <div class="recording-actions" id="invaderRecordingActions" hidden>
              <button class="primary share-session-button" id="invaderShareSession" type="button">SHARE VIDEO</button>
              <button class="secondary save-session-button" id="invaderSaveSession" type="button">SAVE VIDEO</button>
            </div>
            <p class="recording-result-status" id="invaderRecordingStatus" hidden aria-live="polite"></p>
            <div class="game-over-secondary-row">
              <button class="secondary share-card-button" id="invaderShareCard" type="button">SHARE SCORE</button>
              <button class="secondary listen-button" id="invaderListen" type="button">RETURN</button>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  return root;
}

export function installBullInvadersNavigationBridge({onExit}={}){
  const previous=globalThis.showView;
  globalThis.showView=(view,options={})=>{
    if(view==='invadersGame'){
      document.getElementById('invadersGameView')?.classList.add('active');
      return true;
    }
    if(view==='home'){
      onExit?.(options);
      return true;
    }
    return typeof previous==='function'?previous(view,options):false;
  };
  return ()=>{
    if(globalThis.showView&&previous)globalThis.showView=previous;
  };
}
