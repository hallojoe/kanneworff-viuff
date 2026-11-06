import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Camera, Expand, RotateCcw, Box, Layers, MousePointer2 } from 'lucide-react';
import { createModel, disposeModel, type ViewMode } from '../lib/scene';
import type { Project } from '../lib/project';

type Props = { project: Project; mode: ViewMode; dark: boolean; baseline?: boolean; selected?: string; onSelect?: (id: string) => void };
export default function Viewport({ project, mode, dark, baseline = false, selected, onSelect }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<{ scene: T.Scene; camera: T.PerspectiveCamera; renderer: T.WebGLRenderer; controls: OrbitControls; render: () => void; model?: T.Group } | null>(null);
  const selectRef = useRef(onSelect); selectRef.current = onSelect;
  const [error, setError] = useState(''); const [roof, setRoof] = useState(true);
  const [view, setView] = useState<'iso' | 'top' | 'front'>('iso');
  const [captureError, setCaptureError] = useState('');
  useEffect(() => {
    const el = host.current!; let renderer: T.WebGLRenderer;
    try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true }); } catch { setError('3D-visningen kræver WebGL. Aktivér hardwareacceleration, eller brug en nyere browser. Alle beregninger og projektdata er stadig tilgængelige.'); return; }
    setError('');
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap; renderer.outputColorSpace = T.SRGBColorSpace; renderer.setClearColor(0x000000, 0); el.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-label', 'Interaktiv 3D-model. Træk for at dreje, scroll for at zoome. Brug kameraknapperne for faste visninger.');
    const scene = new T.Scene(); const camera = new T.PerspectiveCamera(37, 1, .1, 700);
    const controls = new OrbitControls(camera, renderer.domElement); controls.maxPolarAngle = Math.PI * .49; controls.minDistance = 8; controls.maxDistance = 220; controls.enableDamping = false;
    scene.add(new T.HemisphereLight('#ffffff', '#73846f', 2.5));
    const light = new T.DirectionalLight('#fff6e5', 3.1); light.position.set(-25, 50, 30); light.castShadow = true; light.shadow.mapSize.set(2048, 2048); light.shadow.camera.left = -55; light.shadow.camera.right = 55; light.shadow.camera.top = 55; light.shadow.camera.bottom = -55; light.shadow.normalBias = .04; scene.add(light);
    const render = () => renderer.render(scene, camera);
    engine.current = { scene, camera, renderer, controls, render };
    const resize = () => { const { width, height } = el.getBoundingClientRect(); renderer.setSize(width, height); camera.aspect = width / Math.max(height, 1); camera.updateProjectionMatrix(); render(); };
    const observer = new ResizeObserver(resize); observer.observe(el); controls.addEventListener('change', render);
    let pointer: [number, number] = [0, 0];
    const down = (e: PointerEvent) => { pointer = [e.clientX, e.clientY]; };
    const up = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - pointer[0], e.clientY - pointer[1]) > 5) return;
      const rect = renderer.domElement.getBoundingClientRect(); const ray = new T.Raycaster(); ray.setFromCamera(new T.Vector2((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1), camera);
      const hit = ray.intersectObjects(scene.children, true).find(h => h.object.userData.issueId);
      if (hit) selectRef.current?.(hit.object.userData.issueId as string);
    };
    const contextLost = (e: Event) => { e.preventDefault(); setError('3D-forbindelsen blev afbrudt. Genindlæs siden for at gendanne modellen. Projektdata er bevaret.'); };
    renderer.domElement.addEventListener('pointerdown', down); renderer.domElement.addEventListener('pointerup', up); renderer.domElement.addEventListener('webglcontextlost', contextLost);
    resize();
    return () => { observer.disconnect(); controls.dispose(); if (engine.current?.model) disposeModel(engine.current.model); renderer.domElement.removeEventListener('pointerdown', down); renderer.domElement.removeEventListener('pointerup', up); renderer.domElement.removeEventListener('webglcontextlost', contextLost); light.shadow.dispose(); renderer.dispose(); renderer.domElement.remove(); engine.current = null; };
  }, []);
  useEffect(() => {
    const e = engine.current; if (!e) return;
    if (e.model) { e.scene.remove(e.model); disposeModel(e.model); }
    e.model = createModel(project, { mode, dark, roof, baseline, selected }); e.scene.add(e.model); e.render();
  }, [project, mode, dark, roof, baseline, selected]);
  function cameraView(next: 'iso' | 'top' | 'front') {
    const e = engine.current; if (!e) return;
    const scale = mode === 'site' ? 1.55 : mode === 'ground' ? Math.max(.65, project.ground.length / 30) : Math.max(1, project.building.length / 28, project.building.floors / 3.4);
    const targetY = mode === 'ground' ? -1 : mode === 'site' ? 2 : project.building.floors * project.building.height * .35;
    e.controls.target.set(0, targetY, 0);
    const pos = next === 'top' ? [0, 65 * scale, .01] : next === 'front' ? [0, targetY + 2, 65 * scale] : [39 * scale, 29 * scale, 43 * scale];
    e.camera.position.set(pos[0], pos[1], pos[2]); e.controls.update(); e.render(); setView(next);
  }
  useEffect(() => { cameraView('iso'); /* Reframe on page changes, preserve orbit on parameter edits. */ }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps
  function capture() {
    const e = engine.current; if (!e) return;
    try { e.render(); const a = document.createElement('a'); a.href = e.renderer.domElement.toDataURL('image/png'); a.download = `kv-${mode}.png`; a.click(); setCaptureError(''); } catch { setCaptureError('Billedet kunne ikke eksporteres i denne browser.'); }
  }
  return <section className="viewport" aria-label="3D-visualisering">
    <div className="viewport-top"><span className="model-tag"><span className="live-dot"/> {mode === 'ground' ? 'Længdesnit · 3D' : 'Projektmodel · 3D'}</span><span className="model-meta">SKEMATISK MODEL</span></div>
    <div className="canvas-host" ref={host} />
    {error && <div className="webgl-error" role="status"><Box size={32}/><p>{error}</p></div>}
    <div className="view-switch" aria-label="Kameravinkel">{(['iso', 'top', 'front'] as const).map((v, i) => <button key={v} className={view === v ? 'selected' : ''} aria-pressed={view === v} onClick={() => cameraView(v)}>{['Perspektiv', 'Plan', 'Facade'][i]}</button>)}</div>
    <div className="viewport-tools">
      {mode !== 'ground' && <button title={roof ? 'Skjul tag' : 'Vis tag'} aria-label={roof ? 'Skjul tag' : 'Vis tag'} aria-pressed={!roof} onClick={() => setRoof(v => !v)}><Layers size={18}/></button>}
      <button title="Nulstil kamera" aria-label="Nulstil kamera" onClick={() => cameraView('iso')}><RotateCcw size={18}/></button>
      <button title="Gem model som PNG" aria-label="Gem model som PNG" disabled={!!error} onClick={capture}><Camera size={18}/></button>
      <button title="Fuld skærm" aria-label="Fuld skærm" onClick={() => { const el = host.current?.parentElement; if (document.fullscreenElement) void document.exitFullscreen(); else if (el?.requestFullscreen) void el.requestFullscreen().catch(() => setCaptureError('Fuld skærm er ikke tilgængelig i denne browser.')); else setCaptureError('Fuld skærm er ikke tilgængelig i denne browser.'); }}><Expand size={18}/></button>
    </div>
    <div className="viewport-bottom"><span><MousePointer2 size={13}/> Træk for at dreje <i/> Scroll for at zoome</span><span className="north">N ↑</span></div>
    {captureError && <div className="capture-error" role="status">{captureError}</div>}
  </section>;
}
