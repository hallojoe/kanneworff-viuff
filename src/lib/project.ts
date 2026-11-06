export const materials = {
  brick: { name: 'Tegl', color: '#b4775e', rate: 18500, carbon: 320 },
  timber: { name: 'Træ', color: '#ba9870', rate: 19500, carbon: 220 },
  concrete: { name: 'Beton', color: '#b2b4b0', rate: 17500, carbon: 390 },
} as const;
export type Material = keyof typeof materials;
export type Issue = { id: string; title: string; location: string; priority: 'Høj' | 'Normal' | 'Lav'; status: 'Åben' | 'I gang' | 'Løst'; owner: string; note: string };
export type Project = {
  version: 1; name: string;
  building: { length: number; width: number; floors: number; height: number; material: Material; rate: number; carbon: number };
  planning: { durations: number[]; week: number };
  logistics: { craneX: number; craneZ: number; radius: number; storageX: number; storageZ: number; gate: number };
  ground: { length: number; width: number; depth: number; slope: number; diameter: number; swell: number; truck: number };
  issues: Issue[];
};
export const phases = ['Jord & fundament', 'Råhus', 'Lukning', 'Installationer', 'Aflevering'];
export function initialProject(): Project {
  return { version: 1, name: 'Byggeprojekt · Demo',
    building: { length: 24, width: 14, floors: 2, height: 3.4, material: 'brick', rate: 18500, carbon: 320 },
    planning: { durations: [4, 8, 5, 6, 3], week: 14 },
    logistics: { craneX: -20, craneZ: 0, radius: 38, storageX: 20, storageZ: 15, gate: 0 },
    ground: { length: 24, width: 1.2, depth: 1.8, slope: 15, diameter: 160, swell: 20, truck: 12 },
    issues: [
      { id: 'KV-001', title: 'Fuge ved vindue kontrolleres', location: 'Sydfacade', priority: 'Normal', status: 'Åben', owner: 'Facadeentreprenør', note: 'Kontrollér tætning før førgennemgang.' },
      { id: 'KV-002', title: 'Afslutning ved tagkant', location: 'Tag', priority: 'Høj', status: 'I gang', owner: 'Tagentreprenør', note: 'Aftal gennemgang af inddækning.' },
      { id: 'KV-003', title: 'Belægning ved indgang', location: 'Indgang', priority: 'Lav', status: 'Løst', owner: 'Anlæg', note: 'Udbedret og klar til kontrol.' },
    ],
  };
}
export const locations = ['Sydfacade', 'Nordfacade', 'Tag', 'Indgang', 'Fundament'] as const;
export function buildingMetrics(b: Project['building']) {
  const footprint = b.length * b.width, area = footprint * b.floors;
  return { footprint, area, height: b.floors * b.height, volume: area * b.height, cost: area * b.rate, carbon: area * b.carbon / 1000 };
}
export function phaseAt(p: Project['planning']) {
  let end = 0;
  return p.durations.map((duration, index) => {
    const start = end; end += duration;
    return { name: phases[index], start, end, duration, progress: Math.max(0, Math.min(1, (p.week - start) / duration)) };
  });
}
export function groundMetrics(g: Project['ground']) {
  const fall = g.length * g.slope / 1000, endDepth = g.depth + fall;
  const volume = g.length * g.width * (g.depth + endDepth) / 2, looseVolume = volume * (1 + g.swell / 100);
  return { fall, endDepth, volume, looseVolume, trucks: Math.ceil(looseVolume / g.truck), pipeCover: g.depth - g.diameter / 1000 };
}
export function logisticsMetrics(p: Project) {
  const { building: b, logistics: l } = p;
  const distances = [-1, 1].flatMap(x => [-1, 1].map(z => Math.hypot(x * b.length / 2 - l.craneX, z * b.width / 2 - l.craneZ)));
  const farthest = Math.max(...distances);
  const craneInside = Math.abs(l.craneX) < b.length / 2 + 1.5 && Math.abs(l.craneZ) < b.width / 2 + 1.5;
  const storageClash = Math.abs(l.storageX) < b.length / 2 + 4 && Math.abs(l.storageZ) < b.width / 2 + 3;
  const routeClash = Math.abs(l.storageX - l.gate) < 7 && l.storageZ + 3 > b.width / 2 && l.storageZ - 3 < 29;
  return { farthest, covered: farthest <= l.radius, craneInside, storageClash, routeClash };
}
const record = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
function number(x: unknown, min: number, max: number, integer = false): number {
  if (typeof x !== 'number' || !Number.isFinite(x) || x < min || x > max || (integer && !Number.isInteger(x))) throw new Error('Projektfilen indeholder værdier uden for de tilladte intervaller.');
  return x;
}
function string(x: unknown, max: number): string { if (typeof x !== 'string' || x.length > max) throw new Error('Ugyldig tekst i projektfilen.'); return x; }
function oneOf<T extends string>(x: unknown, choices: readonly T[]): T { if (!choices.includes(x as T)) throw new Error('Ukendt værdi i projektfilen.'); return x as T; }
export function parseProject(input: unknown): Project {
  if (!record(input) || input.version !== 1 || !record(input.building) || !record(input.planning) || !record(input.logistics) || !record(input.ground) || !Array.isArray(input.issues)) throw new Error('Filen er ikke et gyldigt KV Studio-projekt (version 1).');
  const b = input.building, p = input.planning, l = input.logistics, g = input.ground;
  if (!Array.isArray(p.durations) || p.durations.length !== 5 || input.issues.length > 500) throw new Error('Ugyldige faser eller for mange mangler.');
  const durations = p.durations.map(d => number(d, 1, 30, true));
  const issues = input.issues.map(i => {
    if (!record(i)) throw new Error('Ugyldig mangel.');
    return { id: string(i.id, 80), title: string(i.title, 160), location: oneOf(i.location, locations), priority: oneOf(i.priority, ['Høj', 'Normal', 'Lav'] as const), status: oneOf(i.status, ['Åben', 'I gang', 'Løst'] as const), owner: string(i.owner, 100), note: string(i.note, 2000) };
  });
  if (new Set(issues.map(i => i.id)).size !== issues.length) throw new Error('Mangelnumre skal være unikke.');
  return { version: 1, name: string(input.name, 100),
    building: { length: number(b.length, 12, 40), width: number(b.width, 8, 24), floors: number(b.floors, 1, 5, true), height: number(b.height, 2.8, 4.5), material: oneOf(b.material, ['brick', 'timber', 'concrete'] as const), rate: number(b.rate, 0, 100000), carbon: number(b.carbon, 0, 2000) },
    planning: { durations, week: number(p.week, 0, durations.reduce((a, c) => a + c, 0)) },
    logistics: { craneX: number(l.craneX, -28, 28), craneZ: number(l.craneZ, -24, 24), radius: number(l.radius, 10, 60), storageX: number(l.storageX, -26, 26), storageZ: number(l.storageZ, -24, 24), gate: number(l.gate, -22, 22) },
    ground: { length: number(g.length, 5, 50), width: number(g.width, 0.6, 3), depth: number(g.depth, 0.8, 4), slope: number(g.slope, 0, 40), diameter: number(g.diameter, 110, 600), swell: number(g.swell, 0, 50), truck: number(g.truck, 4, 25) }, issues };
}
export const STORAGE_KEY = 'kv-studio-project-v1';
export function loadProject(): { project: Project; warning?: string } {
  try { const raw = localStorage.getItem(STORAGE_KEY); return { project: raw ? parseProject(JSON.parse(raw)) : initialProject() }; }
  catch { return { project: initialProject(), warning: 'Det gemte projekt kunne ikke læses. Et demoprojekt er åbnet; eksportér det for at gemme en kopi.' }; }
}
export function download(name: string, content: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function issuesCSV(issues: Issue[]): string {
  const cell = (x: string) => '"' + (/^[=+@\-\t\r]/.test(x) ? "'" + x : x).replaceAll('"', '""') + '"';
  return '\uFEFF' + [['ID', 'Mangel', 'Placering', 'Prioritet', 'Status', 'Ansvarlig', 'Note'], ...issues.map(i => [i.id, i.title, i.location, i.priority, i.status, i.owner, i.note])].map(row => row.map(cell).join(';')).join('\r\n');
}
export const fmt = (n: number, digits = 0) => new Intl.NumberFormat('da-DK', { maximumFractionDigits: digits }).format(n);
