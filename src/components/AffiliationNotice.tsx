import { useState } from 'react';
import { Info } from 'lucide-react';

const DISMISSED_KEY = 'kv-affiliation-notice-dismissed-v1';

export default function AffiliationNotice() {
  const [visible, setVisible] = useState(() => {
    try { return localStorage.getItem(DISMISSED_KEY) !== 'true'; }
    catch { return true; }
  });

  function dismiss() {
    try { localStorage.setItem(DISMISSED_KEY, 'true'); }
    catch { /* Still dismiss for this visit if browser storage is unavailable. */ }
    setVisible(false);
  }

  if (!visible) return null;

  return <section className="affiliation-notice" aria-labelledby="affiliation-notice-title">
    <Info size={22} aria-hidden="true"/>
    <div>
      <h2 id="affiliation-notice-title">Uafhængigt hobbyprojekt</h2>
      <p>Denne side er et privat hobbyprojekt og er ikke affilieret med Kanneworff &amp; Viuff. Den er ikke virksomhedens officielle hjemmeside og er ikke udarbejdet på virksomhedens vegne.</p>
    </div>
    <button className="secondary" onClick={dismiss}>Forstået</button>
  </section>;
}
