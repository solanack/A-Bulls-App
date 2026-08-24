import * as THREE from '../../vendor/three.module.js';

const DEG = Math.PI / 180;
const MAX_RANGE_SQ = 72 * 72;
const PITCH_LIMIT = 88 * DEG;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function wrapAngle(value) {
  return Math.atan2(Math.sin(value), Math.cos(value));
}

/**
 * Mobile aim magnetism for Solana Bang Bang.
 *
 * The target search is intentionally throttled and allocation-free. At most two
 * static-world visibility rays run per scan; the selected actor is then tracked
 * from its existing position object until the next scan. This keeps aim assist
 * below the cost of a normal AI perception update and prevents garbage-collector
 * spikes during a firefight.
 */
export class AimAssist {
  constructor(ctx, player) {
    this.ctx = ctx;
    this.player = player;
    this.target = null;
    this._scanIn = 0;
    this._origin = new THREE.Vector3();
    this._point = new THREE.Vector3();
    this.stats = {
      scans: 0,
      visibilityRays: 0,
      targetChanges: 0,
      active: false,
      targetId: null,
    };
  }

  /** Apply one small camera correction and return the yaw added this frame. */
  update(dt, movement, manualLook = 0) {
    const cfg = this.ctx.config;
    const input = this.ctx.input;
    const engaged =
      cfg.autoAim === true &&
      this.player.controlEnabled &&
      !this.player.health?.dead &&
      (input.ads || input.fire);

    this.stats.active = engaged;
    if (!engaged) {
      this._setTarget(null);
      this._scanIn = 0;
      return 0;
    }

    this._scanIn -= dt;
    if (this._scanIn <= 0 || !this._valid(this.target)) {
      this._scanIn = cfg.mobile ? 0.1 : 0.08;
      this._scan(movement);
    }
    const target = this.target;
    if (!this._valid(target)) return 0;

    const pos = target.position;
    const eye = this.player.eyePosition ?? this.ctx.camera.position;
    const targetY = pos.y + Math.min(1.42, Math.max(0.9, (target.eyeHeight || 1.7) * 0.76));
    const dx = pos.x - eye.x;
    const dy = targetY - eye.y;
    const dz = pos.z - eye.z;
    const horizontal = Math.hypot(dx, dz);
    if (horizontal < 0.01) return 0;

    const yawError = wrapAngle(Math.atan2(-dx, -dz) - movement.yaw);
    const pitchError = Math.atan2(dy, horizontal) - movement.pitch;
    const cone = (input.ads ? 12 : 8) * DEG;
    if (yawError * yawError + pitchError * pitchError > cone * cone * 2.25) {
      this._setTarget(null);
      return 0;
    }

    // Strong enough to help a thumb, never strong enough to snap or fight a
    // deliberate swipe. Manual input fades the correction to 28% at high speed.
    const manualFade = clamp(1 - manualLook / 0.075, 0.28, 1);
    const response = (input.ads ? 8.5 : 5.5) * manualFade;
    const blend = 1 - Math.exp(-Math.max(0, dt) * response);
    const maxStep = (input.ads ? 135 : 95) * DEG * dt;
    const yawStep = clamp(yawError * blend, -maxStep, maxStep);
    const pitchStep = clamp(pitchError * blend, -maxStep * 0.72, maxStep * 0.72);

    movement.yaw = wrapAngle(movement.yaw + yawStep);
    movement.pitch = clamp(movement.pitch + pitchStep, -PITCH_LIMIT, PITCH_LIMIT);
    return yawStep;
  }

  _scan(movement) {
    this.stats.scans++;
    const ai = this.ctx.peek('ai');
    const agents = ai?.agents;
    if (!Array.isArray(agents) || agents.length === 0) {
      this._setTarget(null);
      return;
    }

    const eye = this.player.eyePosition ?? this.ctx.camera.position;
    this._origin.copy(eye);
    const cone = (this.ctx.input.ads ? 12 : 8) * DEG;
    const coneSq = cone * cone;
    let first = null;
    let second = null;
    let firstScore = Infinity;
    let secondScore = Infinity;

    for (let i = 0; i < agents.length; i++) {
      const actor = agents[i];
      if (!this._valid(actor)) continue;
      const pos = actor.position;
      const dx = pos.x - eye.x;
      const dz = pos.z - eye.z;
      const targetY = pos.y + Math.min(1.42, Math.max(0.9, (actor.eyeHeight || 1.7) * 0.76));
      const dy = targetY - eye.y;
      const horizontal = Math.hypot(dx, dz);
      const distanceSq = horizontal * horizontal + dy * dy;
      if (distanceSq < 1 || distanceSq > MAX_RANGE_SQ) continue;

      const yawError = wrapAngle(Math.atan2(-dx, -dz) - movement.yaw);
      const pitchError = Math.atan2(dy, horizontal) - movement.pitch;
      const angleSq = yawError * yawError + pitchError * pitchError;
      if (angleSq > coneSq) continue;
      const score = angleSq + distanceSq * 0.00000075;
      if (score < firstScore) {
        second = first;
        secondScore = firstScore;
        first = actor;
        firstScore = score;
      } else if (score < secondScore) {
        second = actor;
        secondScore = score;
      }
    }

    if (this._visible(first) || this._visible(second)) return;
    this._setTarget(null);
  }

  _visible(actor) {
    if (!this._valid(actor)) return false;
    const physics = this.ctx.peek('physics');
    const pos = actor.position;
    this._point.set(
      pos.x,
      pos.y + Math.min(1.42, Math.max(0.9, (actor.eyeHeight || 1.7) * 0.76)),
      pos.z
    );
    if (physics?.lineOfSight) {
      this.stats.visibilityRays++;
      if (!physics.lineOfSight(this._origin, this._point, physics.MASK?.SIGHT)) return false;
    }
    this._setTarget(actor);
    return true;
  }

  _valid(actor) {
    return !!(actor && actor.alive !== false && actor.friendly !== true && actor.position);
  }

  _setTarget(actor) {
    if (this.target === actor) return;
    this.target = actor;
    this.stats.targetChanges++;
    this.stats.targetId = actor?.id ?? null;
  }

  reset() {
    this._setTarget(null);
    this._scanIn = 0;
    this.stats.active = false;
  }
}
