import React from 'react';
import type { AssetCategory } from '../types';

interface CategoryTabsProps {
  activeCategory: AssetCategory;
  onSelectCategory: (cat: AssetCategory) => void;
  counts: {
    characters: number;
    bursts: number;
    monsters: number;
    favorites: number;
    eventscenes: number;
    updates: number;
  };
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  activeCategory,
  onSelectCategory,
  counts
}) => {
  const tabs: { id: AssetCategory; label: string; count: number; highlight?: boolean }[] = [
    {
      id: 'characters',
      label: '캐릭터 (Spine)',
      count: counts.characters
    },
    {
      id: 'bursts',
      label: '버스트 스킬컷',
      count: counts.bursts
    },
    {
      id: 'monsters',
      label: 'RAPTURE',
      count: counts.monsters
    },
    {
      id: 'favorites',
      label: '애장품',
      count: counts.favorites
    },
    {
      id: 'eventscenes',
      label: '이벤트 씬',
      count: counts.eventscenes
    },
    {
      id: 'updates',
      label: '신규 업데이트',
      count: counts.updates,
      highlight: true
    }
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-1 no-scrollbar border-b border-[#2a2a2a]">
      {tabs.map((tab) => {
        const isActive = activeCategory === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectCategory(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
              isActive
                ? 'bg-[#383838] text-white border border-neutral-300 shadow-sm'
                : 'text-white hover:bg-[#222222] border border-transparent'
            }`}
          >
            <span className="text-white">{tab.label}</span>
            <span
              className={`px-1.5 py-0.5 text-[10px] rounded-full font-mono font-medium ${
                isActive
                  ? tab.highlight
                    ? 'bg-orange-500/30 text-white border border-orange-500/30'
                    : 'bg-[#484848] text-white'
                  : tab.highlight && tab.count > 0
                  ? 'bg-orange-950 text-orange-400 border border-orange-800/50'
                  : 'bg-[#222222] text-neutral-400'
              }`}
            >
              {tab.count.toLocaleString()}
            </span>
          </button>
        );
      })}
    </div>
  );
};
