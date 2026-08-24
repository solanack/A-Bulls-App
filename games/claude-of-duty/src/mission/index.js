/**
 * Mission — maze objective, 20-hostiles + commander, and world pickups.
 *
 * Drops use the existing weapon/health APIs:
 *   weapons.addReserve / weapons.grantWeapon
 *   player.heal
 */
import * as THREE from '../../vendor/three.module.js';

const PICK_RADIUS = 1.55;
const DROP_KINDS = ['ammo', 'ammo', 'health', 'weapon'];
const WEAPON_DROPS = ['rifle', 'smg', 'pistol'];
const GRENADE_FUSE = 2.35;
const MAX_GRENADES = 9;

export class MissionSystem {
  static id = 'mission';
  static deps = ['world', 'physics', 'ai', 'player', 'weapons', 'ui'];

  async init(ctx) {
    this.ctx = ctx;
    this.physics = ctx.get('physics');
    this.root = new THREE.Group();
    this.root.name = 'mission';
    ctx.scene.add(this.root);

    this.pickups = [];
    this.kills = 0;
    this.gruntTarget = 20;
    this.bossDead = false;
    this.won = false;
    this.failed = false;
    this._tmp = new THREE.Vector3();
    this._forward = new THREE.Vector3();
    this._bob = 0;
    this.grenadeCount = 1;
    this.thrownGrenades = [];
    this._grenadeCooldown = 0;

    this._geo = {
      ammo: new THREE.BoxGeometry(0.28, 0.16, 0.42),
      health: new THREE.BoxGeometry(0.32, 0.22, 0.32),
      weapon: new THREE.BoxGeometry(0.12, 0.12, 0.62),
      grenade: new THREE.IcosahedronGeometry(0.13, 1),
    };
    this._mat = {
      ammo: new THREE.MeshStandardMaterial({
        color: 0xc4a35a, roughness: 0.38, metalness: 0.62, emissive: 0x3a2a08, emissiveIntensity: 0.55,
      }),
      health: new THREE.MeshStandardMaterial({
        color: 0xc43c2a, roughness: 0.45, metalness: 0.12, emissive: 0x5b130f, emissiveIntensity: 0.7,
      }),
      weapon: new THREE.MeshStandardMaterial({
        color: 0x8a93a0, roughness: 0.32, metalness: 0.72, emissive: 0x1c242c, emissiveIntensity: 0.4,
      }),
      grenade: new THREE.MeshStandardMaterial({
        color: 0x66733d, roughness: 0.56, metalness: 0.72, emissive: 0x172009, emissiveIntensity: 0.32,
      }),
    };

    this._buildHud();
    this._off = [];
    this._off.push(ctx.events.on('actor:death', (e) => this._onDeath(e)));
    this._off.push(ctx.events.on('player:death', () => this._onPlayerDeath()));

    const world = ctx.get('world');
    this.extract = world.extractPoint ?? world.spawnPoints?.[world.spawnPoints.length - 1]?.position ?? null;

    const ui = ctx.peek('ui');
    ui?.banner?.show?.('COMPOUND SWEEP', '20 HOSTILES  ·  COMMANDER AT THE GATE');
    ui?.setObjectives?.([
      {
        position: this.extract ?? new THREE.Vector3(0, 1, -20),
        label: 'CMD',
        name: 'COMMANDER',
      },
    ]);

    this._setStatus('Clear the maze. 20 hostiles, then the commander.');
    this._setGrenadeCount(1);
  }

  _buildHud() {
    this.hud = document.createElement('div');
    this.hud.className = 'cod-mission';
    this.hud.style.cssText =
      'position:absolute;left:50%;top:max(10px,env(safe-area-inset-top));transform:translateX(-50%);z-index:40;pointer-events:none;text-align:center;font:700 11px/1.35 Trebuchet MS,Arial,sans-serif;letter-spacing:.14em;color:#e8eef4;text-shadow:0 1px 8px #000';
    this.hud.innerHTML =
      '<div class="cod-mission-kicker" style="opacity:.7">A BULLS APP // FIELD OPS</div>' +
      '<div class="cod-mission-title" style="font-size:13px;margin-top:4px">COMPOUND SWEEP</div>' +
      '<div class="cod-mission-status" style="margin-top:6px;color:#c8d0d8;letter-spacing:.1em">20 HOSTILES REMAINING</div>';
    const host = document.getElementById('ui') ?? document.body;
    host.appendChild(this.hud);
    this._statusEl = this.hud.querySelector('.cod-mission-status');
  }

  _setStatus(text) {
    if (this._statusEl) this._statusEl.textContent = text.toUpperCase();
  }

