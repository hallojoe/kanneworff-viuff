import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App, { routeFromHash, routes } from './App';
import { initialProject, STORAGE_KEY } from './lib/project';
vi.mock('./components/Viewport', () => ({ default: () => <div aria-label="3D mock"/> }));
beforeEach(() => { localStorage.clear(); window.location.hash = '#/projekt'; vi.spyOn(window, 'scrollTo').mockImplementation(() => {}); });
afterEach(cleanup);
describe('Pages and shared project state', () => {
  it('resolves every deep link and rejects unknown routes', () => { for (const route of routes) expect(routeFromHash(`#/${route.id}`)?.id).toBe(route.id); expect(routeFromHash('#/missing')).toBeUndefined(); });
  it('changes area when dimensions change and persists the result', async () => {
    render(<App/>); const slider = await screen.findByLabelText('Længde'); fireEvent.change(slider, { target: { value: '30' } });
    await waitFor(() => expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).building.length).toBe(30));
    expect(screen.getByText('840')).toBeTruthy();
  });
  it('switches and persists the colour theme', async () => {
    document.documentElement.dataset.theme = 'light'; render(<App/>); fireEvent.click(screen.getByLabelText('Skift til mørk visning'));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark')); expect(localStorage.getItem('kv-theme')).toBe('dark');
  });
  it('creates a located issue and lets the user complete it', async () => {
    window.location.hash = '#/aflevering'; render(<App/>); fireEvent.click(await screen.findByRole('button', { name: 'Ny mangel' }));
    fireEvent.change(screen.getByLabelText('Titel'), { target: { value: 'Test af dør' } });
    fireEvent.change(screen.getByLabelText('Placering'), { target: { value: 'Indgang' } });
    fireEvent.click(screen.getByRole('button', { name: 'Opret mangel' }));
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'Løst' } });
    await waitFor(() => { const p = JSON.parse(localStorage.getItem(STORAGE_KEY)!); expect(p.issues.at(-1)).toMatchObject({ title: 'Test af dør', location: 'Indgang', status: 'Løst' }); });
  });
  it('shows a readable recovery notice instead of crashing on broken local JSON', async () => { localStorage.setItem(STORAGE_KEY, 'bad json'); render(<App/>); expect(await screen.findByText(/Det gemte projekt kunne ikke læses/)).toBeTruthy(); expect(screen.getByDisplayValue(initialProject().name)).toBeTruthy(); });
});
