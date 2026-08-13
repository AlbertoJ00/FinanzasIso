import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import initSqlJs, { Database, SqlValue } from 'sql.js';

const SQLITE_STORAGE_KEY = 'finanzas_cheques_db';
const LEGACY_STORAGE_KEY = 'finanzas_cheques_db_v2';
const INDEXED_DB_NAME = 'finanzas_iso';
const INDEXED_DB_STORE = 'sqlite_files';
const INDEXED_DB_KEY = 'principal';
const LEGACY_MIGRATION_KEY = 'legacy_json_v2_migrated';

interface LegacyTable {
  rows?: Record<string, unknown>[];
}

interface LegacyDatabase {
  tables?: Record<string, LegacyTable>;
}

const TABLE_COLUMNS: Record<string, string[]> = {
  beneficiarios: [
    'id', 'nombre', 'apellido', 'tipoDocumento', 'numeroDocumento', 'telefono',
    'correo', 'banco', 'cuentaBancaria', 'estado'
  ],
  cheques: [
    'id', 'numeroCheque', 'tipo', 'beneficiarioId', 'monto', 'concepto',
    'estado', 'fecha', 'observaciones'
  ],
  bancos: ['id', 'nombre', 'codigo', 'estado'],
  conceptos: ['id', 'nombre', 'estado'],
  usuarios: [
    'id', 'nombreUsuario', 'nombreCompleto', 'correo', 'rol', 'estado', 'passwordHash'
  ],
  auditoria: ['id', 'fecha', 'usuario', 'entidad', 'entidadId', 'accion', 'detalle']
};

/**
 * SQLite database powered by sql.js.
 *
 * SQLite runs in memory and its binary file is persisted in IndexedDB after
 * every write. Data from the previous JSON backend and from the first SQLite
 * localStorage integration is recovered automatically.
 */
