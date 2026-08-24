/* A Bulls App — shared game platform services */
(function (global) {
  'use strict';

  class GameRegistry {
    constructor() { this.games = new Map(); this.activeId = null; }
    register(definition) {
      if (!definition || !definition.id || typeof definition.start !== 'function') {
        throw new Error('A game requires an id and start() method');
      }
      this.games.set(definition.id, Object.freeze({ ...definition }));
      return definition;
    }
    get(id) { return this.games.get(id) || null; }
    async start(id) {
      const game = this.get(id);
      if (!game) throw new Error('Unknown game: ' + id);
      if (this.activeId && this.activeId !== id) await this.stop(this.activeId);
      this.activeId = id;
      await game.start();
    }
    async pause() {
      const game = this.get(this.activeId);
      if (game?.pause) await game.pause();
    }
    async stop(id = this.activeId) {
      const game = this.get(id);
      if (game?.stop) await game.stop();
      if (this.activeId === id) this.activeId = null;
    }
    list() { return [...this.games.values()]; }
  }

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');

  const Platform = {
    version: '8.6.1',
    workerRequired: '8.1.1',
    buildStamp() {
      return `PAGES ${this.version} • WORKER ${this.workerRequired}`;
    },
    games: new GameRegistry(),
    escapeHtml,
    activeGame: null,
    async launch(id) {
      const game = this.games.get(id);
      if (!game) throw new Error('Game is not installed');
      this.activeGame = id;
      const mediaTarget = 'invaders';
      if (global.BackgroundManager && typeof profile !== 'undefined') {
        global.BackgroundManager.armFromGesture?.(profile, mediaTarget);
      }
      if (global.AudioManager) {
        await global.AudioManager.unlock();
        global.AudioManager.prewarm?.();
        global.AudioManager.sfx.start();
        global.AudioManager.startMusic();
      }
      await this.games.start(id);
      document.dispatchEvent(new CustomEvent('bbrs:game-start', { detail: { id } }));
    },
    async leaveGame(id = this.activeGame) {
      await this.games.stop(id);
      this.activeGame = null;
      global.BackgroundManager?.onRunEnd();
      global.AudioManager?.stopMusic();
      document.dispatchEvent(new CustomEvent('bbrs:game-stop', { detail: { id } }));
    },
    addRun(gameId, run) {
      profile.gameRuns = profile.gameRuns || {};
      profile.gameRuns[gameId] = profile.gameRuns[gameId] || [];
      profile.gameRuns[gameId].push(run);
      profile.gameRuns[gameId] = profile.gameRuns[gameId].slice(-300);
      save();
    },
    stats(gameId) {
      const runs = profile.gameRuns?.[gameId] || [];
      return {
        runs: runs.length,
        best: Math.max(0, ...runs.map(r => Number(r.score ?? r.distance ?? 0))),
        total: runs.reduce((sum, r) => sum + Number(r.score ?? r.distance ?? 0), 0)
      };
    }
  };

  global.GameRegistry = GameRegistry;
  global.BBRPlatform = Platform;
})(window);
