// src/ui/Minimap.js
// 2D real-time radar minimap showing island topography, safe zones, player arrow, and bot gunfire blips

export class Minimap {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.size = canvasElement.width; // e.g. 150px
    this.mapWorldRadius = 145; // Match 300m world island
    this.gunfireBlips = []; // { x, z, time, maxTime }
  }

  addGunfireBlip(worldX, worldZ) {
    this.gunfireBlips.push({
      x: worldX,
      z: worldZ,
      time: 2.2,
      maxTime: 2.2
    });
  }

  update(delta, player, safeZone) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radarRadius = w / 2 - 4;

    ctx.clearRect(0, 0, w, h);

    // Save for circular clipping
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radarRadius, 0, Math.PI * 2);
    ctx.clip();

    // 1. Radar Background (Dark tactical ocean)
    ctx.fillStyle = '#0f2438';
    ctx.fillRect(0, 0, w, h);

    // Map scale: convert world coords to minimap coords
    // Map is centered on player
    const scale = (radarRadius * 1.5) / this.mapWorldRadius;
    const px = player ? player.position.x : 0;
    const pz = player ? player.position.z : 0;

    // 2. Island Landmass Outline
    const islandCanvasX = cx - px * scale;
    const islandCanvasY = cy - pz * scale;
    const islandRadiusPx = 135 * scale;

    ctx.beginPath();
    ctx.arc(islandCanvasX, islandCanvasY, islandRadiusPx, 0, Math.PI * 2);
    ctx.fillStyle = '#2f4f2f'; // Green landmass
    ctx.fill();
    ctx.strokeStyle = '#d4b276'; // Sand border
    ctx.lineWidth = 2;
    ctx.stroke();

    // 3. Roads / Landmark indications
    ctx.strokeStyle = '#5c4a32';
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    ctx.moveTo(islandCanvasX - 55 * scale, islandCanvasY - 50 * scale);
    ctx.lineTo(islandCanvasX, islandCanvasY);
    ctx.lineTo(islandCanvasX + 55 * scale, islandCanvasY + 45 * scale);
    ctx.stroke();

    // 4. Safe Zones
    if (safeZone) {
      const zStatus = safeZone.getStatus();

      // Current Shrinking Blue Zone
      const curCenterX = cx + (zStatus.currentCenter.x - px) * scale;
      const curCenterY = cy + (zStatus.currentCenter.y - pz) * scale;
      const curRadiusPx = zStatus.currentRadius * scale;

      ctx.beginPath();
      ctx.arc(curCenterX, curCenterY, curRadiusPx, 0, Math.PI * 2);
      ctx.strokeStyle = '#00bbff';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Target Safe White Circle
      const tarCenterX = cx + (zStatus.targetCenter.x - px) * scale;
      const tarCenterY = cy + (zStatus.targetCenter.y - pz) * scale;
      const tarRadiusPx = zStatus.targetRadius * scale;

      ctx.beginPath();
      ctx.arc(tarCenterX, tarCenterY, tarRadiusPx, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 5. Bot Gunfire Radar Blips
    for (let i = this.gunfireBlips.length - 1; i >= 0; i--) {
      const blip = this.gunfireBlips[i];
      blip.time -= delta;
      if (blip.time <= 0) {
        this.gunfireBlips.splice(i, 1);
        continue;
      }

      const bx = cx + (blip.x - px) * scale;
      const by = cy + (blip.z - pz) * scale;
      const alpha = blip.time / blip.maxTime;

      ctx.beginPath();
      ctx.arc(bx, by, 4 + (1 - alpha) * 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(231, 76, 60, ${alpha})`;
      ctx.fill();
    }

    // 6. Player Heading Arrow (Always at center cx, cy)
    ctx.save();
    ctx.translate(cx, cy);
    if (player) {
      // Rotate by player yaw
      ctx.rotate(-player.yaw + Math.PI);
    }
    // Draw golden arrow
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(6, 7);
    ctx.lineTo(0, 4);
    ctx.lineTo(-6, 7);
    ctx.closePath();
    ctx.fillStyle = '#ffcc00';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    ctx.restore(); // Restore circular clip

    // Radar Outer Border Ring
    ctx.beginPath();
    ctx.arc(cx, cy, radarRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Cardinal Points (N, S, E, W)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', cx, 9);
    ctx.fillText('S', cx, h - 8);
    ctx.fillText('E', w - 8, cy);
    ctx.fillText('W', 8, cy);
  }
}
