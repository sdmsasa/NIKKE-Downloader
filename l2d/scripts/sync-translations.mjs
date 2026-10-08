import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultSettingsDir = 'C:/Users/sdmsa/내 드라이브/Obsidian/Obsidian/NIKKE/Settings';
const settingsDir = process.env.OBSIDIAN_SETTINGS_DIR || defaultSettingsDir;
const targetTranslationsFile = path.resolve(__dirname, '../src/data/translations.ts');
const targetManufacturersFile = path.resolve(__dirname, '../src/data/manufacturers.ts');

function findFile(dir, fileName) {
  if (!fs.existsSync(dir)) return null;
  const directPath = path.join(dir, fileName);
  if (fs.existsSync(directPath)) return directPath;
  const target = fileName.toLowerCase();
  const files = fs.readdirSync(dir);
  const found = files.find(f => f.toLowerCase() === target);
  return found ? path.join(dir, found) : null;
}

function autoBalanceParentheses(str) {
  if (!str) return str;
  let openCount = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '(') openCount++;
    else if (str[i] === ')') openCount--;
  }
  let result = str;
  while (openCount > 0) {
    result += ')';
    openCount--;
  }
  return result;
}

export function formatCharacterDisplayName(char, fallbackName = '') {
  if (char) {
    const pureName = (char.name || fallbackName || '').trim();
    const alt = (char.alternate || '').trim();
    const varnt = (char.variant || '').trim();

    if (pureName === '퀸' && (alt === '마코토' || varnt === '마코토')) {
      return '퀸 (마코토)';
    }

    const cleanAlt = alt ? alt.replace(/[()]/g, '').trim() : '';
    const cleanVar = varnt ? varnt.replace(/[()]/g, '').trim() : '';

    if (varnt && varnt !== '-') {
      if (cleanVar === '가칭' || cleanVar === '임시') {
        return `${pureName} (${cleanVar})`;
      }
      return `${pureName}: ${varnt}`;
    } else if (alt && alt !== '-') {
      if (cleanAlt === '가칭' || cleanAlt === '임시') {
        return `${pureName} (${cleanAlt})`;
      }
      return `${pureName}: ${alt}`;
    }

    if (fallbackName && fallbackName !== pureName) {
      return formatCharacterDisplayName(null, fallbackName);
    }
    return pureName;
  }

  if (!fallbackName) return '';

  const cleanName = autoBalanceParentheses(
    fallbackName.replace(/\(\s*\(\s*(.*?)\s*\)\s*\)/g, '($1)').trim()
  );

  if (/^퀸\s*[:：(]\s*마코토\s*\)?$/.test(cleanName)) {
    return '퀸 (마코토)';
  }

  const parenMatch = cleanName.match(/^(.+?)\s*\((.+)\)\s*$/);
  if (parenMatch) {
    const candPure = parenMatch[1].trim();
    const candExt = autoBalanceParentheses(parenMatch[2].trim());
    const cleanCandExt = candExt.replace(/[()]/g, '').trim();
    if (
      cleanCandExt === '가칭' ||
      cleanCandExt === '임시' ||
      (candPure === '퀸' && cleanCandExt === '마코토')
    ) {
      return `${candPure} (${cleanCandExt})`;
    }
    return `${candPure}: ${candExt}`;
  }

  const colonMatch = cleanName.match(/^(.+?)\s*[:：]\s*(.+)$/);
  if (colonMatch) {
    const candPure = colonMatch[1].trim();
    const candExt = autoBalanceParentheses(colonMatch[2].trim());
    const cleanCandExt = candExt.replace(/[()]/g, '').trim();
    if (candPure === '퀸' && cleanCandExt === '마코토') {
      return '퀸 (마코토)';
    }
    if (cleanCandExt === '가칭' || cleanCandExt === '임시') {
      return `${candPure} (${cleanCandExt})`;
    }
    return `${candPure}: ${candExt}`;
  }

  return cleanName;
}

