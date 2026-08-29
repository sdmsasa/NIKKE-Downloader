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

function run() {
  const content = fs.readFileSync(metaPath, 'utf8');
  const lines = content.split('\n');

  const idToKorean = {};
  const nameToKorean = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || trimmed.includes('공식 ID') || trimmed.includes('---')) continue;
    const cols = trimmed.split('|').map(s => s.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
    if (cols.length >= 8) {
      const [id, engSlug, charName, skinName, altName, role, krSearchKey, krDisplayName] = cols;
      if (!id || id === '-') continue;

      const finalDisplayName = krDisplayName && krDisplayName !== '-' ? krDisplayName : formatCharacterDisplayName(null, krSearchKey);
      
      idToKorean[id] = finalDisplayName;

      if (engSlug && engSlug !== '-') {
        nameToKorean[engSlug.toLowerCase()] = finalDisplayName;
        const noUnderscore = engSlug.replace(/_/g, ' ').toLowerCase();
        nameToKorean[noUnderscore] = finalDisplayName;
      }
      if (charName && charName !== '-') {
        if (!nameToKorean[charName.toLowerCase()]) {
          nameToKorean[charName.toLowerCase()] = finalDisplayName;
        }
      }
    }
  }

  // Also read company markdown files
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
      if (cols.length >= 4) {
        const [id, charName, altName, skinName] = cols;
        if (!id || id === '-' || idToKorean[id]) continue;
        const cleanAlt = altName && altName !== '-' ? altName : '';
        const cleanSkin = skinName && skinName !== '-' ? skinName : '';
        const displayName = formatCharacterDisplayName({
          name: charName,
          alternate: cleanAlt,
          variant: cleanSkin
        }, charName);
        idToKorean[id] = displayName;
      }
    }
  }

  // Read existing translations.ts to preserve any custom NAME_TO_KOREAN keys while converting values
  const existingContent = fs.readFileSync(targetFile, 'utf8');
  const nameToKoreanRegex = /"([^"]+)":\s*"([^"]+)"/g;
  let match;
  let inNameToKorean = false;

  for (const line of existingContent.split('\n')) {
    if (line.includes('export const NAME_TO_KOREAN')) {
      inNameToKorean = true;
      continue;
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

  const nameEntries = Object.entries(nameToKorean)
    .map(([k, v]) => `  "${k}": "${v}"`)
    .join(',\n');

  const output = `// Auto-generated Korean name mappings from Obsidian NIKKE Settings
export const ID_TO_KOREAN: Record<string, string> = {
${idEntries}
};

export const NAME_TO_KOREAN: Record<string, string> = {
${nameEntries}
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
`;

  fs.writeFileSync(targetFile, output, 'utf8');
  console.log(`Successfully generated translations.ts with ${Object.keys(idToKorean).length} IDs and ${Object.keys(nameToKorean).length} name keys.`);
}

run();
