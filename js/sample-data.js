// Sample world "Eldenmoor" — loaded on first run only (no saved worlds yet)
const SAMPLE_WORLD = {
  world: {
    id:          '__sample_world__',
    type:        'world',
    parentId:    null,
    name:        'Eldenmoor',
    description: 'A dying realm where ancient magic seeps through cracked earth and every torch feels one breath away from going out.',
    imageUrl:    null,
    position:    { x: 50, y: 50 },
    attributes:  { 'Calendar System': 'The Ashen Reckoning', 'Dominant Magic': 'Runic Binding', 'Era': 'Third Age of Shadow' },
    tags:        ['dark fantasy', 'runic magic', 'political intrigue'],
    gmNotes:     'Players start in Greymantle. The Veilrift is the endgame location — do not reveal too early.',
    createdAt:   '2024-01-01T00:00:00.000Z',
    updatedAt:   '2024-01-01T00:00:00.000Z',
  },
  entities: [
    // ── Regions ───────────────────────────────────────────────────────
    {
      id: '__region_greymarsh__', type: 'region', parentId: '__sample_world__',
      name: 'The Greymarsh', description: 'A fog-choked wetland stretched across the western lowlands. Lanterns burn all day. Locals never travel alone.',
      imageUrl: null, position: { x: 25, y: 60 },
      attributes: { 'Dominant Faction': 'Harrowkeep Guard', 'Danger Level': '2 / 5' },
      tags: ['swamp', 'fog', 'starting region'], gmNotes: 'Hook: the missing scout Aldwyn.',
      createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: '__region_ironspire__', type: 'region', parentId: '__sample_world__',
      name: 'Ironspire Heights', description: 'Volcanic ridgelines ring an industrial city-state powered by magma-tapped forges. Smoke never clears.',
      imageUrl: null, position: { x: 65, y: 35 },
      attributes: { 'Dominant Faction': 'Forge Conclave', 'Danger Level': '3 / 5' },
      tags: ['industrial', 'volcanic', 'forge magic'], gmNotes: '',
      createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: '__region_veilrift__', type: 'region', parentId: '__sample_world__',
      name: 'The Veilrift', description: 'A scar in reality itself — reality unravels here. Only the desperate or the damned venture inside.',
      imageUrl: null, position: { x: 80, y: 75 },
      attributes: { 'Dominant Faction': 'None', 'Danger Level': '5 / 5' },
      tags: ['endgame', 'planar', 'ruins'], gmNotes: 'Final act — the Rift must be sealed or consumed.',
      createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z',
    },

    // ── Locations (in Greymarsh) ───────────────────────────────────────
    {
      id: '__loc_greymantle__', type: 'location', parentId: '__region_greymarsh__',
      name: 'Greymantle', description: 'A town of 3 000 souls clinging to a moss-crusted hill. Every building leans. Everyone is watching.',
      imageUrl: null, position: { x: 40, y: 55 },
      attributes: { 'Population': '~3 000', 'Notable Feature': 'The Amber Lantern inn' },
      tags: ['town', 'starting location'], gmNotes: '',
      createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: '__loc_harrowkeep__', type: 'location', parentId: '__region_greymarsh__',
      name: 'Harrowkeep', description: 'A fortress of black stone rising from the bog. The Guard stationed here enforce Eldenmoor\'s outermost law — however they define it.',
      imageUrl: null, position: { x: 20, y: 40 },
      attributes: { 'Garrison': '200 guards', 'Commander': 'Warden Signe Aldric' },
      tags: ['fortress', 'military'], gmNotes: 'Warden Aldric is secretly funding the Thornbinders.',
      createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z',
    },

    // ── NPCs ──────────────────────────────────────────────────────────
    {
      id: '__npc_maren__', type: 'npc', parentId: '__loc_greymantle__',
      name: 'Maren the Inkwarden', description: 'A retired rune-scribe who runs the Greymantle archive. Hands shake, eyes sharp. She knows more than she tells.',
      imageUrl: null, position: { x: 55, y: 48 },
      attributes: { 'Role': 'Quest giver / Lore source', 'Allegiance': 'Neutral', 'Age': '62' },
      tags: ['npc', 'quest giver', 'scholar'], gmNotes: 'She holds a sealed letter from the last Veilrift expedition.',
      createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: '__npc_corvin__', type: 'npc', parentId: '__region_ironspire__',
      name: 'Corvin Ashveil', description: 'Forge Conclave\'s chief artificer. Brilliant, amoral, charming. Will sell weapons to both sides of a war if the price is right.',
      imageUrl: null, position: { x: 70, y: 30 },
      attributes: { 'Role': 'Merchant / Antagonist', 'Allegiance': 'Forge Conclave', 'Specialty': 'Runic weaponry' },
      tags: ['npc', 'merchant', 'antagonist'], gmNotes: 'Corvin is building a weapon to breach the Veilrift — for profit.',
      createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z',
    },

    // ── Factions ──────────────────────────────────────────────────────
    {
      id: '__fac_thornbinders__', type: 'faction', parentId: '__sample_world__',
      name: 'The Thornbinders', description: 'A shadow guild that claims to be preserving old magic. In practice: extortion, kidnapping, and brokering forbidden knowledge.',
      imageUrl: null, position: { x: 45, y: 30 },
      attributes: { 'Alignment': 'Chaotic Neutral', 'Size': 'Medium', 'Leader': 'Unknown' },
      tags: ['faction', 'criminal', 'magic'], gmNotes: 'Leader is Warden Aldric\'s cousin.',
      createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z',
    },

    // ── Quests ────────────────────────────────────────────────────────
    {
      id: '__quest_missing_scout__', type: 'quest', parentId: '__region_greymarsh__',
      name: 'The Missing Scout', description: 'Aldwyn, a Harrowkeep scout, vanished three days ago in the bog. His captain — reluctantly — asks for outside help.',
      imageUrl: null, position: { x: 30, y: 70 },
      attributes: { 'Status': 'Active', 'Reward': '50gp + Favor of the Guard', 'Giver': 'Captain Elna Voss' },
      tags: ['quest', 'investigation', 'starter'], gmNotes: 'Aldwyn found the Thornbinder cache — taken alive.',
      createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z',
    },

    // ── Items ─────────────────────────────────────────────────────────
    {
      id: '__item_inkblade__', type: 'item', parentId: '__loc_greymantle__',
      name: 'Inkblade Dagger', description: 'A ceremonial rune-scribe\'s knife repurposed as a weapon. Its edge writes on whatever it cuts — leaving glowing scars that never heal.',
      imageUrl: null, position: { x: 60, y: 60 },
      attributes: { 'Type': 'Weapon', 'Rarity': 'Uncommon', 'Damage': '1d4 + 1 psychic' },
      tags: ['item', 'weapon', 'magic'], gmNotes: 'Was Maren\'s before the accident.',
      createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z',
    },
  ],
};
