/**
 * Compound maze — playable level layout.
 *
 * Hand-authored so the path, dead-ends, start, and boss arena stay readable.
 * `#` wall  `.` corridor  `S` start  `B` boss  `x` dead-end  `C` cover cell
 *
 * Cell size is metres. Walls are solid blocks with plaster skins, a concrete
 * cap, a baseboard, and corner pillars so corridors read as a real compound
 * instead of a grid of untextured boxes.
 */
import * as THREE from '../../vendor/three.module.js';

export const CELL = 4.2;
export const WALL_H = 3.55;
export const CAP_H = 0.22;
export const TRIM_H = 0.28;

export const MAZE_MAP = [
  '#########################',
  '#BBB....................#',
  '#BBB..#####..#####..#x.##',
  '#BBB..#...#..#...#..#..##',
  '#######.#.#..#.#.#..##.##',
  '#x......#.#..#.#.#.....##',
  '#.#######.#..#.#.#####.##',
  '#.#.....#.#..#.#.....#.##',
  '#.#.###.#.##.#.#####.#.##',
  '#.#.#...#....#.....#.#.##',
  '#.#.#.##############.#.##',
  '#.#.#................#.##',
  '#.#.##################.##',
  '#.#.....................#',
  '#.#####################.#',
  '#.#x..................#.#',
  '#.###################.#.#',
  '#.....................#.#',
  '#####################.#.#',
  '#x....................#.#',
  '#.###################.#.#',
  '#S....................#.#',
  '#########################',
];

const WALL_KEYS = ['plaster_cream', 'plaster_sand', 'plaster_blue', 'plaster_pink', 'brick'];

