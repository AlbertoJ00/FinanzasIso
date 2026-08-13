import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Dynamic records reside in the browser SQLite database and cannot be enumerated at build time.
  { path: 'cheques/:id', renderMode: RenderMode.Client },
  { path: 'beneficiarios/:id', renderMode: RenderMode.Client },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
