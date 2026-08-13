import { Injectable } from '@angular/core';
import { Usuario } from '../models';
@Injectable({ providedIn: 'root' })
export class SessionService {
  private active: Usuario | null = null;
  get usuarioActivo(): Usuario | null { return this.active; }
  iniciar(usuario: Usuario): void { this.active = usuario; }
  cerrar(): void { this.active = null; }
  get esAdministrador(): boolean { return this.active?.rol === 'Administrador'; }
}
