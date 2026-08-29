import type { CharacterItem, BurstItem, MonsterItem, FavoriteItem, EventSceneItem, CharacterPose } from '../types';
import { getKoreanName } from '../data/translations';
import characterPosesData from '../data/characterPoses.json';

const L2D_BASE = 'https://nkas-l2d.pages.dev';
const MAIN_BASE = 'https://nkas.pages.dev';
const CACHE_KEY = 'nikke_cached_nkas_data_v3';

export interface FetchedData {
  characters: CharacterItem[];
  bursts: BurstItem[];
  monsters: MonsterItem[];
  favorites: FavoriteItem[];
  eventScenes: EventSceneItem[];
  newIds: Set<string>;
  aliases: Record<string, string[]>;
  colors: Record<string, string>;
  cachedAt?: number;
}

export function getCharacterPoseFileName(charId: string, pose: CharacterPose): string {
  if (pose === 'idle') return charId;
  if (pose === 'aim') return charId.replace('_', '_aim_');
  if (pose === 'cover') return charId.replace('_', '_cover_');
  return charId;
}

export function extractBaseCharacterId(burstId: string): string {
  const m1 = burstId.match(/^(c\d+)_(?:sk[i|l]llcut)_(\d+)$/i);
  if (m1) return `${m1[1]}_${m1[2]}`;
  const m2 = burstId.match(/^(c\d+_\d+)_(?:sk[i|l]llcut)/i);
  if (m2) return m2[1];
  return burstId.replace(/_sk[i|l]llcut.*$/i, '');
}

/**
 * Retrieve cached NKAS metadata from localStorage
 */