  _onDeath(e) {
    const actor = e?.actor;
    if (!actor || actor.isPlayer) return;
    const pos = actor.position?.clone?.() ?? this._tmp.set(0, 0, 0).clone();
    pos.y += 0.35;

    if (actor.boss) {
      this.bossDead = true;
      this._spawnDrop(pos, 'health');
      this._spawnDrop(pos.clone().add(new THREE.Vector3(0.6, 0, 0.2)), 'ammo');
      this._spawnDrop(pos.clone().add(new THREE.Vector3(-0.5, 0, 0.3)), 'weapon');
      this._spawnDrop(pos.clone().add(new THREE.Vector3(0.2, 0, -0.55)), 'grenade');
      this.ctx.peek('ui')?.banner?.show?.('COMMANDER DOWN', 'REACH THE GATE TO EXTRACT');
      this._setStatus('Commander down. Reach the extraction gate.');
      return;
    }

    this.kills = Math.min(this.gruntTarget, this.kills + 1);
    const remain = Math.max(0, this.gruntTarget - this.kills);
    this._setStatus(remain ? `${remain} hostiles remaining` : 'Commander is holding the gate');
    if (remain === 0) {
      this.ctx.peek('ui')?.banner?.show?.('SECTOR CLEAR', 'PUSH TO THE COMMANDER');
    }

    const kind = this._rollDrop(actor);
    this._spawnDrop(pos, kind, actor);
    this._spawnDrop(pos.clone().add(new THREE.Vector3(0.32, 0, -0.28)), 'grenade', actor);
  }

  _rollDrop(actor) {
    if (actor?.dropKind) return actor.dropKind;
    const i = (this.kills + (actor?.id ?? 0)) % DROP_KINDS.length;
    return DROP_KINDS[i];
  }

  _spawnDrop(position, kind, actor) {
    let weaponId = null;
    if (kind === 'weapon') {
      const wp = this.ctx.peek('weapons');
      const owned = wp?.ownedIds?.() ?? ['pistol'];
      weaponId = WEAPON_DROPS.find((id) => !owned.includes(id)) ?? WEAPON_DROPS[(actor?.id ?? 0) % WEAPON_DROPS.length];
    }
    const mesh = new THREE.Mesh(this._geo[kind] ?? this._geo.ammo, this._mat[kind] ?? this._mat.ammo);
    mesh.castShadow = true;
    mesh.position.copy(position);
    mesh.position.y = (position.y || 0) + 0.55;
    this.root.add(mesh);
    const label = kind === 'weapon'
      ? (weaponId === 'rifle' ? 'M4A1' : weaponId === 'smg' ? 'MPX-9' : 'P-19')
      : kind === 'grenade' ? 'FRAG' : kind;
    this.pickups.push({
      kind,
      weaponId,
      mesh,
      alive: true,
      y0: mesh.position.y,
      label,
    });
  }

  _collect(p, player, weapons, ui) {
    if (p.kind === 'grenade' && this.grenadeCount >= MAX_GRENADES) return;
    p.alive = false;
    p.mesh.visible = false;
    if (p.kind === 'ammo') {
      const n = weapons?.addReserve?.(28) ?? 0;
      ui?.banner?.show?.('AMMO', `+${n || 28} RESERVE`);
    } else if (p.kind === 'health') {
      player?.heal?.(40);
      ui?.banner?.show?.('STIMS', '+40 HEALTH');
    } else if (p.kind === 'weapon' && p.weaponId) {
      weapons?.grantWeapon?.(p.weaponId);
      const label = weapons?.states?.get?.(p.weaponId)?.def?.label ?? p.label;
      ui?.banner?.show?.(String(label).toUpperCase(), 'WEAPON ACQUIRED');
    } else if (p.kind === 'grenade') {
      this._setGrenadeCount(this.grenadeCount + 1);
      ui?.banner?.show?.('FRAG GRENADE', `LETHAL ×${this.grenadeCount}`);
    }
  }

  _setGrenadeCount(count) {
    this.grenadeCount = Math.max(0, Math.min(MAX_GRENADES, Number(count) || 0));
    this.ctx.peek('weapons')?.setLethalCount?.(this.grenadeCount);
    this.ctx.events.emit('grenade:inventory', { count: this.grenadeCount, max: MAX_GRENADES });
  }

