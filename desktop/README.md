# Desktop Packaging Notes

This repository's Electron packaging is wired from the root `package.json`.

## Expected desktop entry files

- `desktop/main.cjs` (Electron main process entry, used by both `desktop:dev` and package builds)
- `desktop/build/icon.ico` (Windows app/installer icon)
- `desktop/build/icon.png` (source icon, convenient for future platform conversions)

## Scripts

- `npm run desktop:dev`: starts Vite dev server from `web/frontend` and then launches Electron
- `npm run desktop:build`: reuses root CLI build plus `web/frontend` build output
- `npm run desktop:package`: builds and packages Windows targets (`nsis`, `zip`) via `electron-builder`
- `npm run desktop:smoke`: launches the unpacked desktop app and probes `/api/health` and `/`
- `npm run desktop:verify`: runs package + smoke end-to-end