export function getCachedNKASData(): FetchedData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.characters) && parsed.characters.length > 0) {
      return {
        ...parsed,
        newIds: new Set(parsed.newIdsList || [])
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Save NKAS metadata to localStorage cache
 */
export function saveNKASDataToCache(data: FetchedData): void {
  try {
    const toSave = {
      ...data,
      newIdsList: Array.from(data.newIds),
      cachedAt: Date.now()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.warn('Failed to save NKAS data to localStorage cache', e);
  }
}

export async function fetchAllNKASData(forceRefresh: boolean = false): Promise<FetchedData> {
  const cached = getCachedNKASData();
  // If cache exists and not forced, return cached data
  if (cached && !forceRefresh) {
    // Silently refresh in background
    setTimeout(() => {
      fetchFreshNKASData(false).then(fresh => {
        saveNKASDataToCache(fresh);
      }).catch(() => {});
    }, 1000);
    return cached;
  }

  const fresh = await fetchFreshNKASData(forceRefresh);
  saveNKASDataToCache(fresh);
  return fresh;
}

async function fetchFreshNKASData(forceRefresh: boolean = false): Promise<FetchedData> {
  const cacheBust = forceRefresh ? `?t=${Date.now()}` : '';
  const fetchOptions: RequestInit = forceRefresh ? { cache: 'no-cache' } : {};

  const [
    charsRes,
    burstsRes,
    monstersRes,
    favsRes,
    eventsRes,
    newRes,
    aliasesRes,
    colorsRes
  ] = await Promise.all([
    fetch(`${L2D_BASE}/characters.json${cacheBust}`, fetchOptions).then(r => r.json()).catch(() => ({})),
    fetch(`${L2D_BASE}/bursts.json${cacheBust}`, fetchOptions).then(r => r.json()).catch(() => ({})),
    fetch(`${L2D_BASE}/monsters.json${cacheBust}`, fetchOptions).then(r => r.json()).catch(() => ({})),
    fetch(`${L2D_BASE}/favorites.json${cacheBust}`, fetchOptions).then(r => r.json()).catch(() => ({})),
    fetch(`${L2D_BASE}/eventscenes.json${cacheBust}`, fetchOptions).then(r => r.json()).catch(() => ({})),
    fetch(`${L2D_BASE}/new.json${cacheBust}`, fetchOptions).then(r => r.json()).catch(() => ([])),
    fetch(`${MAIN_BASE}/nk_data/aliases.json${cacheBust}`, fetchOptions).then(r => r.json()).catch(() => ({})),
    fetch(`${MAIN_BASE}/nk_data/colors.json${cacheBust}`, fetchOptions).then(r => r.json()).catch(() => ({}))
  ]);

  const newIds = new Set<string>(Array.isArray(newRes) ? newRes : []);
  const posesMap = (characterPosesData || {}) as Record<string, CharacterPose[]>;

  // Process Characters (Exclude dummy/placeholder assets)
  const characters: CharacterItem[] = Object.entries(charsRes as Record<string, string>)
    .filter(([id, name]) => {
      const lowerId = id.toLowerCase();
      const lowerName = (name || '').toLowerCase();
      return !lowerId.includes('dummy') && !lowerName.includes('placeholder');
    })
    .map(([id, name]) => {
      const isNew = newIds.has(id);
      const krName = getKoreanName(name, id);
      const poses = posesMap[id] || (id.startsWith('c9') ? ['idle'] : ['idle', 'aim', 'cover']);
      return {
        id,
        name,
        krName,
        isNew,
        poses: poses as CharacterPose[],
        color: colorsRes[name] || colorsRes[id],
        thumbnails: {
          icon: `${MAIN_BASE}/characters/si_${id}_s.png`,
          iconFallback: `${MAIN_BASE}/characters_missing_si/si_${id}_s.png`,
          medium: `${MAIN_BASE}/characters/mi_${id}_s.png`,
          full: `${MAIN_BASE}/characters/${id}.png`,
          hq: `${MAIN_BASE}/characters_hq/${id}.png`
        }
      };
    });

  // Process Bursts
  const bursts: BurstItem[] = Object.entries(burstsRes as Record<string, string>)
    .filter(([id, name]) => !id.toLowerCase().includes('dummy') && !(name || '').toLowerCase().includes('placeholder'))
    .map(([id, name]) => {
      const isNew = newIds.has(id);
      const baseCharId = extractBaseCharacterId(id);
      const krName = getKoreanName(name, baseCharId);
      return {
        id,
        name,
        krName: krName ? `${krName}: 버스트` : undefined,
        characterId: baseCharId,
        isNew,
        thumbnail: `${MAIN_BASE}/characters/si_${baseCharId}_s.png`
      };
    });

  // Process Monsters / Raptures
  const monsters: MonsterItem[] = Object.entries(monstersRes as Record<string, string>)
    .filter(([id, name]) => !id.toLowerCase().includes('dummy') && !(name || '').toLowerCase().includes('placeholder'))
    .map(([id, name]) => {
      return {
        id,
        name,
        isNew: newIds.has(id),
        thumbnail: `${L2D_BASE}/monsters/${id}/default/${id}.png`
      };
    });

  // Process Favorites
  const favorites: FavoriteItem[] = Object.entries(favsRes as Record<string, { name: string }>)
    .filter(([id]) => !id.toLowerCase().includes('dummy'))
    .map(([id, val]) => {
      const charMatch = id.match(/FavoriteItemScene_(c\d+_\d+)/);
      const charId = charMatch ? charMatch[1] : undefined;
      return {
        id,
        name: typeof val === 'object' && val?.name ? val.name : String(val || id),
        characterId: charId,
        isNew: newIds.has(id),
        icon: charId ? `${MAIN_BASE}/favorite_items/si_favoriteitem_${charId}.png` : undefined,
        wallpaper: charId ? `${MAIN_BASE}/favorite_items/mi_favoriteitem_wallpaper_${charId}.png` : undefined,
        sceneSi: `${MAIN_BASE}/favorites/${id}_si.png`,
        sceneMi: `${MAIN_BASE}/favorites/${id}_mi.png`
      };
    });

  // Process Event Scenes
  const eventScenes: EventSceneItem[] = Object.entries(eventsRes as Record<string, { name: string; mi?: string }>)
    .filter(([id]) => !id.toLowerCase().includes('dummy'))
    .map(([id, val]) => {
      return {
        id,
        name: typeof val === 'object' && val?.name ? val.name : String(val || id),
        isNew: newIds.has(id),
        sceneSi: `${MAIN_BASE}/eventscenes/${id}_si.png`,
        sceneMi: `${MAIN_BASE}/eventscenes/${id}_mi.png`
      };
    });

  return {
    characters,
    bursts,
    monsters,
    favorites,
    eventScenes,
    newIds,
    aliases: aliasesRes || {},
    colors: colorsRes || {},
    cachedAt: Date.now()
  };
}

export function parseAtlasPngFiles(atlasText: string, defaultBaseName: string): string[] {
  const pngs = new Set<string>();
  const lines = atlasText.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.toLowerCase().endsWith('.png')) {
      pngs.add(line);
    }
  }
  if (pngs.size === 0) {
    pngs.add(`${defaultBaseName}.png`);
  }
  return Array.from(pngs);
}

export const AssetUrls = {
  characterPose: (charId: string, pose: CharacterPose, fileOrExt: 'atlas' | 'skel' | 'png' | string) => {
    const baseName = getCharacterPoseFileName(charId, pose);
    if (fileOrExt.endsWith('.png') || fileOrExt.endsWith('.skel') || fileOrExt.endsWith('.atlas')) {
      return `${L2D_BASE}/characters/${charId}/${pose}/${fileOrExt}`;
    }
    const cleanExt = fileOrExt.startsWith('.') ? fileOrExt.slice(1) : fileOrExt;
    return `${L2D_BASE}/characters/${charId}/${pose}/${baseName}.${cleanExt}`;
  },

  burst: (burstId: string, fileOrExt: 'atlas' | 'skel' | 'png' | string) => {
    if (fileOrExt.endsWith('.png') || fileOrExt.endsWith('.skel') || fileOrExt.endsWith('.atlas')) {
      return `${L2D_BASE}/bursts/${burstId}/${fileOrExt}`;
    }
    const cleanExt = fileOrExt.startsWith('.') ? fileOrExt.slice(1) : fileOrExt;
    return `${L2D_BASE}/bursts/${burstId}/${burstId}.${cleanExt}`;
  },

  monster: (monsterId: string, fileOrExt: 'atlas' | 'skel' | 'png' | string) => {
    if (fileOrExt.endsWith('.png') || fileOrExt.endsWith('.skel') || fileOrExt.endsWith('.atlas')) {
      return `${L2D_BASE}/monsters/${monsterId}/default/${fileOrExt}`;
    }
    const cleanExt = fileOrExt.startsWith('.') ? fileOrExt.slice(1) : fileOrExt;
    return `${L2D_BASE}/monsters/${monsterId}/default/${monsterId}.${cleanExt}`;
  },

  favorite: (favId: string, fileOrExt: 'atlas' | 'skel' | 'png' | string) => {
    if (fileOrExt.endsWith('.png') || fileOrExt.endsWith('.skel') || fileOrExt.endsWith('.atlas')) {
      return `${L2D_BASE}/favorites/${favId}/default/${fileOrExt}`;
    }
    const cleanExt = fileOrExt.startsWith('.') ? fileOrExt.slice(1) : fileOrExt;
    return `${L2D_BASE}/favorites/${favId}/default/${favId}.${cleanExt}`;
  },

  eventScene: (eventId: string, fileOrExt: 'atlas' | 'skel' | 'png' | string) => {
    if (fileOrExt.endsWith('.png') || fileOrExt.endsWith('.skel') || fileOrExt.endsWith('.atlas')) {
      return `${L2D_BASE}/eventscenes/${eventId}/${fileOrExt}`;
    }
    const cleanExt = fileOrExt.startsWith('.') ? fileOrExt.slice(1) : fileOrExt;
    return `${L2D_BASE}/eventscenes/${eventId}/${eventId}.${cleanExt}`;
  },

  characterIcon: (charId: string) => `${MAIN_BASE}/characters/si_${charId}_s.png`,
  characterMedium: (charId: string) => `${MAIN_BASE}/characters/mi_${charId}_s.png`,
  characterFull: (charId: string) => `${MAIN_BASE}/characters/${charId}.png`,
  characterHQ: (charId: string) => `${MAIN_BASE}/characters_hq/${charId}.png`,
};
