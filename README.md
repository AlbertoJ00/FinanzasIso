# FinanzasIso

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.3.6.

## Base de datos

La aplicación usa SQLite en el navegador mediante `sql.js`. El archivo SQLite se mantiene en
memoria durante la sesión y se guarda de forma binaria en IndexedDB después de cada escritura.
El archivo `public/sql-wasm.wasm` se resuelve respecto a la URL base de la aplicación, por lo que
también funciona cuando se despliega dentro de una subcarpeta.

Al iniciar por primera vez, los datos del backend JSON anterior (`finanzas_cheques_db_v2`) se
migran automáticamente y de forma transaccional a SQLite. La copia JSON anterior se conserva como
respaldo de recuperación y no vuelve a importarse una vez registrada la migración.

## Integración contable

La ruta `/integraciones/contabilidad` permite activar la conexión con el WS de Contabilidad,
configurar el auxiliar y mapear las cuentas débito/crédito para cheques emitidos y recibidos.
Cuando un cheque queda `Cobrado`, se agrega a una cola SQLite y se intenta enviar sin bloquear el
CRUD. Los errores pueden reintentarse desde la pantalla y `chequeId` es único para evitar asientos
duplicados.

Las solicitudes al endpoint documentado pasan por `/api/contabilidad` para evitar bloqueos CORS.
En desarrollo esta ruta se configura mediante `proxy.conf.json`; en producción la atiende el
servidor Express de SSR.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
