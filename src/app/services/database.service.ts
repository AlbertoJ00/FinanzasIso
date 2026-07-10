import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private db: any = null;
  private isBrowser: boolean;
  private initializedPromise: Promise<void> | null = null;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    if (this.isBrowser) {
      this.initializedPromise = this.initDatabase();
    } else {
      this.initializedPromise = Promise.resolve();
    }
  }

  // Returns a promise that resolves when the DB is fully ready.
  public ready(): Promise<void> {
    return this.initializedPromise || Promise.resolve();
  }

  private async initDatabase(): Promise<void> {
    try {
      console.log('Initializing SQLite database with sql.js...');
      
      // Dynamic import to prevent Node.js / SSR from loading sql.js
      const initSqlJs = (await import('sql.js')).default;
      
      const SQL = await initSqlJs({
        locateFile: (file: string) => `/${file}`
      });

      const savedDbData = this.loadFromLocalStorage();
      
      if (savedDbData) {
        console.log('Loaded database state from LocalStorage.');
        this.db = new SQL.Database(savedDbData);
      } else {
        console.log('No saved database found. Creating a new one.');
        this.db = new SQL.Database();
        this.createTables();
      }
    } catch (err) {
      console.error('Failed to initialize SQLite Database:', err);
      // Fallback in case of WASM loading error
      const initSqlJs = (await import('sql.js')).default;
      this.db = new (initSqlJs as any).Database();
      this.createTables();
    }
  }

  private createTables(): void {
    if (!this.db) return;
    
    console.log('Creating database tables...');
    this.db.run(`
      CREATE TABLE IF NOT EXISTS beneficiarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        apellido TEXT NOT NULL,
        tipoDocumento TEXT NOT NULL,
        numeroDocumento TEXT UNIQUE NOT NULL,
        telefono TEXT,
        correo TEXT,
        banco TEXT,
        cuentaBancaria TEXT UNIQUE NOT NULL,
        estado TEXT NOT NULL
      );
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS cheques (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        numeroCheque TEXT UNIQUE NOT NULL,
        tipo TEXT NOT NULL,
        beneficiarioId INTEGER NOT NULL,
        monto REAL NOT NULL,
        concepto TEXT NOT NULL,
        estado TEXT NOT NULL,
        fecha TEXT NOT NULL,
        observaciones TEXT,
        FOREIGN KEY(beneficiarioId) REFERENCES beneficiarios(id)
      );
    `);

    this.saveToLocalStorage();
  }

  // Execute a write query (INSERT, UPDATE, DELETE)
  public exec(query: string, params?: any[]): void {
    if (!this.isBrowser) return;
    if (!this.db) {
      console.error('Database not initialized.');
      return;
    }

    try {
      if (params && params.length > 0) {
        const stmt = this.db.prepare(query);
        stmt.run(params);
        stmt.free();
      } else {
        this.db.run(query);
      }
      this.saveToLocalStorage();
    } catch (err) {
      console.error('Database exec error:', err, 'Query:', query, 'Params:', params);
      throw err;
    }
  }

  // Execute a select query and return results mapped as objects
  public select<T>(query: string, params?: any[]): T[] {
    if (!this.isBrowser || !this.db) {
      return [];
    }

    try {
      const stmt = this.db.prepare(query);
      if (params && params.length > 0) {
        stmt.bind(params);
      }

      const results: T[] = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject() as T);
      }
      stmt.free();
      return results;
    } catch (err) {
      console.error('Database select error:', err, 'Query:', query, 'Params:', params);
      return [];
    }
  }

  // Export DB and save as Base64 to LocalStorage
  private saveToLocalStorage(): void {
    if (!this.isBrowser || !this.db) return;
    try {
      const binaryData = this.db.export();
      const base64String = this.uint8ArrayToBase64(binaryData);
      localStorage.setItem('finanzas_cheques_db', base64String);
      console.log('Database auto-saved successfully.');
    } catch (err) {
      console.error('Error saving database to LocalStorage:', err);
    }
  }

  // Load from LocalStorage and convert from Base64
  private loadFromLocalStorage(): Uint8Array | null {
    if (!this.isBrowser) return null;
    try {
      const base64String = localStorage.getItem('finanzas_cheques_db');
      if (!base64String) return null;
      return this.base64ToUint8Array(base64String);
    } catch (err) {
      console.error('Error loading database from LocalStorage:', err);
      return null;
    }
  }

  // Helper: Uint8Array to Base64
  private uint8ArrayToBase64(arr: Uint8Array): string {
    let binary = '';
    const len = arr.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(arr[i]);
    }
    return btoa(binary);
  }

  // Helper: Base64 to Uint8Array
  private base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }
}
