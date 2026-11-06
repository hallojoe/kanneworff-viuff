import { beforeEach, describe, expect, it } from 'vitest';
import { buildingMetrics, groundMetrics, initialProject, issuesCSV, loadProject, logisticsMetrics, parseProject, phaseAt, STORAGE_KEY } from './project';
beforeEach(() => localStorage.clear());
describe('Building quantities and scenario assumptions', () => {
  it('calculates gross floor area, cost, volume and tonnes from editable factors', () => {
    const b = { ...initialProject().building, length: 20, width: 10, floors: 3, height: 3, rate: 10000, carbon: 200 };
    expect(buildingMetrics(b)).toEqual({ footprint: 200, area: 600, height: 9, volume: 1800, cost: 6000000, carbon: 120 });
  });
  it('does not impose a hidden cost or carbon factor on zero input', () => { expect(buildingMetrics({ ...initialProject().building, rate: 0, carbon: 0 })).toMatchObject({ cost: 0, carbon: 0 }); });
});
describe('Sequential phase boundaries', () => {
  it('does not complete the next phase at the exact boundary', () => {
    const schedule = phaseAt({ durations: [4, 8, 5, 6, 3], week: 4 });
    expect(schedule.map(s => s.progress)).toEqual([1, 0, 0, 0, 0]);
    expect(schedule.at(-1)?.end).toBe(26);
  });
  it('shows partial progress and clamps both endpoints', () => {
    expect(phaseAt({ durations: [4, 8, 5, 6, 3], week: 8 })[1].progress).toBe(.5);
    expect(phaseAt({ durations: [1, 1, 1, 1, 1], week: 0 }).every(p => p.progress === 0)).toBe(true);
    expect(phaseAt({ durations: [1, 1, 1, 1, 1], week: 5 }).every(p => p.progress === 1)).toBe(true);
  });
});
describe('Trench, slope and transport', () => {
  it('converts per-mille to metres and uses mean depth, not start depth', () => {
    const m = groundMetrics({ length: 20, width: 1, depth: 2, slope: 20, diameter: 200, swell: 25, truck: 12 });
    expect(m.fall).toBeCloseTo(.4); expect(m.endDepth).toBeCloseTo(2.4); expect(m.volume).toBeCloseTo(44); expect(m.looseVolume).toBeCloseTo(55); expect(m.trucks).toBe(5); expect(m.pipeCover).toBeCloseTo(1.8);
  });
  it('handles zero fall and an exactly full last load', () => {
    const m = groundMetrics({ length: 10, width: 1, depth: 2, slope: 0, diameter: 160, swell: 0, truck: 10 });
    expect(m.volume).toBe(20); expect(m.fall).toBe(0); expect(m.trucks).toBe(2);
  });
});
describe('Site geometry', () => {
  it('detects storage/building and crane/building overlaps', () => {
    const p = initialProject(); p.logistics.storageX = 0; p.logistics.storageZ = 0; p.logistics.craneX = 0; p.logistics.craneZ = 0;
    expect(logisticsMetrics(p)).toMatchObject({ storageClash: true, craneInside: true });
  });
  it('detects blocked access and an insufficient radius', () => {
    const p = initialProject(); p.logistics.storageX = 0; p.logistics.storageZ = 20; p.logistics.radius = 10;
    expect(logisticsMetrics(p)).toMatchObject({ routeClash: true, covered: false, storageClash: false });
  });
  it('checks the farthest corner rather than the building centre', () => {
    const p = initialProject(); p.logistics.craneX = -20; p.logistics.craneZ = 0; p.logistics.radius = 30;
    expect(logisticsMetrics(p).farthest).toBeCloseTo(Math.hypot(32, 7)); expect(logisticsMetrics(p).covered).toBe(false);
  });
});
describe('Safe project persistence', () => {
  it('round-trips all supported fields', () => { const p = initialProject(); expect(parseProject(JSON.parse(JSON.stringify(p)))).toEqual(p); });
  it.each([null, {}, { version: 2 }, { ...initialProject(), building: null }])('rejects malformed projects', value => { expect(() => parseProject(value)).toThrow(); });
  it('rejects NaN, infinite, negative and fractional floor values', () => { for (const floors of [NaN, Infinity, -1, 1.5]) expect(() => parseProject({ ...initialProject(), building: { ...initialProject().building, floors } })).toThrow(); });
  it('rejects invalid phase schedules, markers and duplicated issue identifiers', () => {
    const p = initialProject();
    expect(() => parseProject({ ...p, planning: { week: 1000, durations: [4, 8, 5, 6, 3] } })).toThrow();
    expect(() => parseProject({ ...p, planning: { week: 0, durations: [0, 8, 5, 6, 3] } })).toThrow();
    expect(() => parseProject({ ...p, issues: [{ ...p.issues[0], location: 'Unknown' }] })).toThrow();
    expect(() => parseProject({ ...p, issues: [p.issues[0], p.issues[0]] })).toThrow();
  });
  it('recovers from corrupt local data with a visible warning', () => { localStorage.setItem(STORAGE_KEY, '{bad'); const result = loadProject(); expect(result.project).toEqual(initialProject()); expect(result.warning).toBeTruthy(); });
  it('does not copy unknown object keys from imported JSON', () => { const p = parseProject({ ...initialProject(), unexpected: true }); expect(p).not.toHaveProperty('unexpected'); });
  it('escapes CSV delimiters, quotes and spreadsheet formulas', () => {
    const p = initialProject(); p.issues[0].title = '=SUM(A1:A2)'; p.issues[0].note = 'a;"b"\nline';
    const csv = issuesCSV(p.issues); expect(csv.startsWith('\uFEFF')).toBe(true); expect(csv).toContain('"\'=SUM(A1:A2)"'); expect(csv).toContain('"a;""b""\nline"');
  });
});
