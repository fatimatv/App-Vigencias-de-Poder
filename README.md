# App Vigencias de Poder

Aplicacion web para registrar empresas, cargar certificados PDF de vigencia de poder SUNARP, extraer su texto con `pdf.js` y mantener un repositorio local de apoderados, alertas y vencimientos.

## Stack

- React 19 + Vite
- TypeScript
- Tailwind CSS
- Dexie / IndexedDB para almacenamiento local
- `pdfjs-dist` para extraccion de texto desde PDFs

## Funcionalidades principales

- Registro de empresas con RUC, partida registral y oficina registral.
- Carga de certificados PDF SUNARP.
- Extraccion de texto y parseo inicial de fecha, numero de publicidad y apoderados.
- Seguimiento del estado de cada vigencia: vigente, proxima o vencida.
- Consulta por empresa, RUC o apoderado.
- Almacenamiento local en el navegador.

## Desarrollo local

Requisitos:

- Node.js 20 o superior recomendado
- npm

Instalacion y arranque:

```bash
npm install
npm run dev
```

La aplicacion queda disponible en `http://localhost:5173`.

## Scripts

```bash
npm run dev
npm run build
npm run test
```

## Datos y almacenamiento

La informacion se guarda en IndexedDB dentro del navegador. Eso significa que los datos no se sincronizan automaticamente entre equipos o navegadores.

## Deploy

El proyecto ya tiene enlace local a Vercel mediante `.vercel/project.json`, con el nombre de proyecto `app-vigencias-de-poder`.

Para publicar una nueva version:

1. Sube cambios a GitHub.
2. Si el proyecto de Vercel ya esta conectado a este repositorio, el despliegue puede dispararse automaticamente.
3. Si no existe esa conexion, puedes enlazarlo o desplegarlo manualmente con Vercel CLI desde esta misma carpeta.

## Repositorio

GitHub: https://github.com/fatimatv/App-Vigencias-de-Poder