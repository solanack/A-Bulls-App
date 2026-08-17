/* Client-only 1200x675 run cards for X. No score or media leaves the browser. */
(function (global) {
  'use strict';

  function rounded(context, x, y, width, height, radius) {
    context.beginPath(); context.roundRect(x, y, width, height, radius); context.fill();
  }
  async function exportCard(summary) {
    const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 675;
    const context = canvas.getContext('2d');
    const background = context.createLinearGradient(0, 0, 1200, 675); background.addColorStop(0, '#020403'); background.addColorStop(.58, '#07170d'); background.addColorStop(1, '#16072b');
    context.fillStyle = background; context.fillRect(0, 0, 1200, 675);
    context.strokeStyle = 'rgba(0,230,118,.16)'; context.lineWidth = 2;
    for (let x = -100; x < 1300; x += 70) { context.beginPath(); context.moveTo(600 + (x - 600) * .25, 300); context.lineTo(x, 675); context.stroke(); }
    context.fillStyle = '#c8ff00'; context.font = '900 34px system-ui, sans-serif'; context.fillText('A BULLS APP', 72, 86);
    context.fillStyle = '#ffffff'; context.font = '900 68px system-ui, sans-serif'; context.fillText(summary.title || 'RUN COMPLETE', 72, 184);
    const stats = summary.stats || [];
    stats.slice(0, 3).forEach((entry, index) => {
      const x = 72 + index * 348; context.fillStyle = 'rgba(0,0,0,.55)'; rounded(context, x, 245, 315, 190, 24);
      context.strokeStyle = 'rgba(0,230,118,.42)'; context.strokeRect(x, 245, 315, 190);
      context.fillStyle = '#7da98c'; context.font = '800 25px system-ui, sans-serif'; context.fillText(String(entry.label).toUpperCase(), x + 28, 300);
      context.fillStyle = index === 0 ? '#c8ff00' : '#62ffad'; context.font = '900 62px system-ui, sans-serif'; context.fillText(String(entry.value), x + 28, 385);
    });
    context.fillStyle = '#9bb8a5'; context.font = '700 24px system-ui, sans-serif'; context.fillText(summary.footer || 'KEEP SHOWING UP.', 72, 570);
    context.fillStyle = '#00e676'; context.fillRect(72, 610, 1056, 5);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Share card export failed');
    const fileName = `a-bulls-app-${String(summary.game || 'run').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${Date.now()}.png`;
    const file = new File([blob], fileName, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: summary.title || 'A Bulls App' });
    else {
      const url = URL.createObjectURL(blob), anchor = document.createElement('a'); anchor.href = url; anchor.download = fileName; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 3000);
    }
    return fileName;
  }
  global.BBRShareCard = { export: exportCard };
})(window);
