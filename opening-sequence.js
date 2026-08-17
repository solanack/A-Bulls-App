(function () {
  'use strict';

  const LAST_SECOND_OFFSET = 1;
  const LAST_FRAME_HOLD_MS = 3000;
  const EXIT_FADE_MS = 1300;
  const CARD_HOLD_MS = 1600;
  const VIDEO_FALLBACK_MS = 10000;

  function startOpeningSequence() {
    const sequence = document.getElementById('openingSequence');
    const video = document.getElementById('openingVideo');
    const title = document.getElementById('openingFadeTitle');
    const studio = document.getElementById('openingFadeStudio');
    if (!sequence || !video || !title || !studio) return;

    let holdStarted = false;
    let finished = false;
    let stageTimer = 0;
    let fallbackTimer = 0;

    const finish = () => {
      if (finished) return;
      finished = true;
      sequence.classList.add('is-finished');
      window.setTimeout(() => {
        video.pause();
        sequence.remove();
      }, EXIT_FADE_MS);
    };

    const showStudio = () => {
      if (finished) return;
      sequence.classList.add('is-studio');
      stageTimer = window.setTimeout(finish, EXIT_FADE_MS + CARD_HOLD_MS);
    };

    const showTitle = () => {
      if (finished || sequence.classList.contains('is-title')) return;
      holdStarted = true;
      video.pause();
      window.clearTimeout(fallbackTimer);
      sequence.classList.add('is-title');
      stageTimer = window.setTimeout(showStudio, EXIT_FADE_MS + CARD_HOLD_MS);
    };

    const holdLastSecond = () => {
      if (holdStarted || finished) return;
      holdStarted = true;
      video.pause();
      if (Number.isFinite(video.duration) && video.duration > LAST_SECOND_OFFSET) {
        video.currentTime = Math.max(0, video.duration - LAST_SECOND_OFFSET);
      }
      sequence.classList.add('is-holding');
      window.clearTimeout(fallbackTimer);
      stageTimer = window.setTimeout(showTitle, LAST_FRAME_HOLD_MS);
    };

    video.addEventListener('timeupdate', () => {
      if (Number.isFinite(video.duration) && video.duration > LAST_SECOND_OFFSET && video.currentTime >= video.duration - LAST_SECOND_OFFSET) {
        holdLastSecond();
      }
    });
    video.addEventListener('ended', holdLastSecond, { once: true });
    video.addEventListener('error', showTitle, { once: true });
    fallbackTimer = window.setTimeout(holdLastSecond, VIDEO_FALLBACK_MS);

    const playAttempt = video.play();
    if (playAttempt && typeof playAttempt.catch === 'function') playAttempt.catch(showTitle);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startOpeningSequence, { once: true });
  } else {
    startOpeningSequence();
  }
})();
