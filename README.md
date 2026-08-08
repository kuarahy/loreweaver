# LoreWeaver — Campaign Map

A **map-first campaign board** for tabletop RPGs. Drill from world → region → location, pin NPCs, quests, and lore, export your data as JSON. No account required.

**Share it with your table:** deploy the static app (free on Vercel), optionally add a hosted backend so players open one link and explore between sessions.

---

## Getting Started

Open `index.html` in a browser — no server required. IndexedDB stores everything locally.

On first load, a **Forgotten Realms Sword Coast** sample is imported automatically so you can explore how the tool works.

### Add your map image

1. Copy a map PNG into `assets/maps/faerun-sword-coast.png` (or any filename).
2. Set the **Image URL** on the world or region entity — e.g. `/assets/maps/faerun-sword-coast.png`.
3. Drag markers to align with your map.

Use maps you have the right to use. LoreWeaver does not ship copyrighted map art.

---

## Sample world

The bundled demo covers **Faerûn — The Sword Coast** with one detailed region (**Sword Coast North** / *Lost Mine of Phandelver*–style):

- World map with major coast cities as pins
- Phandalin, Triboar Trail, Cragmaw Castle, Wave Echo Cave, Redbrand Hideout
- NPCs, factions, quests, items, events, and a welcome note
- All 9 entity types represented

Place names are familiar D&D reference points for the demo only — **export and replace** with your own campaign.

Also available as import file: `samples/sword-coast.loreweaver.json`

> **Critical Role / Vox Machina:** Characters and story are Critical Role IP — not included as bundled sample data. You can import your own CR campaign via Worlds → Import once you build it.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+F` | Focus search |
| `Ctrl+N` | New entity (when a world is open) |
| `Esc` | Dismiss sidebar / modals / context menu |

---

## Mouse Controls

| Action | How |
|--------|-----|
| Navigate into a region or location | Left-click its map marker |
| Open entity details | Left-click any NPC / Quest / Item / etc. |
| Open entity in new tab | **Middle-click** any marker |
| Context menu (edit, delete...) | **Right-click** any marker |
| Add entity at a map position | **Right-click** empty map area |
| Reposition a marker | Click and drag |
| Go back up a level | Breadcrumb trail or **Back** button |

---

## Entity Types

| Icon | Type | Navigable | Typical parent |
|------|------|-----------|----------------|
| 🌍 | World | — | Root |
| 🗺️ | Region | ✓ | World |
| 📍 | Location | ✓ | World, Region |
| 👤 | NPC | | Region, Location |
| ⚔️ | Faction | | Any |
| 📜 | Quest | | Any |
| 💎 | Item | | Any |
| ⚡ | Event | | Any |
| 📝 | Note | | Any |

Navigable entities (Region, Location) can be drilled into — left-clicking them zooms in and shows their children on the map.

---

## Data Storage

- **Local mode** (default): IndexedDB, persists in your browser.
- **Hosted mode** (coming soon): share a link with your players — reference backend in progress.

**Export / Import**: 🌐 Worlds → Export saves a `.loreweaver.json` file; Import loads one back. Export regularly as backup.

---

## Deploy for your group

Static deploy (map only, each person’s browser stores data locally):

```bash
npx vercel deploy --prod
```

Hosted shared campaign (GM edits, players read the same world) — see `HOSTING.md` when available.

---

## Project Structure

```
loreweaver/
├── index.html
├── assets/maps/        # Your campaign map images
├── samples/            # Importable .loreweaver.json files
├── css/styles.css
├── js/
│   ├── sample-data.js  # Sword Coast sample (first-run import)
│   └── …
└── README.md
```