function hash(x, z) {
  let h = (x * 374761393 + z * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return (h >>> 0) / 4294967296;
}

export function mazeSize() {
  const rows = MAZE_MAP.length;
  const cols = MAZE_MAP[0].length;
  return {
    rows,
    cols,
    width: cols * CELL,
    depth: rows * CELL,
    originX: -((cols - 1) * CELL) * 0.5,
    originZ: -((rows - 1) * CELL) * 0.5,
  };
}

export function cellWorld(c, r, size = mazeSize()) {
  return {
    x: size.originX + c * CELL,
    z: size.originZ + r * CELL,
  };
}

export function parseMaze() {
  const size = mazeSize();
  const walls = [];
  const open = [];
  const deadEnds = [];
  const cover = [];
  let start = null;
  let bossCells = [];

  for (let r = 0; r < size.rows; r++) {
    const row = MAZE_MAP[r];
    for (let c = 0; c < size.cols; c++) {
      const ch = row[c];
      const { x, z } = cellWorld(c, r, size);
      if (ch === '#') {
        walls.push({ c, r, x, z });
        continue;
      }
      const cell = { c, r, x, z, ch };
      open.push(cell);
      if (ch === 'S') start = { ...cell, yaw: 0 };
      if (ch === 'B') bossCells.push(cell);
      if (ch === 'x') deadEnds.push(cell);
      if (ch === 'C') cover.push(cell);
    }
  }

  const boss =
    bossCells.length > 0
      ? {
          x: bossCells.reduce((s, p) => s + p.x, 0) / bossCells.length,
          z: bossCells.reduce((s, p) => s + p.z, 0) / bossCells.length,
          yaw: 0,
          cells: bossCells,
        }
      : open[0];

  const enemySpots = open.filter((p) => {
    if (p.ch === 'S' || p.ch === 'B') return false;
    if (!start) return true;
    const d = Math.hypot(p.x - start.x, p.z - start.z);
    return d > 10;
  });

  return { size, walls, open, deadEnds, cover, start, boss, enemySpots };
}

/**
 * Build the maze into the Assembler. Cheap enough for mobile, detailed enough
 * to read as a sunlit compound: plaster walls, concrete caps, floor slabs,
 * sand skirts, lamps, and cover.
 */
export function buildMaze(A, rng) {
  const parsed = parseMaze();
  const { size, walls, open, deadEnds, start, boss } = parsed;
  const box = A.cache('maze-box', () => new THREE.BoxGeometry(1, 1, 1));
  const slab = A.cache('maze-slab', () => new THREE.BoxGeometry(1, 1, 1));

  const groundW = size.width + 28;
  const groundD = size.depth + 28;
  A.addBox('sand', box, 0, -0.22, 0, 0, groundW, 0.18, groundD);
  A.box('dirt', 0, -0.22, 0, groundW, 0.18, groundD);

  for (const cell of open) {
    const h = 0.09 + hash(cell.c, cell.r) * 0.04;
    const key = cell.ch === 'B' ? 'concrete' : hash(cell.c + 3, cell.r) > 0.55 ? 'asphalt' : 'concrete';
    A.addBox(key, slab, cell.x, h * 0.5, cell.z, 0, CELL * 0.98, h, CELL * 0.98);
    A.box('concrete', cell.x, 0.02, cell.z, CELL * 0.96, 0.08, CELL * 0.96);
  }

  for (const w of walls) {
    const key = WALL_KEYS[(hash(w.c, w.r) * WALL_KEYS.length) | 0];
    const h = WALL_H + (hash(w.c, w.r + 9) - 0.5) * 0.35;
    A.addBox(key, box, w.x, h * 0.5, w.z, 0, CELL * 0.98, h, CELL * 0.98);
    A.box('concrete', w.x, h * 0.5, w.z, CELL * 0.96, h, CELL * 0.96);

    A.addBox('concrete', box, w.x, h + CAP_H * 0.5, w.z, 0, CELL * 1.04, CAP_H, CELL * 1.04);
    A.addBox('concrete_dark', box, w.x, TRIM_H * 0.5, w.z, 0, CELL * 1.02, TRIM_H, CELL * 1.02);

    if (hash(w.c * 2, w.r * 3) > 0.72) {
      const inset = CELL * 0.22;
      A.addBox('brick_fine', box, w.x, h * 0.42, w.z, 0, CELL * 0.55, h * 0.55, inset);
    }
  }

  // Perimeter berm so you cannot walk off the compound.
  const halfW = size.width * 0.5 + 6;
  const halfD = size.depth * 0.5 + 6;
  const bermH = 5.4;
  A.addBox('brick', box, 0, bermH * 0.5, -halfD, 0, size.width + 16, bermH, 1.4);
  A.addBox('brick', box, 0, bermH * 0.5, halfD, 0, size.width + 16, bermH, 1.4);
  A.addBox('brick', box, -halfW, bermH * 0.5, 0, 0, 1.4, bermH, size.depth + 16);
  A.addBox('brick', box, halfW, bermH * 0.5, 0, 0, 1.4, bermH, size.depth + 16);
  A.box('concrete', 0, bermH * 0.5, -halfD, size.width + 16, bermH, 1.4);
  A.box('concrete', 0, bermH * 0.5, halfD, size.width + 16, bermH, 1.4);
  A.box('concrete', -halfW, bermH * 0.5, 0, 1.4, bermH, size.depth + 16);
  A.box('concrete', halfW, bermH * 0.5, 0, 1.4, bermH, size.depth + 16);

  // Cover: low concrete blocks and crates in corridors (not blocking the path).
  const coverCells = open.filter((p) => p.ch === '.' && hash(p.c, p.r) > 0.78);
  for (const p of coverCells.slice(0, 18)) {
    const sx = 1.15 + hash(p.c, p.r) * 0.5;
    const sz = 0.55 + hash(p.c + 1, p.r) * 0.4;
    const sy = 0.85 + hash(p.c, p.r + 2) * 0.35;
    const ox = (hash(p.c + 4, p.r) - 0.5) * 1.4;
    const oz = (hash(p.c, p.r + 7) - 0.5) * 1.4;
    A.addBox('concrete_prop', box, p.x + ox, sy * 0.5, p.z + oz, 0, sx, sy, sz);
    A.box('concrete', p.x + ox, sy * 0.5, p.z + oz, sx, sy, sz);
  }

  // Dead-end rubble piles.
  for (const p of deadEnds) {
    A.addBox('dirt', box, p.x, 0.18, p.z, 0, 1.8, 0.36, 1.8);
    A.addBox('concrete_dark', box, p.x + 0.4, 0.28, p.z - 0.3, 0.2, 0.7, 0.56, 0.5);
  }

  // Lamps at a subset of open cells so corridors have a practical.
  parsed.lamps = [];
  for (const p of open) {
    if (hash(p.c + 11, p.r + 5) < 0.88) continue;
    const lx = p.x + CELL * 0.38;
    const lz = p.z + CELL * 0.38;
    A.addBox('metal_dark', box, lx, 2.15, lz, 0, 0.08, 4.3, 0.08);
    A.addBox('emissive_warm', box, lx, 4.28, lz, 0, 0.22, 0.12, 0.22);
    parsed.lamps.push({ x: lx, y: 4.2, z: lz });
    A.lampAnchors.push({ x: lx, y: 4.2, z: lz });
  }

  // Start gate — a short arch so the spawn reads as an entrance.
  if (start) {
    A.addBox('concrete', box, start.x - 1.7, 2.4, start.z + 2.1, 0, 0.45, 4.8, 0.45);
    A.addBox('concrete', box, start.x + 1.7, 2.4, start.z + 2.1, 0, 0.45, 4.8, 0.45);
    A.addBox('concrete', box, start.x, 4.55, start.z + 2.1, 0, 3.9, 0.4, 0.45);
    A.box('concrete', start.x - 1.7, 2.4, start.z + 2.1, 0.45, 4.8, 0.45);
    A.box('concrete', start.x + 1.7, 2.4, start.z + 2.1, 0.45, 4.8, 0.45);
  }

  // Boss arena ring — raised floor + sandbags.
  if (boss) {
    A.addBox('concrete', box, boss.x, 0.08, boss.z, 0, CELL * 2.6, 0.16, CELL * 2.2);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const rx = boss.x + Math.cos(a) * 4.6;
      const rz = boss.z + Math.sin(a) * 3.4;
      A.addBox('concrete_prop', box, rx, 0.42, rz, a, 1.4, 0.84, 0.5);
      A.box('concrete', rx, 0.42, rz, 1.4, 0.84, 0.5);
    }
  }

  parsed.extract = boss
    ? { x: boss.x, z: boss.z - CELL * 0.2, y: 0.2 }
    : start;

  void rng;
  return parsed;
}