function formatSubInfo(info) {
  const processInfo = (str, isSquad = false) => {
    if (!str || str === '-') return [];
    const list = str
      .replace(/엑스트라/g, '기타')
      .split(/[,/·|]/)
      .map((s) => s.trim())
      .filter(Boolean);
    return isSquad
      ? list.filter((s) => !['기타', 'NPC', '엑스트라', '???', '-'].includes(s))
      : list;
  };

  const totalItems = [];
  const seen = new Set();
  const addItem = (text) => {
    if (text && text !== '-' && !seen.has(text)) {
      totalItems.push(text);
      seen.add(text);
    }
  };

  processInfo(info.company).forEach((c) => addItem(c));
  processInfo(info.company2).forEach((c) => addItem(c));
  processInfo(info.squad, true).forEach((s) => addItem(s));
  processInfo(info.squad2, true).forEach((s) => addItem(s));
  processInfo(info.org).forEach((o) => addItem(o));
  processInfo(info.role).forEach((r) => addItem(r));
  processInfo(info.other).forEach((o) => addItem(o));

  return totalItems.join(' · ');
}

const COMP_FILE_TO_MANUFACTURER = {
  'ELYSION.md': 'elysion',
  'MISSILIS.md': 'missilis',
  'TETRA.md': 'tetra',
  'PILGRIM.md': 'pilgrim',
  'HERETIC.md': 'heretic',
  'ABNORMAL.md': 'abnormal',
  'NPC.md': 'other',
  'EXTRA.md': 'other'
};

const SECTION_TO_MANUFACTURER = {
  '엘리시온': 'elysion',
  '미실리스': 'missilis',
  '테트라': 'tetra',
  '필그림': 'pilgrim',
  '에덴': 'pilgrim',
  '헬레틱': 'heretic',
  '어브노멀': 'abnormal',
  'NPC': 'other',
  '기타': 'other',
  '엑스트라': 'other',
  'V.T.C.': 'other'
};

