import * as T from 'three';
import { buildingMetrics, groundMetrics, logisticsMetrics, materials, phaseAt, type Project } from './project';
export type ViewMode = 'project' | 'phases' | 'site' | 'ground' | 'issues';
export type SceneOptions = { mode: ViewMode; roof: boolean; baseline: boolean; selected?: string; dark: boolean };
const green = '#527661', orange = '#da8e40';
function mat(color: string, opacity = 1) { return new T.MeshStandardMaterial({ color, roughness: .83, transparent: opacity < 1, opacity, depthWrite: opacity === 1 }); }
function box(g: T.Group, size: [number, number, number], pos: [number, number, number], color: string, opacity = 1) {
  const m = new T.Mesh(new T.BoxGeometry(...size), mat(color, opacity)); m.position.set(...pos); m.castShadow = opacity === 1; m.receiveShadow = true; g.add(m); return m;
}
function line(g: T.Group, points: T.Vector3[], color: string, closed = false) {
  const geometry = new T.BufferGeometry().setFromPoints(points);
  const l = closed ? new T.LineLoop(geometry, new T.LineBasicMaterial({ color })) : new T.Line(geometry, new T.LineBasicMaterial({ color })); g.add(l); return l;
}
function cylinderBetween(g: T.Group, a: T.Vector3, b: T.Vector3, radius: number, color: string) {
  const direction = b.clone().sub(a), mesh = new T.Mesh(new T.CylinderGeometry(radius, radius, direction.length(), 16), mat(color));
  mesh.position.copy(a.clone().add(b).multiplyScalar(.5)); mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), direction.normalize()); mesh.castShadow = true; g.add(mesh); return mesh;
}
function tree(g: T.Group, x: number, z: number, scale = 1) {
  box(g, [.22, 1.4 * scale, .22], [x, .7 * scale, z], '#87755b');
  const mesh = new T.Mesh(new T.IcosahedronGeometry(1.15 * scale, 1), mat('#69856a')); mesh.position.set(x, 2.1 * scale, z); mesh.castShadow = true; g.add(mesh);
}
function label(g: T.Group, text: string, position: [number, number, number], color = '#263c34') {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 96;
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  ctx.clearRect(0, 0, 512, 96); ctx.fillStyle = '#f6f7f1'; ctx.beginPath(); ctx.roundRect(0, 4, 512, 88, 20); ctx.fill();
  ctx.fillStyle = color; ctx.font = '500 40px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256, 49);
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace;
  const sprite = new T.Sprite(new T.SpriteMaterial({ map: texture, depthTest: false })); sprite.position.set(...position); sprite.scale.set(9, 1.69, 1); g.add(sprite);
}
function building(g: T.Group, p: Project, options: SceneOptions) {
  const b = options.baseline ? { ...p.building, length: 20, width: 12, floors: 1, material: 'concrete' as const } : p.building;
  const { length: L, width: W, floors, height: H } = b;
  const ph = phaseAt(p.planning), phased = options.mode === 'phases';
  const progress = phased ? ph.map(x => x.progress) : [1, 1, 1, 1, 1];
  const color = materials[b.material].color;
  if (phased && progress[0] === 0) { line(g, [new T.Vector3(-L / 2, .2, -W / 2), new T.Vector3(L / 2, .2, -W / 2), new T.Vector3(L / 2, .2, W / 2), new T.Vector3(-L / 2, .2, W / 2)], green, true); return; }
  box(g, [L + .7, .4, W + .7], [0, .2, 0], progress[0] < 1 ? orange : '#bebdb1');
  if (phased && progress[1] === 0) return;
  const builtFloors = Math.max(1, Math.ceil(floors * progress[1]));
  for (let f = 0; f < builtFloors; f++) {
    const y = .4 + f * H;
    box(g, [L, .22, W], [0, y, 0], '#dedbd0');
    for (const x of [-L / 2 + .25, 0, L / 2 - .25]) for (const z of [-W / 2 + .25, W / 2 - .25]) box(g, [.35, H, .35], [x, y + H / 2, z], progress[1] < 1 ? '#d5aa72' : '#b7b6ad');
    if (progress[2] > 0) {
      for (const side of [-1, 1]) {
        box(g, [L, .7, .28], [0, y + .42, side * W / 2], color);
        box(g, [L, .6, .28], [0, y + H - .3, side * W / 2], color);
        const bays = Math.floor(L / 3);
        for (let n = 0; n < bays; n++) {
          const x = -L / 2 + (n + .5) * L / bays;
          box(g, [.6, H - 1.3, .32], [x - L / bays / 2 + .3, y + H / 2 + .05, side * W / 2], color);
          box(g, [L / bays - .7, H - 1.4, .1], [x + .25, y + H / 2 + .05, side * W / 2], '#66898c', .76);
          box(g, [.06, H - 1.4, .16], [x + .25, y + H / 2 + .05, side * W / 2 + side * .08], '#485551');
        }
      }
      for (const x of [-L / 2, L / 2]) {
        box(g, [.3, H, W], [x, y + H / 2, 0], color);
        for (let z = -W / 2 + 2; z < W / 2 - 1; z += 3) box(g, [.32, H * .54, 1.6], [x + Math.sign(x) * .02, y + H * .54, z], '#6b8b8d');
      }
    }
    if (progress[3] > 0) {
      box(g, [L - 1, .13, .2], [0, y + H - .5, 0], '#6aa1a5');
      for (const x of [-L / 4, L / 4]) box(g, [.16, .12, W - 1], [x, y + H - .5, 0], '#6aa1a5');
    }
  }
  if (options.roof && progress[2] > 0) {
    box(g, [L + .5, .28, W + .5], [0, floors * H + .55, 0], '#525f57');
    box(g, [L - 1.2, .1, W - 1.2], [0, floors * H + .74, 0], '#839276');
    for (let x = -L / 2 + 2; x < L / 2 - 2; x += 2.5) box(g, [1.9, .12, 2.9], [x, floors * H + .86, -W / 4], '#344f5d');
    box(g, [3.3, .8, 1.7], [L / 3, floors * H + 1.1, W / 4], '#c2c6be');
  }
  if (progress[4] > 0) {
    box(g, [3.5, 2.8, .16], [0, 1.8, W / 2 + .17], '#496c70', .8);
    box(g, [5, .18, 2], [0, 3.2, W / 2 + .8], '#47594e');
    box(g, [5, .09, 8], [0, .05, W / 2 + 4], '#c5c2b7');
  }
}
export function createModel(p: Project, options: SceneOptions): T.Group {
  const g = new T.Group();
  if (options.mode === 'ground') {
    const s = p.ground, m = groundMetrics(s), L = s.length, W = s.width;
    // A longitudinal half-section: the near soil bank is removed to expose pipe and sloping bed.
    const soil = '#ad8862';
    const maxDepth = m.endDepth + .7;
    box(g, [L + 4, maxDepth, 4], [0, -maxDepth / 2, -W / 2 - 2], soil);
    box(g, [L + 4, .12, 4], [0, .06, -W / 2 - 2], '#8b9a72');
    for (const x of [-L / 2 - 1, L / 2 + 1]) box(g, [2, maxDepth, W], [x, -maxDepth / 2, 0], soil);
    // Wedge top follows the actual excavation depth; not just a level box.
    const shape = new T.Shape(); shape.moveTo(-L / 2, -s.depth); shape.lineTo(L / 2, -m.endDepth); shape.lineTo(L / 2, -maxDepth); shape.lineTo(-L / 2, -maxDepth); shape.closePath();
    const bed = new T.Mesh(new T.ExtrudeGeometry(shape, { depth: W, bevelEnabled: false }), mat('#ccb88e')); bed.position.z = -W / 2; g.add(bed);
    const r = s.diameter / 2000;
    cylinderBetween(g, new T.Vector3(-L / 2, -s.depth + r, 0), new T.Vector3(L / 2, -m.endDepth + r, 0), r, '#d57e41');
    for (const [x, d] of [[-L / 2, s.depth], [L / 2, m.endDepth]]) {
      cylinderBetween(g, new T.Vector3(x, -d + r, 0), new T.Vector3(x, .5, 0), .45, '#778c8b');
      const cover = new T.Mesh(new T.CylinderGeometry(.6, .6, .12, 24), mat('#465957')); cover.position.set(x, .54, 0); g.add(cover);
    }
    line(g, [new T.Vector3(-L / 2, 1.3, 0), new T.Vector3(L / 2, 1.3, 0)], green);
    label(g, `${L} m · ${s.slope} ‰`, [0, 2.5, 0]);
    label(g, `${s.depth.toFixed(2)} m`, [-L / 2, -s.depth / 2, 2]);
    label(g, `${m.endDepth.toFixed(2)} m`, [L / 2, -m.endDepth / 2, 2]);
    return g;
  }
  const site = options.mode === 'site';
  const b = p.building, H = buildingMetrics(b).height;
  box(g, [site ? 64 : Math.max(44, b.length + 16), .35, site ? 60 : Math.max(36, b.width + 20)], [0, -.22, 0], options.dark ? '#34483d' : '#bdc8ab');
  if (!site) {
    box(g, [b.length + 10, .08, b.width + 8], [0, -.01, 0], '#d2d0c3');
    box(g, [Math.max(44, b.length + 16), .06, 3.5], [0, -.01, b.width / 2 + 8], '#929d94');
    for (const [x, z, s] of [[-b.length / 2 - 4, -b.width / 2, 1.3], [b.length / 2 + 4, -b.width / 2 + 2, 1.7], [b.length / 2 + 4, b.width / 2 + 2, 1.2], [-b.length / 2 - 4, b.width / 2 + 2, 1]]) tree(g, x, z, s);
  }
  building(g, p, options);
  if (options.mode === 'project') {
    line(g, [new T.Vector3(-b.length / 2, .2, -b.width / 2 - 3), new T.Vector3(b.length / 2, .2, -b.width / 2 - 3)], '#557665');
    if (!options.baseline) label(g, `${b.length} × ${b.width} m`, [0, .7, -b.width / 2 - 4]);
  }
  if (site) {
    const l = p.logistics, checks = logisticsMetrics(p);
    // 6 m wide access corridor from site gate to the south facade.
    box(g, [6, .06, 29 - b.width / 2], [l.gate, .04, (29 + b.width / 2) / 2], '#d6c490');
    for (let z = b.width / 2 + 3; z < 29; z += 4) box(g, [.2, .08, 1.5], [l.gate, .09, z], '#f3edda');
    for (const z of [-29, 29]) {
      for (let x = -31; x <= 31; x += 2) if (z < 0 || Math.abs(x - l.gate) > 3) box(g, [.08, 1.7, .08], [x, .85, z], '#77887b');
      if (z < 0) box(g, [62, .08, .08], [0, 1.6, z], '#77887b');
    }
    for (const x of [-31, 31]) box(g, [.08, 1.2, 58], [x, .6, 0], '#77887b', .45);
    box(g, [8, 1.6, 6], [l.storageX, .8, l.storageZ], checks.storageClash || checks.routeClash ? '#be6255' : '#879b7c');
    for (let i = -2; i <= 2; i += 2) box(g, [1.5, .5, 4.5], [l.storageX + i, 1.85, l.storageZ], '#d1ba8d');
    label(g, 'Materialeoplag', [l.storageX, 4.3, l.storageZ]);
    const craneHeight = H + 8;
    box(g, [2.5, .6, 2.5], [l.craneX, .3, l.craneZ], '#87938a');
    box(g, [.7, craneHeight, .7], [l.craneX, craneHeight / 2, l.craneZ], orange);
    box(g, [l.radius + 6, .65, .65], [l.craneX + (l.radius - 6) / 2, craneHeight, l.craneZ], orange);
    box(g, [3, 1.2, 1.7], [l.craneX - 4, craneHeight, l.craneZ], '#68766c');
    cylinderBetween(g, new T.Vector3(l.craneX + l.radius * .7, craneHeight, l.craneZ), new T.Vector3(l.craneX + l.radius * .7, 2, l.craneZ), .035, '#4a5b51');
    const points = Array.from({ length: 96 }, (_, i) => new T.Vector3(l.craneX + Math.cos(i / 96 * Math.PI * 2) * l.radius, .15, l.craneZ + Math.sin(i / 96 * Math.PI * 2) * l.radius));
    line(g, points, checks.covered ? '#498b78' : '#cf7943', true);
    label(g, `Kran · R ${l.radius} m`, [l.craneX, craneHeight + 3, l.craneZ]);
    box(g, [8, 2.6, 3.2], [-20, 1.3, 20], '#e2ddd0');
    box(g, [8, .2, 3.4], [-20, 2.7, 20], '#52695b');
    label(g, 'Skurby', [-20, 4.8, 20]);
  }
  if (options.mode === 'issues') {
    const positions: Record<string, [number, number, number]> = { Sydfacade: [-b.length / 4, H * .6, b.width / 2 + .8], Nordfacade: [b.length / 4, H * .6, -b.width / 2 - .8], Tag: [b.length / 4, H + 2.2, 0], Indgang: [0, 1.2, b.width / 2 + 3], Fundament: [-b.length / 2 - 1, .9, b.width / 3] };
    const counts: Record<string, number> = {};
    for (const issue of p.issues) {
      const pos = [...positions[issue.location]] as [number, number, number]; const n = counts[issue.location] ?? 0; counts[issue.location] = n + 1; pos[0] += (n % 5) * 1.6; pos[1] += Math.floor(n / 5) * 1.6;
      const selected = issue.id === options.selected;
      const color = selected ? '#f0bd5c' : issue.status === 'Løst' ? '#529178' : issue.priority === 'Høj' ? '#c66d59' : '#dba250';
      const marker = new T.Mesh(new T.SphereGeometry(selected ? .75 : .55, 20, 12), mat(color)); marker.position.set(...pos); marker.userData.issueId = issue.id; g.add(marker);
      cylinderBetween(g, new T.Vector3(pos[0], pos[1] - 1.3, pos[2]), new T.Vector3(...pos), .05, color);
      if (selected) label(g, issue.id, [pos[0], pos[1] + 1.8, pos[2]]);
    }
  }
  return g;
}
export function disposeModel(group: T.Object3D) {
  group.traverse(obj => {
    if (obj instanceof T.Mesh || obj instanceof T.Line || obj instanceof T.Sprite) {
      if ('geometry' in obj) obj.geometry.dispose();
      const ms = Array.isArray(obj.material) ? obj.material : [obj.material];
      ms.forEach(m => { if ('map' in m && m.map instanceof T.Texture) m.map.dispose(); m.dispose(); });
    }
  });
}
