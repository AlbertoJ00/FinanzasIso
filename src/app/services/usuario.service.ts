import { Injectable } from '@angular/core';
import { Usuario } from '../models';
import { DatabaseService } from './database.service';
import { AuditoriaService } from './auditoria.service';
@Injectable({ providedIn: 'root' })
export class UsuarioService {
  constructor(private db: DatabaseService, private audit: AuditoriaService) {}
  hash(texto:string):string { let h=2166136261; for(let i=0;i<texto.length;i++) h=Math.imul(h^texto.charCodeAt(i),16777619); return `fnv1a-${(h>>>0).toString(16)}`; }
  async getAll():Promise<Usuario[]>{await this.db.ready(); const r=this.db.select<Usuario>('SELECT * FROM usuarios ORDER BY nombreUsuario ASC'); if(!r.length){await this.db.exec('INSERT INTO usuarios (nombreUsuario, nombreCompleto, correo, rol, estado, passwordHash) VALUES (?, ?, ?, ?, ?, ?)',['admin','Administrador','admin@finanzasiso.local','Administrador','Activo',this.hash('admin')]); return this.getAll();} return r;}
  async getById(id:number):Promise<Usuario|null>{return (await this.getAll()).find(x=>x.id===id)||null;}
  private async validar(u:Usuario):Promise<void>{const a=await this.getAll();if(a.some(x=>x.nombreUsuario.toLowerCase()===u.nombreUsuario.toLowerCase()&&x.id!==u.id))throw new Error('El nombre de usuario ya está registrado.');if(a.some(x=>x.correo.toLowerCase()===u.correo.toLowerCase()&&x.id!==u.id))throw new Error('El correo ya está registrado.');}
  async create(u:Usuario, password?:string):Promise<void>{await this.validar(u);await this.db.exec('INSERT INTO usuarios (nombreUsuario, nombreCompleto, correo, rol, estado, passwordHash) VALUES (?, ?, ?, ?, ?, ?)',[u.nombreUsuario,u.nombreCompleto,u.correo,u.rol,u.estado,password?this.hash(password):u.passwordHash]);const x=(await this.getAll()).find(v=>v.nombreUsuario===u.nombreUsuario)!;await this.audit.registrar('Usuario',x.id!,'Crear',u.nombreUsuario);}
  async update(u:Usuario,password?:string):Promise<void>{if(!u.id)throw new Error('ID requerido para actualizar.');await this.validar(u);const actual=await this.getById(u.id);await this.db.exec('UPDATE usuarios SET nombreUsuario = ?, nombreCompleto = ?, correo = ?, rol = ?, estado = ?, passwordHash = ? WHERE id = ?',[u.nombreUsuario,u.nombreCompleto,u.correo,u.rol,u.estado,password?this.hash(password):(u.passwordHash||actual?.passwordHash||''),u.id]);await this.audit.registrar('Usuario',u.id,'Editar',u.nombreUsuario);}
  async delete(id:number):Promise<void>{const u=await this.getById(id);const admins=(await this.getAll()).filter(x=>x.rol==='Administrador');if(u?.rol==='Administrador'&&admins.length<=1)throw new Error('No se puede eliminar el último usuario Administrador.');await this.db.exec('DELETE FROM usuarios WHERE id = ?',[id]);await this.audit.registrar('Usuario',id,'Eliminar',u?.nombreUsuario||'');}
  async autenticar(usuario:string,password:string):Promise<Usuario|null>{return (await this.getAll()).find(u=>u.estado==='Activo'&&u.nombreUsuario.toLowerCase()===usuario.toLowerCase()&&u.passwordHash===this.hash(password))||null;}
}