function run() {
  const idToKorean = {};
  const idToSubInfo = {};
  const nameToKorean = {};
  const nameToSubInfo = {};

  const idToManufacturer = {};
  const nameToManufacturer = {};

  // 1. Read company markdown files for company/squad/role subInfo and manufacturer
  const companyFiles = ['ELYSION.md', 'MISSILIS.md', 'TETRA.md', 'PILGRIM.md', 'HERETIC.md', 'ABNORMAL.md', 'NPC.md', 'EXTRA.md'];
  for (const compFile of companyFiles) {
    const filePath = findFile(settingsDir, compFile);
    if (!filePath || !fs.existsSync(filePath)) continue;
    const compKey = COMP_FILE_TO_MANUFACTURER[compFile] || 'other';

    const compContent = fs.readFileSync(filePath, 'utf8');
    const compLines = compContent.split('\n');
    for (const cLine of compLines) {
      const trimmed = cLine.trim();
      if (!trimmed.startsWith('|') || trimmed.includes('공식 ID') || trimmed.includes('---')) continue;
      const cols = trimmed.split('|').map(s => s.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
      if (cols.length >= 7) {
        let id, charName, altName, skinName, squad, squad2, org, _color, roleOrOther, company, company2;
        if (cols.length >= 10) {
          [id, charName, altName, skinName, squad, squad2, org, _color, roleOrOther, company, company2] = cols;
        } else {
          [id, charName, altName, skinName, squad, _color, roleOrOther] = cols;
          company = compFile.replace('.md', '');
        }
        if (!id || id === '-') continue;
        const cleanAlt = altName && altName !== '-' ? altName : '';
        const cleanSkin = skinName && skinName !== '-' ? skinName : '';
        const displayName = formatCharacterDisplayName({
          name: charName,
          alternate: cleanAlt,
          variant: cleanSkin
        }, charName);
        idToKorean[id] = displayName;

        const subInfo = formatSubInfo({ company, company2, squad, squad2, org, role: roleOrOther });
        if (subInfo) {
          idToSubInfo[id] = subInfo;
        }

        // Manufacturer mapping
        idToManufacturer[id] = compKey;
        if (charName && charName !== '-') {
          nameToManufacturer[charName.toLowerCase()] = compKey;
        }
      }
    }
  }

  // 2. Read CHARACTERS_META.md for comprehensive ID and English mappings
  const metaPath = findFile(settingsDir, 'CHARACTERS_META.md');
  if (metaPath && fs.existsSync(metaPath)) {
    const content = fs.readFileSync(metaPath, 'utf8');
    const lines = content.split('\n');
    let currentManufacturer = 'other';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('## ')) {
        const secName = trimmed.replace(/^##\s+/, '').trim();
        currentManufacturer = SECTION_TO_MANUFACTURER[secName] || 'other';
        continue;
      }
      if (!trimmed.startsWith('|') || trimmed.includes('공식 ID') || trimmed.includes('---')) continue;
      const cols = trimmed.split('|').map(s => s.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
      if (cols.length >= 7) {
        let id, engSlug, charName, _skinName, _altName, role, krSearchKey, krDisplayName;
        if (cols.length >= 8) {
          [id, engSlug, charName, _skinName, _altName, role, krSearchKey, krDisplayName] = cols;
        } else {
          [id, engSlug, charName, _skinName, _altName, role, krDisplayName] = cols;
          krSearchKey = engSlug;
        }
        if (!id || id === '-') continue;

        const finalDisplayName = krDisplayName && krDisplayName !== '-' ? krDisplayName : formatCharacterDisplayName(null, krSearchKey || charName);
        
        idToKorean[id] = finalDisplayName;

        const subInfo = idToSubInfo[id] || (role && role !== '-' && role !== 'Base' ? role : undefined);

        if (!idToManufacturer[id] || idToManufacturer[id] === 'other') {
          idToManufacturer[id] = currentManufacturer;
        }

        if (engSlug && engSlug !== '-') {
          nameToKorean[engSlug.toLowerCase()] = finalDisplayName;
          const noUnderscore = engSlug.replace(/_/g, ' ').toLowerCase();
          nameToKorean[noUnderscore] = finalDisplayName;
          nameToManufacturer[engSlug.toLowerCase()] = currentManufacturer;
          nameToManufacturer[noUnderscore] = currentManufacturer;

          if (subInfo) {
            nameToSubInfo[engSlug.toLowerCase()] = subInfo;
            nameToSubInfo[noUnderscore] = subInfo;
          }
        }
        if (charName && charName !== '-') {
          if (!nameToKorean[charName.toLowerCase()]) {
            nameToKorean[charName.toLowerCase()] = finalDisplayName;
            if (subInfo && !nameToSubInfo[charName.toLowerCase()]) {
              nameToSubInfo[charName.toLowerCase()] = subInfo;
            }
          }
          if (!nameToManufacturer[charName.toLowerCase()] || nameToManufacturer[charName.toLowerCase()] === 'other') {
            nameToManufacturer[charName.toLowerCase()] = currentManufacturer;
          }
        }
      }
    }
  }

  // 3. Preserve any additional keys from existing translations.ts
  if (fs.existsSync(targetTranslationsFile)) {
    const existingContent = fs.readFileSync(targetTranslationsFile, 'utf8');
    const kvRegex = /"([^"]+)":\s*"([^"]+)"/g;
    let match;
    let section = '';

    for (const line of existingContent.split('\n')) {
      if (line.includes('export const ID_TO_KOREAN')) {
        section = 'id_korean';
        continue;
      }
      if (line.includes('export const NAME_TO_KOREAN')) {
        section = 'name_korean';
        continue;
      }
      if (line.includes('export const ID_TO_SUBINFO')) {
        section = 'id_subinfo';
        continue;
      }
      if (line.includes('export const NAME_TO_SUBINFO')) {
        section = 'name_subinfo';
        continue;
      }
      if (line.includes('export function getKoreanName') || line.includes('export function getCharacterSubInfo')) {
        section = '';
        continue;
      }

      if (section === 'id_korean') {
        while ((match = kvRegex.exec(line)) !== null) {
          const [_, key, val] = match;
          if (!idToKorean[key]) idToKorean[key] = val;
        }
      } else if (section === 'name_korean') {
        while ((match = kvRegex.exec(line)) !== null) {
          const [_, key, val] = match;
          if (!nameToKorean[key.toLowerCase()]) nameToKorean[key.toLowerCase()] = val;
        }
      } else if (section === 'id_subinfo') {
        while ((match = kvRegex.exec(line)) !== null) {
          const [_, key, val] = match;
          if (!idToSubInfo[key]) idToSubInfo[key] = val;
        }
      } else if (section === 'name_subinfo') {
        while ((match = kvRegex.exec(line)) !== null) {
          const [_, key, val] = match;
          if (!nameToSubInfo[key.toLowerCase()]) nameToSubInfo[key.toLowerCase()] = val;
        }
      }
    }
  }

  // 4. Preserve existing manufacturers.ts keys
  if (fs.existsSync(targetManufacturersFile)) {
    const existingMfg = fs.readFileSync(targetManufacturersFile, 'utf8');
    let inIdMfg = false;
    let inNameMfg = false;
    const kvRegex = /"([^"]+)":\s*"([^"]+)"/g;
    let match;

    for (const line of existingMfg.split('\n')) {
      if (line.includes('export const ID_TO_MANUFACTURER')) {
        inIdMfg = true;
        inNameMfg = false;
        continue;
      }
      if (line.includes('export const NAME_TO_MANUFACTURER')) {
        inIdMfg = false;
        inNameMfg = true;
        continue;
      }
      if (line.includes('export function getCharacterManufacturer')) {
        inIdMfg = false;
        inNameMfg = false;
        continue;
      }

      if (inIdMfg) {
        while ((match = kvRegex.exec(line)) !== null) {
          const [_, key, val] = match;
          if (!idToManufacturer[key]) {
            idToManufacturer[key] = val;
          }
        }
      }
      if (inNameMfg) {
        while ((match = kvRegex.exec(line)) !== null) {
          const [_, key, val] = match;
          if (!nameToManufacturer[key.toLowerCase()]) {
            nameToManufacturer[key.toLowerCase()] = val;
          }
        }
      }
    }
  }

  // Write translations.ts
  const idEntries = Object.entries(idToKorean)
    .map(([k, v]) => `  "${k}": "${v}"`)
    .join(',\n');

  const subInfoEntries = Object.entries(idToSubInfo)
    .map(([k, v]) => `  "${k}": "${v}"`)
    .join(',\n');

  const nameEntries = Object.entries(nameToKorean)
    .map(([k, v]) => `  "${k}": "${v}"`)
    .join(',\n');

  const nameSubInfoEntries = Object.entries(nameToSubInfo)
    .map(([k, v]) => `  "${k}": "${v}"`)
    .join(',\n');

  const translationsOutput = `// Auto-generated Korean name & metadata mappings from Obsidian NIKKE Settings
export const ID_TO_KOREAN: Record<string, string> = {
${idEntries}
};

export const ID_TO_SUBINFO: Record<string, string> = {
${subInfoEntries}
};

export const NAME_TO_KOREAN: Record<string, string> = {
${nameEntries}
};

export const NAME_TO_SUBINFO: Record<string, string> = {
${nameSubInfoEntries}
};

export function getKoreanName(name: string, id?: string): string | undefined {
  if (id) {
    const cleanId = id.toLowerCase().trim();
    const baseId = cleanId.split('_')[0];
    if (ID_TO_KOREAN[cleanId]) return ID_TO_KOREAN[cleanId];
    if (ID_TO_KOREAN[baseId]) return ID_TO_KOREAN[baseId];
  }

  if (name) {
    const lower = name.toLowerCase().trim();
    if (NAME_TO_KOREAN[lower]) return NAME_TO_KOREAN[lower];
    const prefix = lower.split(/[:-]/)[0].trim();
    if (NAME_TO_KOREAN[prefix]) return NAME_TO_KOREAN[prefix];
  }

  return undefined;
}

export function getCharacterSubInfo(id?: string, name?: string): string | undefined {
  if (id) {
    const cleanId = id.toLowerCase().trim();
    const baseId = cleanId.split('_')[0];
    if (ID_TO_SUBINFO[cleanId]) return ID_TO_SUBINFO[cleanId];
    if (ID_TO_SUBINFO[baseId]) return ID_TO_SUBINFO[baseId];
  }

  if (name) {
    const lower = name.toLowerCase().trim();
    if (NAME_TO_SUBINFO[lower]) return NAME_TO_SUBINFO[lower];
    const prefix = lower.split(/[:-]/)[0].trim();
    if (NAME_TO_SUBINFO[prefix]) return NAME_TO_SUBINFO[prefix];
  }

  return undefined;
}
`;

  fs.writeFileSync(targetTranslationsFile, translationsOutput, 'utf8');
  console.log(`Successfully generated translations.ts with ${Object.keys(idToKorean).length} IDs, ${Object.keys(idToSubInfo).length} subInfo entries, and ${Object.keys(nameToKorean).length} name keys.`);

  // Write manufacturers.ts
  const idMfgEntries = Object.entries(idToManufacturer)
    .map(([k, v]) => `  "${k}": "${v}"`)
    .join(',\n');

  const nameMfgEntries = Object.entries(nameToManufacturer)
    .map(([k, v]) => `  "${k}": "${v}"`)
    .join(',\n');

  const manufacturersOutput = `import iconCorpAll from '../assets/corp/icn_corp_all.png';
import iconElysion from '../assets/corp/ELYSION.webp';
import iconMissilis from '../assets/corp/MISSILIS.webp';
import iconTetra from '../assets/corp/TETRA.webp';
import iconPilgrim from '../assets/corp/PILGRIM.webp';
import iconHeretic from '../assets/corp/HERETIC.webp';
import iconAbnormal from '../assets/corp/ABNORMAL.webp';
import iconUnknown from '../assets/corp/icn_corp_unknown.png';

// Auto-generated from Obsidian NIKKE Settings
export type ManufacturerType = 'all' | 'elysion' | 'missilis' | 'tetra' | 'pilgrim' | 'heretic' | 'abnormal' | 'other';

export interface ManufacturerInfo {
  id: ManufacturerType;
  label: string;
  enLabel: string;
  color: string;
  badgeBg: string;
  icon: string;
}

export const MANUFACTURERS: ManufacturerInfo[] = [
  { id: 'all', label: 'ALL', enLabel: 'All', color: 'text-neutral-200', badgeBg: 'bg-[#333333] text-white', icon: iconCorpAll },
  { id: 'elysion', label: '엘리시온', enLabel: 'Elysion', color: 'text-blue-400', badgeBg: 'bg-blue-950/80 text-blue-300 border-blue-600/50', icon: iconElysion },
  { id: 'missilis', label: '미실리스', enLabel: 'Missilis', color: 'text-emerald-400', badgeBg: 'bg-emerald-950/80 text-emerald-300 border-emerald-600/50', icon: iconMissilis },
  { id: 'tetra', label: '테트라', enLabel: 'Tetra', color: 'text-amber-400', badgeBg: 'bg-amber-950/80 text-amber-300 border-amber-600/50', icon: iconTetra },
  { id: 'pilgrim', label: '필그림', enLabel: 'Pilgrim', color: 'text-purple-400', badgeBg: 'bg-purple-950/80 text-purple-300 border-purple-600/50', icon: iconPilgrim },
  { id: 'heretic', label: '헬레틱', enLabel: 'Heretic', color: 'text-red-400', badgeBg: 'bg-red-950/80 text-red-300 border-red-600/50', icon: iconHeretic },
  { id: 'abnormal', label: '어브노멀', enLabel: 'Abnormal', color: 'text-rose-400', badgeBg: 'bg-rose-950/80 text-rose-300 border-rose-600/50', icon: iconAbnormal },
  { id: 'other', label: '기타', enLabel: 'Other', color: 'text-neutral-400', badgeBg: 'bg-neutral-800 text-neutral-300 border-neutral-600/60', icon: iconUnknown }
];

export const ID_TO_MANUFACTURER: Record<string, ManufacturerType> = {
${idMfgEntries}
};

export const NAME_TO_MANUFACTURER: Record<string, ManufacturerType> = {
${nameMfgEntries}
};

export function getCharacterManufacturer(id: string, name?: string): ManufacturerType {
  if (!id && !name) return 'all';
  const cleanId = (id || '').toLowerCase().trim();
  const baseId = cleanId.split('_')[0];

  // 1. Check exact ID or base ID
  if (ID_TO_MANUFACTURER[cleanId]) return ID_TO_MANUFACTURER[cleanId];
  if (ID_TO_MANUFACTURER[baseId]) return ID_TO_MANUFACTURER[baseId];

  // 2. Check Collab pattern c8xx
  if (/^c8\\d{2}/.test(cleanId)) return 'abnormal';

  // 3. Check exact or prefix name
  if (name) {
    const lowerName = name.toLowerCase().trim();
    if (NAME_TO_MANUFACTURER[lowerName]) return NAME_TO_MANUFACTURER[lowerName];
    const prefix = lowerName.split(/[:-]/)[0].trim();
    if (NAME_TO_MANUFACTURER[prefix]) return NAME_TO_MANUFACTURER[prefix];
  }

  return 'other';
}
`;

  fs.writeFileSync(targetManufacturersFile, manufacturersOutput, 'utf8');
  console.log(`Successfully generated manufacturers.ts with ${Object.keys(idToManufacturer).length} IDs and ${Object.keys(nameToManufacturer).length} name keys.`);
}

run();
