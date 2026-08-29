import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const metaPath = 'C:/Users/sdmsa/내 드라이브/Obsidian/Obsidian/NIKKE/Settings/CHARACTERS_META.md';
const settingsDir = 'C:/Users/sdmsa/내 드라이브/Obsidian/Obsidian/NIKKE/Settings';
const targetFile = path.resolve(__dirname, '../src/data/translations.ts');

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
  processInfo(info.other).forEach((o) => addItem(o));

  return totalItems.join(' · ');
}

function run() {
  const idToKorean = {};
  const idToSubInfo = {};
  const nameToKorean = {};
  const nameToSubInfo = {};

  // 1. Read company markdown files for company/squad/other subInfo metadata
  const companyFiles = ['ELYSION.md', 'MISSILIS.md', 'TETRA.md', 'PILGRIM.md', 'ABNORMAL.md', 'HERETIC.md', 'NPC.md', 'EXTRA.md'];
  for (const compFile of companyFiles) {
    const filePath = path.join(settingsDir, compFile);
    if (!fs.existsSync(filePath)) continue;
    const compContent = fs.readFileSync(filePath, 'utf8');
    const compLines = compContent.split('\n');
    for (const cLine of compLines) {
      const trimmed = cLine.trim();
      if (!trimmed.startsWith('|') || trimmed.includes('공식 ID') || trimmed.includes('---')) continue;
      const cols = trimmed.split('|').map(s => s.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
      if (cols.length >= 10) {
        const [id, charName, altName, skinName, squad, squad2, org, color, other, company, company2] = cols;
        if (!id || id === '-') continue;
        const cleanAlt = altName && altName !== '-' ? altName : '';
        const cleanSkin = skinName && skinName !== '-' ? skinName : '';
        const displayName = formatCharacterDisplayName({
          name: charName,
          alternate: cleanAlt,
          variant: cleanSkin
        }, charName);
        idToKorean[id] = displayName;

        const subInfo = formatSubInfo({ company, company2, squad, squad2, org, other });
        if (subInfo) {
          idToSubInfo[id] = subInfo;
        }
      }
    }
  }

  // 2. Read CHARACTERS_META.md for comprehensive ID and English mappings
  if (fs.existsSync(metaPath)) {
    const content = fs.readFileSync(metaPath, 'utf8');
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('|') || trimmed.includes('공식 ID') || trimmed.includes('---')) continue;
      const cols = trimmed.split('|').map(s => s.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
      if (cols.length >= 8) {
        const [id, engSlug, charName, skinName, altName, role, krSearchKey, krDisplayName] = cols;
        if (!id || id === '-') continue;

        const finalDisplayName = krDisplayName && krDisplayName !== '-' ? krDisplayName : formatCharacterDisplayName(null, krSearchKey);
        
        idToKorean[id] = finalDisplayName;

        const subInfo = idToSubInfo[id] || (role && role !== '-' && role !== 'Base' ? role : undefined);

        if (engSlug && engSlug !== '-') {
          nameToKorean[engSlug.toLowerCase()] = finalDisplayName;
          const noUnderscore = engSlug.replace(/_/g, ' ').toLowerCase();
          nameToKorean[noUnderscore] = finalDisplayName;
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
        }
      }
    }
  }

  // 3. Preserve any additional keys from existing translations.ts
  const existingContent = fs.readFileSync(targetFile, 'utf8');
  const nameToKoreanRegex = /"([^"]+)":\s*"([^"]+)"/g;
  let match;
  let inNameToKorean = false;

  for (const line of existingContent.split('\n')) {
    if (line.includes('export const NAME_TO_KOREAN')) {
      inNameToKorean = true;
      continue;
    }
    if (line.includes('export const ID_TO_SUBINFO') || line.includes('export function getKoreanName')) {
      inNameToKorean = false;
    }
    if (inNameToKorean) {
      while ((match = nameToKoreanRegex.exec(line)) !== null) {
        const [_, key, oldVal] = match;
        const newVal = formatCharacterDisplayName(null, oldVal);
        if (!nameToKorean[key.toLowerCase()]) {
          nameToKorean[key.toLowerCase()] = newVal;
        }
      }
    }
  }

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

  const output = `// Auto-generated Korean name & metadata mappings from Obsidian NIKKE Settings
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
    const prefix = lower.split(/[:\\-]/)[0].trim();
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
    const prefix = lower.split(/[:\\-]/)[0].trim();
    if (NAME_TO_SUBINFO[prefix]) return NAME_TO_SUBINFO[prefix];
  }

  return undefined;
}
`;

  fs.writeFileSync(targetFile, output, 'utf8');
  console.log(`Successfully generated translations.ts with ${Object.keys(idToKorean).length} IDs, ${Object.keys(idToSubInfo).length} subInfo entries, and ${Object.keys(nameToKorean).length} name keys.`);
}

run();
