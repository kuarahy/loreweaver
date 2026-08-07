# LoreWeaver — Campaign Engine

A visual, interactive storyboard engine for managing tabletop RPG campaigns — or any fictional world. Generic by design: D&D, Pathfinder, homebrew, sci-fi, whatever.

---

## Getting Started

Open `index.html` directly in a browser — no server required. IndexedDB handles all storage locally.

On first load the sample world **Eldenmoor** is automatically imported so you can explore immediately.

To switch to hosted/REST storage, append `?mode=hosted&api=https://your-backend/api` to the URL.

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

- **Local mode** (default): IndexedDB, persists in the browser indefinitely.
- **Hosted mode** (`?mode=hosted&api=...`): REST adapter, same static files.

**Export / Import**: open the 🌐 Worlds panel → Export saves a `.loreweaver.json` file; Import loads one back. Export regularly as a backup since browser storage can be cleared.

---

## Custom Map Images

Set the **Image URL** field on any World, Region, or Location to use a real map as the background. Markers sit on top at their percentage-based coordinates — drag them to reposition after changing the image.

---

## Project Structure

```
loreweaver/
├── index.html          # App shell and script load order
├── css/
│   └── styles.css      # Dark fantasy UI (navy + gold)
├── js/
│   ├── utils.js        # escHtml(), ContextMenu singleton
│   ├── store.js        # IndexedDB LocalAdapter, REST ServerAdapter
│   ├── engine.js       # Entity CRUD, hierarchy, world-entity index
│   ├── map.js          # Map canvas, markers, zoom animation, drag
│   ├── sidebar.js      # Entity detail panel
│   ├── editor.js       # Create / edit / delete entity modal
│   ├── sample-data.js  # Starter world (Eldenmoor)
│   └── app.js          # Bootstrap, navigation stack, search, world manager
└── README.md
```
