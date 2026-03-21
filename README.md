# VibeBill

A fast, offline-first desktop application for managing invoices, customers, and products. Built for freelancers and small businesses who value data privacy and simplicity.

![VibeBill Screenshot](screenshot.png)

## Features

- **Dashboard**: Overview of open invoices, monthly revenue, and top customers.
- **Invoice Management**: Create, edit, duplicate, and export invoices as PDF. Track partial payments per invoice.
- **Seller Profiles**: Multiple seller identities with individual branding, bank details, and invoice defaults.
- **Customer & Product Catalogs**: Reusable clients and products/services for fast invoice creation.
- **EU VAT Support**: Dropdown with all 16 standard EU VAT rates across all relevant input fields.
- **PDF Export**: Three PDF templates (Classic, Modern, Minimal) with automatic tax breakdown, shipping costs, and brand colours.
- **CSV Export**: Export filtered invoice lists for use in spreadsheets or accounting tools.
- **Yearly Overview**: Generate a per-seller yearly revenue summary PDF.
- **Dark Mode**: Full light and dark theme support.
- **Bilingual**: German and English interface.
- **Local & Private**: 100% offline. Data is stored in a local SQLite database — no cloud, no subscriptions, no tracking.
- **Backup & Restore**: Export and import the `.db` file directly from Settings.

## Technology Stack

| | |
|---|---|
| Desktop framework | [Tauri v2](https://v2.tauri.app/) (Rust) |
| Frontend | [Vue 3](https://vuejs.org/) + TypeScript |
| Build tool | [Vite](https://vitejs.dev/) |
| Database | SQLite via Tauri SQL plugin |
| Financial precision | [decimal.js](https://mikemcl.github.io/decimal.js/) |
| Icons | [Lucide](https://lucide.dev/) |
| Typography | Plus Jakarta Sans |

## Download

Pre-built binaries for Linux, Windows, and macOS are available under [Releases](https://github.com/Psychotoxical/vibebill/releases).

| Platform | Formats |
|---|---|
| Linux | `.deb`, `.rpm`, `.AppImage` |
| Windows | `.exe` (NSIS), `.msi` |
| macOS | `.dmg` (Intel + Apple Silicon) |

## Building from Source

Requires [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) (Node.js, Rust, and platform dependencies).

```bash
git clone https://github.com/Psychotoxical/vibebill.git
cd vibebill
npm install

# Development
npm run tauri dev

# Production build
npm run tauri build
```

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a full version history.

## License

[GNU General Public License v3.0](LICENSE)