@Injectable({ providedIn: 'root' })
export class DatabaseService {
  private readonly isBrowser: boolean;
  private database: Database | null = null;
  private storageDatabase: IDBDatabase | null = null;
  private readonly readyPromise: Promise<void>;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.readyPromise = this.initialize();
  }

  public ready(): Promise<void> {
    return this.readyPromise;
  }

  public async exec(sql: string, params: unknown[] = []): Promise<void> {
    if (!this.isBrowser) return;
    const db = this.requireDatabase();
    db.run(sql, this.toSqlValues(params));
    await this.persist();
  }

  public select<T>(sql: string, params: unknown[] = []): T[] {
    if (!this.isBrowser) return [];
    const db = this.requireDatabase();
    const statement = db.prepare(sql, this.toSqlValues(params));
    const rows: T[] = [];

    try {
      while (statement.step()) {
        rows.push(statement.getAsObject() as T);
      }
    } finally {
      statement.free();
    }

    return rows;
  }

  private async initialize(): Promise<void> {
    if (!this.isBrowser) return;

    const wasmBinary = await this.loadWasmBinary();
    // Supplying the bytes directly avoids compileStreaming and therefore does
    // not depend on the web server's Content-Type configuration.
    const SQL = await initSqlJs({ wasmBinary });
    this.storageDatabase = await this.openStorageDatabase();

    const indexedDatabase = await this.loadFromIndexedDb();
    const localDatabase = localStorage.getItem(SQLITE_STORAGE_KEY);
    let databaseBytes = indexedDatabase;

    if (!databaseBytes && localDatabase) {
      try {
        databaseBytes = this.decodeBase64(localDatabase);
      } catch (error) {
        console.error('[DB] No se pudo leer la base SQLite anterior.', error);
      }
    }

    try {
      this.database = databaseBytes ? new SQL.Database(databaseBytes) : new SQL.Database();
    } catch (error) {
      console.error('[DB] No se pudo abrir la base SQLite guardada; se creará una nueva.', error);
      this.database = new SQL.Database();
    }

    this.createSchema();

    const migrationCompleted = this.select<{ value: string }>(
      'SELECT value FROM app_meta WHERE key = ?', [LEGACY_MIGRATION_KEY]
    )[0]?.value === '1';

    // A valid but empty SQLite file must not hide the previous JSON records.
    if (!migrationCompleted && localStorage.getItem(LEGACY_STORAGE_KEY)) {
      this.migrateLegacyDatabase();
    }

    await this.persist();

    // IndexedDB is now authoritative. Keep the JSON recovery backup, but free
    // the obsolete base64 SQLite copy that consumed the localStorage quota.
    if (this.storageDatabase && localDatabase) {
      localStorage.removeItem(SQLITE_STORAGE_KEY);
    }
    console.info('[DB] SQLite inicializada correctamente.');
  }

  private createSchema(): void {
    this.requireDatabase().run(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS beneficiarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        apellido TEXT NOT NULL,
        tipoDocumento TEXT NOT NULL,
        numeroDocumento TEXT NOT NULL UNIQUE,
        telefono TEXT NOT NULL DEFAULT '',
        correo TEXT NOT NULL DEFAULT '',
        banco TEXT NOT NULL DEFAULT '',
        cuentaBancaria TEXT NOT NULL UNIQUE,
        estado TEXT NOT NULL CHECK (estado IN ('Activo', 'Inactivo'))
      );

      CREATE TABLE IF NOT EXISTS cheques (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        numeroCheque TEXT NOT NULL UNIQUE,
        tipo TEXT NOT NULL CHECK (tipo IN ('Emitido', 'Recibido')),
        beneficiarioId INTEGER NOT NULL,
        monto REAL NOT NULL CHECK (monto > 0),
        concepto TEXT NOT NULL,
        estado TEXT NOT NULL CHECK (estado IN ('Pendiente', 'Cobrado', 'Anulado')),
        fecha TEXT NOT NULL,
        observaciones TEXT NOT NULL DEFAULT '',
        FOREIGN KEY (beneficiarioId) REFERENCES beneficiarios(id) ON DELETE RESTRICT
      );

      CREATE TABLE IF NOT EXISTS bancos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL UNIQUE COLLATE NOCASE,
        codigo TEXT NOT NULL DEFAULT '',
        estado TEXT NOT NULL CHECK (estado IN ('Activo', 'Inactivo'))
      );

      CREATE TABLE IF NOT EXISTS conceptos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL UNIQUE COLLATE NOCASE,
        estado TEXT NOT NULL CHECK (estado IN ('Activo', 'Inactivo'))
      );

      CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombreUsuario TEXT NOT NULL UNIQUE COLLATE NOCASE,
        nombreCompleto TEXT NOT NULL,
        correo TEXT NOT NULL UNIQUE COLLATE NOCASE,
        rol TEXT NOT NULL CHECK (rol IN ('Administrador', 'Operador', 'Consulta')),
        estado TEXT NOT NULL CHECK (estado IN ('Activo', 'Inactivo')),
        passwordHash TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS auditoria (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha TEXT NOT NULL,
        usuario TEXT NOT NULL,
        entidad TEXT NOT NULL CHECK (entidad IN ('Cheque', 'Beneficiario', 'Banco', 'Concepto', 'Usuario')),
        entidadId INTEGER NOT NULL,
        accion TEXT NOT NULL CHECK (accion IN ('Crear', 'Editar', 'Eliminar', 'Anular')),
        detalle TEXT NOT NULL DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS app_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS contabilidad_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        activo INTEGER NOT NULL DEFAULT 0 CHECK (activo IN (0, 1)),
        endpoint TEXT NOT NULL,
        auxiliarId INTEGER NOT NULL DEFAULT 5 CHECK (auxiliarId > 0),
        emitidoCuentaDebitoId INTEGER NOT NULL DEFAULT 0,
        emitidoCuentaCreditoId INTEGER NOT NULL DEFAULT 0,
        recibidoCuentaDebitoId INTEGER NOT NULL DEFAULT 0,
        recibidoCuentaCreditoId INTEGER NOT NULL DEFAULT 0,
        actualizadoEn TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS contabilidad_envios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chequeId INTEGER NOT NULL UNIQUE,
        tipo TEXT NOT NULL CHECK (tipo IN ('Emitido', 'Recibido')),
        auxiliarId INTEGER NOT NULL,
        cuentaDebitoId INTEGER NOT NULL,
        cuentaCreditoId INTEGER NOT NULL,
        descripcion TEXT NOT NULL,
        monto REAL NOT NULL CHECK (monto > 0),
        estado TEXT NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Enviado', 'Error')),
        intentos INTEGER NOT NULL DEFAULT 0,
        ultimoIntento TEXT,
        enviadoEn TEXT,
        respuesta TEXT NOT NULL DEFAULT '',
        error TEXT NOT NULL DEFAULT ''
      );

      CREATE INDEX IF NOT EXISTS idx_cheques_beneficiario ON cheques(beneficiarioId);
      CREATE INDEX IF NOT EXISTS idx_cheques_fecha ON cheques(fecha DESC);
      CREATE INDEX IF NOT EXISTS idx_cheques_estado ON cheques(estado);
      CREATE INDEX IF NOT EXISTS idx_auditoria_entidad ON auditoria(entidad, entidadId);
      CREATE INDEX IF NOT EXISTS idx_contabilidad_envios_estado ON contabilidad_envios(estado);
    `);
  }

  private migrateLegacyDatabase(): void {
    const legacyJson = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacyJson) return;

    let legacy: LegacyDatabase;
    try {
      legacy = JSON.parse(legacyJson) as LegacyDatabase;
    } catch (error) {
      console.error('[DB] Los datos anteriores no tienen un formato válido.', error);
      return;
    }

    const db = this.requireDatabase();
    const migrationOrder = [
      'beneficiarios', 'bancos', 'conceptos', 'usuarios', 'cheques', 'auditoria'
    ];
    let insertedRows = 0;
    let existingRows = 0;

    // The JSON engine allowed orphaned historical rows. Disabling foreign keys
    // only during import preserves those records instead of blocking the app.
    db.run('PRAGMA foreign_keys = OFF');
    db.run('BEGIN TRANSACTION');
    try {
      for (const table of migrationOrder) {
        const rows = legacy.tables?.[table]?.rows ?? [];
        const allowedColumns = TABLE_COLUMNS[table];

        for (const row of rows) {
          const columns = allowedColumns.filter((column) => row[column] !== undefined);
          if (columns.length === 0) continue;

          const placeholders = columns.map(() => '?').join(', ');
          const quotedColumns = columns.map((column) => `"${column}"`).join(', ');
          const values = columns.map((column) => row[column]);
          db.run(
            `INSERT OR IGNORE INTO "${table}" (${quotedColumns}) VALUES (${placeholders})`,
            this.toSqlValues(values)
          );
          if (db.getRowsModified() > 0) insertedRows++;
          else existingRows++;
        }
      }

      db.run(
        'INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)',
        [LEGACY_MIGRATION_KEY, '1']
      );
      db.run('COMMIT');
    } catch (error) {
      db.run('ROLLBACK');
      console.error('[DB] No se pudo migrar la base anterior; los datos originales se conservaron.', error);
      throw error;
    } finally {
      db.run('PRAGMA foreign_keys = ON');
    }

    console.info(
      `[DB] Migración finalizada: ${insertedRows} registros recuperados, ` +
      `${existingRows} ya existentes o duplicados.`
    );
  }

  private async persist(): Promise<void> {
    if (!this.isBrowser || !this.database) return;
    const bytes = this.database.export();
    // sql.js reopens the database during export and resets connection PRAGMAs.
    this.database.run('PRAGMA foreign_keys = ON');

    if (this.storageDatabase) {
      await new Promise<void>((resolve, reject) => {
        const transaction = this.storageDatabase!.transaction(INDEXED_DB_STORE, 'readwrite');
        transaction.objectStore(INDEXED_DB_STORE).put(bytes, INDEXED_DB_KEY);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
      return;
    }

    // Fallback for browsers where IndexedDB is unavailable.
    localStorage.setItem(SQLITE_STORAGE_KEY, this.encodeBase64(bytes));
  }

  private async openStorageDatabase(): Promise<IDBDatabase | null> {
    if (typeof indexedDB === 'undefined') return null;

    try {
      return await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(INDEXED_DB_NAME, 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(INDEXED_DB_STORE)) {
            db.createObjectStore(INDEXED_DB_STORE);
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error('La base de almacenamiento está bloqueada.'));
      });
    } catch (error) {
      console.warn('[DB] IndexedDB no está disponible; se usará localStorage.', error);
      return null;
    }
  }

  private async loadWasmBinary(): Promise<ArrayBuffer> {
    const mainScript = Array.from(document.scripts)
      .map((script) => script.src)
      .find((src) => /\/main(?:-[\w]+)?\.js(?:\?|$)/i.test(src));
    const candidates = [
      mainScript ? new URL('sql-wasm.wasm', mainScript).href : '',
      new URL('sql-wasm.wasm', document.baseURI).href,
      new URL('/sql-wasm.wasm', window.location.origin).href
    ].filter((url, index, urls) => Boolean(url) && urls.indexOf(url) === index);

    for (const url of candidates) {
      try {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) continue;

        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const hasWasmSignature =
          bytes.length >= 4 &&
          bytes[0] === 0x00 && bytes[1] === 0x61 &&
          bytes[2] === 0x73 && bytes[3] === 0x6d;
        if (hasWasmSignature) return buffer;
      } catch {
        // Try the next location. Deployments may expose assets from either
        // the bundle directory, the Angular base URL, or the origin root.
      }
    }

    throw new Error(
      `No se pudo cargar sql-wasm.wasm. Ubicaciones comprobadas: ${candidates.join(', ')}`
    );
  }

  private async loadFromIndexedDb(): Promise<Uint8Array | null> {
    if (!this.storageDatabase) return null;

    return new Promise<Uint8Array | null>((resolve, reject) => {
      const transaction = this.storageDatabase!.transaction(INDEXED_DB_STORE, 'readonly');
      const request = transaction.objectStore(INDEXED_DB_STORE).get(INDEXED_DB_KEY);
      request.onsuccess = () => {
        const value = request.result as Uint8Array | ArrayBuffer | undefined;
        if (!value) resolve(null);
        else if (value instanceof Uint8Array) resolve(value);
        else resolve(new Uint8Array(value));
      };
      request.onerror = () => reject(request.error);
    });
  }

  private requireDatabase(): Database {
    if (!this.database) {
      throw new Error('La base de datos SQLite todavía no está inicializada.');
    }
    return this.database;
  }

  private toSqlValues(params: unknown[]): SqlValue[] {
    return params.map((value) => {
      if (value === undefined || value === null) return null;
      if (typeof value === 'string' || typeof value === 'number') return value;
      if (typeof value === 'boolean') return value ? 1 : 0;
      if (value instanceof Uint8Array) return value;
      return String(value);
    });
  }

  private encodeBase64(bytes: Uint8Array): string {
    const chunkSize = 0x8000;
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
    }
    return btoa(binary);
  }

  private decodeBase64(value: string): Uint8Array {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }
}
