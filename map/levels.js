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

// A radial board is a hexagon (radius hexes around a center hex, same
// inBounds mask idea as the Battle board in battle/config.js) with one
// object at its exact middle -- a star with its planets, or a body with its
// moons. Satellites radiate outward in straight rays -- one of 6 directions
// each, walked step-by-step with hexmath's neighbor() -- at a hex distance
// from the center equal to their orbital rank, so distance from center
// still reflects real relative position (closer orbit = closer hex) even
// though the hex grid can't hold true-to-scale AU/km distances.
function radialBoard(radius, centerCell, items) {
  const center = [radius, radius];
  const walk = (dir, steps) => { let p = center; for (let i = 0; i < steps; i++) p = neighbor(p, dir); return p; };
  const cells = [{ ...centerCell, pos: center }];
  items.forEach((item, i) => cells.push({ ...item, pos: walk(i % 6, i + 1) }));
  return { cols: radius * 2 + 1, rows: radius * 2 + 1, center, radius, cells };
}

export const SYSTEMS = {
  sol: {
    title: "Sol System",
    hs: 24,
    ...radialBoard(9, { id: "sun", label: "Sun", kind: "star" }, [
      { id: "mercury", label: "Mercury", kind: "planet", enter: { level: "body", systemId: "sol", bodyId: "mercury" } },
      { id: "venus",   label: "Venus",   kind: "planet", enter: { level: "body", systemId: "sol", bodyId: "venus" } },
      { id: "earth",   label: "Earth",   kind: "planet", enter: { level: "body", systemId: "sol", bodyId: "earth" } },
      { id: "mars",    label: "Mars",    kind: "planet", enter: { level: "body", systemId: "sol", bodyId: "mars" } },
      { id: "belt",    label: "Asteroid Belt", kind: "belt" },
      { id: "jupiter", label: "Jupiter", kind: "planet", enter: { level: "body", systemId: "sol", bodyId: "jupiter" } },
      { id: "saturn",  label: "Saturn",  kind: "planet", enter: { level: "body", systemId: "sol", bodyId: "saturn" } },
      { id: "uranus",  label: "Uranus",  kind: "planet", enter: { level: "body", systemId: "sol", bodyId: "uranus" } },
      { id: "neptune", label: "Neptune", kind: "planet", enter: { level: "body", systemId: "sol", bodyId: "neptune" } },
    ]),
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
  const radius = moons.length + 1; // +1 ring for the Enter Battle hex
  const items = [
    ...moons.map(name => ({ id: name.toLowerCase(), label: name, kind: "moon" })),
    { id: "battle", label: "Enter Battle", kind: "battle-link", href: "battle.html" },
  ];
  return {
    title: label, hs: Math.max(18, 40 - radius * 3),
    ...radialBoard(radius, { id: "body", label, kind: "body-center" }, items),
  };
}

export function bodyLabel(systemId, bodyId) {
  const cell = SYSTEMS[systemId].cells.find(c => c.id === bodyId);
  return cell ? cell.label : bodyId;
}