  _throwGrenade(player) {
    if (!player || player.health?.dead || this.grenadeCount <= 0 || this._grenadeCooldown > 0) return false;
    const camera = this.ctx.camera;
    this._forward.set(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
    const from = camera.position.clone().addScaledVector(this._forward, 0.7);
    from.y -= 0.18;
    const velocity = this._forward.clone().multiplyScalar(13);
    velocity.y += 5.4;
    const mesh = new THREE.Mesh(this._geo.grenade, this._mat.grenade);
    mesh.scale.setScalar(0.58);
    mesh.position.copy(from);
    mesh.castShadow = true;
    this.root.add(mesh);
    const body = this.physics.addRigidBody({
      shape: 'sphere',
      radius: 0.075,
      mass: 0.42,
      position: from,
      velocity,
      restitution: 0.32,
      friction: 0.72,
      lifetime: 8,
      object3D: mesh,
      surfaceType: 'metal',
    });
    this.thrownGrenades.push({ body, mesh, fuse: GRENADE_FUSE, source: player });
    this._grenadeCooldown = 0.35;
    this._setGrenadeCount(this.grenadeCount - 1);
    return true;
  }

  _updateThrownGrenades(dt) {
    for (let i = this.thrownGrenades.length - 1; i >= 0; i--) {
      const grenade = this.thrownGrenades[i];
      grenade.fuse -= dt;
      if (grenade.fuse > 0) continue;
      const p = grenade.body?.position ?? grenade.mesh.position;
      this.ctx.events.emit('explosion', {
        position: new THREE.Vector3(p.x, p.y, p.z),
        radius: 6.5,
        damage: 150,
        source: grenade.source,
      });
      this.physics.removeRigidBody(grenade.body);
      this.root.remove(grenade.mesh);
      this.thrownGrenades.splice(i, 1);
    }
  }

  _onPlayerDeath() {
    if (this.won || this.failed) return;
    this.failed = true;
    this._setStatus('Downed — hold RESTART');
    this._showEnd('KIA', 'The maze still holds. Restart to sweep again.', true);
  }

  _showEnd(title, sub, restart) {
    if (this.end) return;
    this.end = document.createElement('div');
    this.end.style.cssText =
      'position:absolute;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 40%,#1a2734cc,#070b10f0 70%);pointer-events:auto;text-align:center;padding:24px';
    this.end.innerHTML = `<div style="max-width:340px">
      <div style="letter-spacing:.22em;color:#9aa8b4;font:700 11px Trebuchet MS,Arial">A BULLS APP // FIELD OPS</div>
      <h2 style="margin:14px 0 8px;font:900 42px/0.9 Trebuchet MS,Arial;color:#fff">${title}</h2>
      <p style="color:#c5d1db;font:600 13px/1.5 Trebuchet MS,Arial">${sub}</p>
      ${restart ? '<button type="button" class="cod-restart" style="margin-top:22px;border:1px solid #fff;background:#e9f4ff;color:#071018;padding:14px 28px;font:800 13px Trebuchet MS,Arial;letter-spacing:.16em">RESTART</button>' : ''}
    </div>`;
    (document.getElementById('ui') ?? document.body).appendChild(this.end);
    this.end.querySelector('.cod-restart')?.addEventListener('click', () => location.reload());
  }

  update(dt, ctx) {
    this._bob += dt;
    const player = ctx.peek('player');
    const weapons = ctx.peek('weapons');
    const ui = ctx.peek('ui');
    this._grenadeCooldown = Math.max(0, this._grenadeCooldown - dt);
    if (ctx.input.actionPressed('grenade')) this._throwGrenade(player);
    this._updateThrownGrenades(dt);
    const pos = player?.position;
    if (!pos) return;

    for (const p of this.pickups) {
      if (!p.alive) continue;
      p.mesh.position.y = p.y0 + Math.sin(this._bob * 2.4 + p.mesh.id) * 0.08;
      p.mesh.rotation.y += dt * 1.4;
      const d = Math.hypot(p.mesh.position.x - pos.x, p.mesh.position.z - pos.z);
      if (d < PICK_RADIUS) this._collect(p, player, weapons, ui);
    }

    if (!this.won && this.bossDead && this.extract) {
      const d = Math.hypot(this.extract.x - pos.x, this.extract.z - pos.z);
      if (d < 2.8) {
        this.won = true;
        this._setStatus('Extracted. Compound swept.');
        this._showEnd('EXTRACTED', '20 hostiles down. Commander down. The maze is yours.', true);
      }
    }
  }

  dispose() {
    for (const u of this._off ?? []) u?.();
    this.hud?.remove();
    this.end?.remove();
    this.root?.parent?.remove(this.root);
    for (const grenade of this.thrownGrenades) this.physics?.removeRigidBody?.(grenade.body);
    this.thrownGrenades.length = 0;
    for (const g of Object.values(this._geo)) g.dispose();
    for (const m of Object.values(this._mat)) m.dispose();
  }
}
