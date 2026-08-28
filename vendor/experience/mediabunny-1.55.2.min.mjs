<!DOCTYPE html>
<html lang="en" class="dusk-atelier-direction">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
  <meta name="theme-color" content="#030307"/>
  <meta name="bbrs-build" content="8.8.0-vnext-73"/>
  <title>A Bulls App</title>
  <meta name="description" content="Explore, investigate, replay, compare and turn verified Solana activity into interactive data stories."/>
  <link rel="manifest" href="manifest.webmanifest?v=8.8.0-vnext-73"/>
  <link rel="icon" type="image/png" sizes="192x192" href="assets/icons/icon-192.png"/>
  <link rel="apple-touch-icon" href="assets/icons/icon-192.png"/>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Sora:wght@500;600;700&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="css/styles.css?v=8.8.0-vnext-73"/>
  <link rel="stylesheet" href="css/dusk-atelier.css?v=8.8.0-vnext-73"/>
  <link rel="stylesheet" href="css/product-shell-vnext.css?v=8.8.0-vnext-73"/>
  <link rel="stylesheet" href="css/universe.css?v=8.8.0-vnext-73"/>
  <link rel="stylesheet" href="css/field-shell.css?v=8.8.0-vnext-73"/>
  <link rel="stylesheet" href="css/trickster-studio.css?v=8.8.0-vnext-73"/>
  <link rel="stylesheet" href="css/trickster-simulation.css?v=8.8.0-vnext-73"/>
  <link rel="stylesheet" href="css/intelligence-workspace-vnext.css?v=8.8.0-vnext-73"/>
  <link rel="stylesheet" href="css/intelligence-event-inspector.css?v=8.8.0-vnext-73"/>
  <link rel="stylesheet" href="css/token-market-workspace.css?v=8.8.0-vnext-73"/>
  <link rel="stylesheet" href="css/market-sequence-discovery.css?v=8.8.0-vnext-73"/>
  <link rel="stylesheet" href="css/styles.css?v=8.8.0-vnext-73"/>
</head>
<body class="dusk-atelier-direction">
  <div class="toast" id="vnextToast" hidden role="status" aria-live="polite"></div>
  <script>
    (() => {
      const n = document.getElementById('vnextToast');
      let t = 0;
      window.toast = window.toast || ((m) => {
        if (!n) return;
        n.textContent = String(m || '');
        n.hidden = false;
        n.classList.add('show');
        clearTimeout(t);
        t = setTimeout(() => { n.classList.remove('show'); n.hidden = true; }, 2600);
      });
    })();
  </script>
  <script src="js/config.js?v=8.8.0-vnext-73"></script>
  <script src="js/api-client.js?v=8.8.0-vnext-73"></script>
  <script type="module" src="js/market-context-player-bridge.mjs?v=8.8.0-vnext-73"></script>
  <script type="module" src="js/experience-entry.mjs?v=8.8.0-vnext-73"></script>
  <script src="js/storage.js?v=8.8.0-vnext-73" defer></script>
  <script src="js/core.js?v=8.8.0-vnext-73" defer></script>
  <script src="js/background-manager.js?v=8.8.0-vnext-73" defer></script>
  <script src="js/audio-manager.js?v=8.8.0-vnext-73" defer></script>
  <script src="js/v7-art-system.js?v=8.8.0-vnext-73" defer></script>
  <script src="js/run-recorder.js?v=8.8.0-vnext-73" defer></script>
  <script src="js/share-card.js?v=8.8.0-vnext-73" defer></script>
  <script src="js/leaderboard.js?v=8.8.0-vnext-73" defer></script>
  <script src="js/run-mode.js?v=8.8.0-vnext-73" defer></script>
  <script src="vendor/pixi-8.19.0.min.js?v=8.8.0-vnext-73" defer></script>
  <script src="js/main.js?v=8.8.0-vnext-73" defer></script>
  <script src="js/main.js?v=8.8.0-vnext-73" defer></script>
  <script src="js/main.js?v=8.8.0-vnext-73" defer></script>
</body>
</html>
