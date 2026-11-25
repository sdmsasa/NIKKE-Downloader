import React from 'react';
import { getCharacterColor } from '../data/translations';
import type { AnyAssetItem } from '../types';

interface CharacterColorBarProps {
  item: AnyAssetItem;
  className?: string;
}

const CHARACTER_BAR_TYPES = new Set(['character', 'burst', 'favorite']);

function normalizeCustomHex(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const clean = raw.replace(/[\\#]/g, '').trim().toUpperCase();
  if (!(/^[0-9A-F]{6}$/.test(clean) || /^[0-9A-F]{3}$/.test(clean))) {
    return null;
  }
  if (clean === 'FFFFFF' || clean === 'FFF') {
    return null;
  }
  return `#${clean}`;
}

/**
 * nikke-plugins NDS(nikke-dialogue-system)의 이름표 세로 컬러 바(.nds-name-bar)를 그대로 구현한 컴포넌트.
 * 캐릭터/버스트/애장품 아이템의 공식 ID 또는 이름 기반으로 색상을 판별해 표시하고,
 * 고유 색상이 없거나 #FFFFFF인 경우 기본 흰색 바(.nds-white-bar)를 렌더링합니다.
 */
export const CharacterColorBar: React.FC<CharacterColorBarProps> = ({ item, className = '' }) => {
  if (!CHARACTER_BAR_TYPES.has(item.type)) {
    return null;
  }

  const lookupId =
    item.type === 'character'
      ? item.id
      : item.type === 'burst' || item.type === 'favorite'
        ? item.characterId
        : undefined;

  const resolvedColor = item.color || getCharacterColor(lookupId, item.name);
  const customHex = normalizeCustomHex(resolvedColor);

  return (
    <span
      aria-hidden="true"
      className={`nds-name-bar ${customHex ? '' : 'nds-white-bar'} ${className}`.trim()}
      style={customHex ? { backgroundColor: customHex } : undefined}
    />
  );
};
