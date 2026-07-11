// Data for the three strategic zoom levels. Battle (the fourth level) is
// battle.html/battle/* unchanged -- CelestialBody hexes link out to it.
//
// This is a test fixture, not real astronomy: Sol is the only system in the
// universe for now, and we only have moon data for the bodies with notable
// moons -- others just get an empty ring around them.

import { neighbor } from "../battle/hexmath.js";

export const UNIVERSE = {
  title: "Universe",
  cols: 7, rows: 7, hs: 34,
  cells: [
    { id: "sol", pos: [3, 3], label: "Sol", kind: "system", enter: { level: "system", systemId: "sol" } },
  ],
};

// Relative body sizes, in hex-blob radius (0 = a single hex). Not to
// scale -- just per spec: Mars/Mercury radius 0, Earth/Venus radius 3,
// Uranus/Neptune radius 2, Jupiter/Saturn radius 3, Sun radius 4.
export const SIZE = {
  sun: 4, mercury: 0, venus: 3, earth: 3, mars: 0, belt: 0,
  jupiter: 3, saturn: 3, uranus: 2, neptune: 2,
};

// A radial board is a hexagon (same inBounds hex-radius mask idea as the
// Battle board in battle/config.js) with one object -- a star or a body --
// at its exact middle, and satellites radiating outward from it: each one
// walks straight out in one of 6 directions (round-robin, via hexmath's
// neighbor()) far enough that its own hex-blob (cell.size, a hexDist<=size
// disc, not just a single hex) never touches the previous blob on the same
// ray, the center's blob, or its own gap. Board radius is derived from
// wherever that packing ends up, not fixed up front.
function radialBoard(centerCell, items, gap = 1) {
  const centerRadius = centerCell.size || 0;
  const frontier = {}; // dir -> outer edge (hex distance from center) claimed so far
  const placements = items.map((item, i) => {
    const dir = i % 6, r = item.size || 0;
    const dist = (frontier[dir] ?? centerRadius) + r + gap;
    frontier[dir] = dist + r;
    return { item, dir, dist };
  });
  const radius = Math.max(centerRadius, ...Object.values(frontier), 0);
  const center = [radius, radius];
  const walk = (dir, steps) => { let p = center; for (let i = 0; i < steps; i++) p = neighbor(p, dir); return p; };
  const cells = [{ ...centerCell, pos: center }];
  for (const { item, dir, dist } of placements) cells.push({ ...item, pos: walk(dir, dist) });
  return { cols: radius * 2 + 1, rows: radius * 2 + 1, center, radius, cells };
}

const hsForRadius = radius => Math.max(16, Math.round(216 / radius));

export const SYSTEMS = {
  sol: {
    title: "Sol System",
    ...(() => {
      const board = radialBoard({ id: "sun", label: "Sun", kind: "star", size: SIZE.sun }, [
        { id: "mercury", label: "Mercury", kind: "planet", size: SIZE.mercury, enter: { level: "body", systemId: "sol", bodyId: "mercury" } },
        { id: "venus",   label: "Venus",   kind: "planet", size: SIZE.venus,   enter: { level: "body", systemId: "sol", bodyId: "venus" } },
        { id: "earth",   label: "Earth",   kind: "planet", size: SIZE.earth,   enter: { level: "body", systemId: "sol", bodyId: "earth" } },
        { id: "mars",    label: "Mars",    kind: "planet", size: SIZE.mars,    enter: { level: "body", systemId: "sol", bodyId: "mars" } },
        { id: "belt",    label: "Asteroid Belt", kind: "belt", size: SIZE.belt },
        { id: "jupiter", label: "Jupiter", kind: "planet", size: SIZE.jupiter, enter: { level: "body", systemId: "sol", bodyId: "jupiter" } },
        { id: "saturn",  label: "Saturn",  kind: "planet", size: SIZE.saturn,  enter: { level: "body", systemId: "sol", bodyId: "saturn" } },
        { id: "uranus",  label: "Uranus",  kind: "planet", size: SIZE.uranus,  enter: { level: "body", systemId: "sol", bodyId: "uranus" } },
        { id: "neptune", label: "Neptune", kind: "planet", size: SIZE.neptune, enter: { level: "body", systemId: "sol", bodyId: "neptune" } },
      ]);
      return { ...board, hs: hsForRadius(board.radius) };
    })(),
  },
};

// Only the bodies with well-known moons get any -- everyone else just has
// an empty ring around them (still hexagonal, still centered on the body).
const MOONS = {
  earth:   ["Moon"],
  mars:    ["Phobos", "Deimos"],
  jupiter: ["Io", "Europa", "Ganymede", "Callisto"],
  saturn:  ["Titan", "Rhea", "Iapetus", "Dione", "Tethys"],
  uranus:  ["Titania", "Oberon", "Miranda", "Ariel", "Umbriel"],
  neptune: ["Triton"],
};

export function celestialBodyLevel(systemId, bodyId) {
  const label = bodyLabel(systemId, bodyId);
  const moons = MOONS[bodyId] || [];
  const items = [
    ...moons.map(name => ({ id: name.toLowerCase(), label: name, kind: "moon" })),
    { id: "battle", label: "Enter Battle", kind: "battle-link", href: "battle.html" },
  ];
  const board = radialBoard({ id: "body", label, kind: "body-center", size: SIZE[bodyId] || 0 }, items);
  return { title: label, hs: hsForRadius(board.radius), ...board };
}

export function bodyLabel(systemId, bodyId) {
  const cell = SYSTEMS[systemId].cells.find(c => c.id === bodyId);
  return cell ? cell.label : bodyId;
}
