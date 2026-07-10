import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const STORAGE_KEY = 'finanzas_cheques_db_v2';

interface DbTable {
  rows: Record<string, any>[];
  autoIncrement: number;
}

interface DbState {
  tables: Record<string, DbTable>;
}

/**
 * DatabaseService — Pure-JS localStorage backend.
 *
 * Replaces sql.js/WebAssembly with a lightweight JSON store that persists
 * to localStorage after every write. The public API (`select`, `exec`,
 * `ready()`) is identical to the previous implementation so all other
 * services require zero changes.
 */
@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private isBrowser: boolean;
  private db: DbState = { tables: {} };
  private _readyPromise: Promise<void>;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    this._readyPromise = this.init();
  }

  public ready(): Promise<void> {
    return this._readyPromise;
  }

  // ─── Initialisation ──────────────────────────────────────────────────────

  private async init(): Promise<void> {
    if (!this.isBrowser) return;
    // Clear stale sql.js/WASM data from the old key
    localStorage.removeItem('finanzas_cheques_db');
    this.load();
    this.createTables();
    console.log('[DB] Initialised (localStorage backend)');
  }

  private createTables(): void {
    if (!this.db.tables['beneficiarios']) {
      this.db.tables['beneficiarios'] = { rows: [], autoIncrement: 1 };
    }
    if (!this.db.tables['cheques']) {
      this.db.tables['cheques'] = { rows: [], autoIncrement: 1 };
    }
    this.save();
  }

  // ─── Persistence ─────────────────────────────────────────────────────────

  private save(): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
    } catch (e) {
      console.error('[DB] save error', e);
    }
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.db = JSON.parse(raw);
        console.log('[DB] Loaded from localStorage');
      }
    } catch (e) {
      console.error('[DB] load error — starting fresh', e);
      this.db = { tables: {} };
    }
  }

  // ─── Public Query API ────────────────────────────────────────────────────

  /**
   * Execute a write statement.
   * Supported patterns (derived automatically from the SQL string):
   *   INSERT INTO <table> (...cols) VALUES (?)
   *   UPDATE <table> SET col=?, ... WHERE id=?
   *   DELETE FROM <table> WHERE id=?
   */
  public exec(sql: string, params: any[] = []): void {
    if (!this.isBrowser) return;
    const s = sql.trim().toUpperCase();

    if (s.startsWith('INSERT')) {
      this.execInsert(sql, params);
    } else if (s.startsWith('UPDATE')) {
      this.execUpdate(sql, params);
    } else if (s.startsWith('DELETE')) {
      this.execDelete(sql, params);
    } else if (s.startsWith('CREATE')) {
      // no-op — tables are created in createTables()
    } else {
      console.warn('[DB] exec: unsupported statement', sql);
    }

    this.save();
  }

  /**
   * Execute a SELECT query. Supports:
   *   SELECT * FROM <table>
   *   SELECT * FROM <table> WHERE <col> = ?
   *   SELECT COUNT(*) as count FROM <table> [WHERE col = ?]
   *   SELECT IFNULL(SUM(col), 0) as total FROM <table> [WHERE col = ?]
   *   SELECT … JOIN … (handled for cheques + beneficiarios)
   */
  public select<T>(sql: string, params: any[] = []): T[] {
    if (!this.isBrowser) return [];

    const trimmed = sql.trim();

    // ── Aggregate queries ────────────────────────────────────────────────
    const countMatch = trimmed.match(
      /SELECT\s+COUNT\(\*\)\s+as\s+count\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+))?/i
    );
    if (countMatch) {
      const table = countMatch[1].toLowerCase();
      const whereClause = countMatch[2];
      let rows = this.getRows(table);
      if (whereClause) rows = this.applyWhere(rows, whereClause, params);
      return [{ count: rows.length } as any];
    }

    const sumMatch = trimmed.match(
      /SELECT\s+IFNULL\(SUM\((\w+)\),\s*0\)\s+as\s+total\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+))?/i
    );
    if (sumMatch) {
      const col = sumMatch[1];
      const table = sumMatch[2].toLowerCase();
      const whereClause = sumMatch[3];
      let rows = this.getRows(table);
      if (whereClause) rows = this.applyWhere(rows, whereClause, params);
      const total = rows.reduce((acc, r) => acc + (Number(r[col]) || 0), 0);
      return [{ total } as any];
    }

    // ── JOIN query (cheques + beneficiarios) ─────────────────────────────
    if (/JOIN/i.test(trimmed)) {
      return this.selectWithJoin<T>(trimmed, params);
    }

    // ── Simple SELECT ────────────────────────────────────────────────────
    const simpleMatch = trimmed.match(
      /SELECT\s+\*\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(.+?))?(?:\s+LIMIT\s+(\d+))?$/i
    );
    if (simpleMatch) {
      const table = simpleMatch[1].toLowerCase();
      const whereClause = simpleMatch[2];
      const orderClause = simpleMatch[3];
      const limit = simpleMatch[4] ? parseInt(simpleMatch[4]) : undefined;

      let rows = this.getRows(table);
      if (whereClause) rows = this.applyWhere(rows, whereClause, params);
      if (orderClause) rows = this.applyOrder(rows, orderClause);
      if (limit !== undefined) rows = rows.slice(0, limit);
      return rows as T[];
    }

    console.warn('[DB] select: unrecognised SQL', trimmed);
    return [];
  }

  // ─── INSERT ──────────────────────────────────────────────────────────────

  private execInsert(sql: string, params: any[]): void {
    // INSERT INTO beneficiarios (col1, col2, ...) VALUES (?, ?, ...)
    const match = sql.match(/INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)/i);
    if (!match) { console.error('[DB] INSERT parse error', sql); return; }

    const table = match[1].toLowerCase();
    const cols = match[2].split(',').map(c => c.trim());
    const tbl = this.db.tables[table];
    if (!tbl) { console.error('[DB] unknown table', table); return; }

    // Unique checks
    const uniqueChecks: Record<string, string[]> = {
      beneficiarios: ['numeroDocumento', 'cuentaBancaria'],
      cheques: ['numeroCheque']
    };
    for (const uCol of (uniqueChecks[table] || [])) {
      const idx = cols.indexOf(uCol);
      if (idx >= 0) {
        const val = params[idx];
        const exists = tbl.rows.some(r => r[uCol] === val);
        if (exists) throw new Error(`El campo '${uCol}' con valor '${val}' ya existe.`);
      }
    }

    const row: Record<string, any> = { id: tbl.autoIncrement++ };
    cols.forEach((col, i) => { row[col] = params[i] ?? null; });
    tbl.rows.push(row);
  }

  // ─── UPDATE ──────────────────────────────────────────────────────────────

  private execUpdate(sql: string, params: any[]): void {
    // UPDATE <table> SET col=?, col=? WHERE id=?
    const tableMatch = sql.match(/UPDATE\s+(\w+)\s+SET\s+(.+)\s+WHERE\s+(\w+)\s*=\s*\?/i);
    if (!tableMatch) { console.error('[DB] UPDATE parse error', sql); return; }

    const table = tableMatch[1].toLowerCase();
    const setPart = tableMatch[2];
    const whereCol = tableMatch[3];

    const setCols = setPart.split(',').map(s => s.trim().split(/\s*=\s*/)[0].trim());
    const setParams = params.slice(0, setCols.length);
    const whereVal = params[setCols.length];

    const tbl = this.db.tables[table];
    if (!tbl) return;

    // Unique checks for updates (exclude row being updated)
    const uniqueChecks: Record<string, string[]> = {
      beneficiarios: ['numeroDocumento', 'cuentaBancaria'],
      cheques: ['numeroCheque']
    };
    for (const uCol of (uniqueChecks[table] || [])) {
      const idx = setCols.indexOf(uCol);
      if (idx >= 0) {
        const val = setParams[idx];
        const exists = tbl.rows.some(r => r[uCol] === val && r[whereCol] !== whereVal);
        if (exists) throw new Error(`El campo '${uCol}' con valor '${val}' ya existe.`);
      }
    }

    tbl.rows = tbl.rows.map(row => {
      if (row[whereCol] !== whereVal) return row;
      const updated = { ...row };
      setCols.forEach((col, i) => { updated[col] = setParams[i]; });
      return updated;
    });
  }

  // ─── DELETE ──────────────────────────────────────────────────────────────

  private execDelete(sql: string, params: any[]): void {
    const match = sql.match(/DELETE\s+FROM\s+(\w+)\s+WHERE\s+(\w+)\s*=\s*\?/i);
    if (!match) { console.error('[DB] DELETE parse error', sql); return; }
    const table = match[1].toLowerCase();
    const col = match[2];
    const val = params[0];
    const tbl = this.db.tables[table];
    if (!tbl) return;
    tbl.rows = tbl.rows.filter(r => r[col] !== val);
  }

  // ─── JOIN ────────────────────────────────────────────────────────────────

  private selectWithJoin<T>(sql: string, params: any[]): T[] {
    const cheques: any[] = this.getRows('cheques');
    const beneficiarios: any[] = this.getRows('beneficiarios');

    let rows: any[] = cheques.map((c: any) => {
      const b: any = beneficiarios.find((bRow: any) => bRow['id'] === c['beneficiarioId']) || {};
      return {
        ...c,
        beneficiarioNombre: `${b['nombre'] || ''} ${b['apellido'] || ''}`.trim()
      };
    });

    // ORDER BY
    const orderMatch = sql.match(/ORDER BY\s+(.+?)(?:\s+LIMIT\s+\d+)?$/i);
    if (orderMatch) rows = this.applyOrder(rows, orderMatch[1]);

    // LIMIT
    const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
    if (limitMatch) rows = rows.slice(0, parseInt(limitMatch[1]));

    return rows as T[];
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private getRows(table: string): Record<string, any>[] {
    return [...(this.db.tables[table.toLowerCase()]?.rows || [])];
  }

  private applyWhere(
    rows: Record<string, any>[],
    clause: string,
    params: any[]
  ): Record<string, any>[] {
    // Only handles simple: col = ?  and  col = ? AND id != ?
    const parts = clause.trim().split(/\s+AND\s+/i);
    let paramIdx = 0;
    for (const part of parts) {
      const neqMatch = part.match(/(\w+)\s*!=\s*\?/i);
      const eqMatch = part.match(/(\w+)\s*=\s*\?/i);
      if (neqMatch) {
        const col = neqMatch[1];
        const val = params[paramIdx++];
        rows = rows.filter(r => r[col] != val);
      } else if (eqMatch) {
        const col = eqMatch[1];
        const val = params[paramIdx++];
        rows = rows.filter(r => r[col] == val);
      }
    }
    return rows;
  }

  private applyOrder(rows: Record<string, any>[], clause: string): Record<string, any>[] {
    // ORDER BY col [ASC|DESC], col2 [ASC|DESC]
    // We support a single term for simplicity
    const term = clause.trim().split(',')[0].trim();
    const parts = term.split(/\s+/);
    const col = parts[0].replace(/^[a-z]\./i, ''); // strip table alias (c., b.)
    const dir = (parts[1] || 'ASC').toUpperCase();
    return [...rows].sort((a, b) => {
      const av = a[col] ?? '';
      const bv = b[col] ?? '';
      if (av < bv) return dir === 'ASC' ? -1 : 1;
      if (av > bv) return dir === 'ASC' ? 1 : -1;
      return 0;
    });
  }
}
