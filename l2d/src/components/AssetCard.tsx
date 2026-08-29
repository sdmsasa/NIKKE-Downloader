import React, { useState } from 'react';
import type { AnyAssetItem } from '../types';
import { Check, Download, ExternalLink, Sparkles, CheckCircle2 } from 'lucide-react';
import iconUnknown from '../assets/corp/icn_corp_unknown.png';

interface AssetCardProps {
  item: AnyAssetItem;
  isSelected: boolean;
  isDownloaded: boolean;
  onToggleSelect: () => void;
  onDownloadSingle: () => void;
  onOpenDetail: () => void;
}

const COMMON_CARD_STYLE = {
  cardBorder: 'bg-[#1c1c1c] hover:bg-[#242424] border-[#333333] hover:border-neutral-200 shadow-lg hover:shadow-black/40',
  selectedBorder: 'bg-[#222222] border-white ring-2 ring-white/90 shadow-xl shadow-white/10',
  imgBg: 'bg-[#f5f5f5]'
};

const TYPE_CONFIG = {
  character: {
    label: 'CHARACTER',
    ...COMMON_CARD_STYLE,
    tagBg: 'bg-[#262626] text-white border-[#383838]',
    actionBtn: 'bg-white/15 hover:bg-white text-white hover:text-neutral-950 border-white/40'
  },
  burst: {
    label: 'SKILL CUT',
    ...COMMON_CARD_STYLE,
    tagBg: 'bg-purple-950/80 text-white border-purple-700/60 font-bold',
    actionBtn: 'bg-purple-500/20 hover:bg-purple-500 text-white border-purple-500/40'
  },
  eventscene: {
    label: 'EVENT SCENE',
    ...COMMON_CARD_STYLE,
    tagBg: 'bg-emerald-950/80 text-white border-emerald-700/60 font-bold',
    actionBtn: 'bg-emerald-500/20 hover:bg-emerald-500 text-white border-emerald-500/40'
  },
  favorite: {
    label: 'FAVORITE ITEM',
    ...COMMON_CARD_STYLE,
    tagBg: 'bg-rose-950/80 text-white border-rose-700/60 font-bold',
    actionBtn: 'bg-rose-500/20 hover:bg-rose-500 text-white border-rose-500/40'
  },
  monster: {
    label: 'RAPTURE',
    ...COMMON_CARD_STYLE,
    tagBg: 'bg-red-950/80 text-white border-red-700/60 font-bold',
    actionBtn: 'bg-red-500/20 hover:bg-red-500 text-white border-red-500/40'
  }
};

export const AssetCard: React.FC<AssetCardProps> = ({
  item,
  isSelected,
  isDownloaded,
  onToggleSelect,
  onDownloadSingle,
  onOpenDetail
}) => {
  // Step-by-step high-res fallback chain
  const [imageStep, setImageStep] = useState<number>(0);
  const [copiedId, setCopiedId] = useState<boolean>(false);

  const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.character;

  const getCandidateUrls = (): string[] => {
    if (item.type === 'character') {
      return [
        item.thumbnails.hq,
        item.thumbnails.full,
        item.thumbnails.medium,
        item.thumbnails.icon,
        item.thumbnails.iconFallback || ''
      ].filter(Boolean);
    }
    if (item.type === 'burst') {
      return [
        `https://nkas.pages.dev/characters_hq/${item.characterId}.png`,
        `https://nkas.pages.dev/characters/${item.characterId}.png`,
        item.thumbnail
      ].filter(Boolean);
    }
    if (item.type === 'favorite') {
      return [
        item.wallpaper || '',
        item.sceneMi || '',
        item.sceneSi || '',
        item.icon || ''
      ].filter(Boolean);
    }
    if (item.type === 'eventscene') {
      return [
        item.sceneMi || '',
        item.sceneSi || ''
      ].filter(Boolean);
    }
    if (item.type === 'monster') {
      return [
        item.thumbnail || ''
      ].filter(Boolean);
    }
    return [];
  };

  const candidateUrls = getCandidateUrls();
  const currentThumbUrl = imageStep < candidateUrls.length ? candidateUrls[imageStep] : null;

  const handleImageError = () => {
    setImageStep(prev => prev + 1);
  };

  return (
    <div
      className={`group relative z-0 flex flex-col rounded-2xl border transition-all duration-200 overflow-hidden ${
        isSelected ? config.selectedBorder : config.cardBorder
      }`}
    >
      {/* Top Banner / Image Area (High-Res Container) */}
      <div
        onClick={onToggleSelect}
        className={`relative w-full aspect-[4/5] ${config.imgBg} flex items-center justify-center cursor-pointer overflow-hidden select-none p-1.5`}
      >
        {/* Character / Asset Foreground Image */}
        {currentThumbUrl ? (
          <img
            key={currentThumbUrl}
            src={currentThumbUrl}
            alt={item.name}
            loading="lazy"
            onError={handleImageError}
            className="relative z-[1] w-full h-full object-contain object-center drop-shadow-md group-hover:scale-105 transition-transform duration-300 image-render-crisp"
          />
        ) : (
          <div className="relative z-[1] flex items-center justify-center p-4">
            <img
              src={iconUnknown}
              alt="Fallback"
              className="w-16 h-16 object-contain invert opacity-75 drop-shadow-sm"
            />
          </div>
        )}

        {/* Selection Indicator: Pure Red V-Check mark only (No background, No border) */}
        {isSelected && (
          <div className="absolute top-2 left-2 z-[2] pointer-events-none animate-in zoom-in-75 duration-150">
            <Check className="w-6 h-6 text-red-600 stroke-[4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
          </div>
        )}

        {/* Status Badges */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 z-[2]">
          {item.isNew && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold bg-amber-500 text-neutral-950 rounded-md shadow-md animate-pulse">
              <Sparkles className="w-2.5 h-2.5" />
              NEW
            </span>
          )}
          {isDownloaded && (
            <span
              className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-md backdrop-blur-sm"
              title="다운로드 완료됨"
            >
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
              완료
            </span>
          )}
        </div>
      </div>

      {/* Info Content Area */}
      <div className="p-3 flex-1 flex flex-col justify-between gap-2 bg-[#1c1c1c]">
        <div>
          {/* Main Title (Korean display name first) */}
          <h3
            onClick={onOpenDetail}
            className="text-[13.5px] sm:text-sm font-extrabold text-neutral-100 hover:text-orange-400 transition-colors line-clamp-1 cursor-pointer tracking-tight"
            title={item.displayName || item.krName || item.name}
          >
            {item.displayName || item.krName || item.name}
          </h3>

          {/* Sub Row: Company · Squad · Org · Other metadata */}
          {item.subInfo ? (
            <p className="text-xs text-neutral-400 line-clamp-1 mt-0.5 font-medium">
              {item.subInfo}
            </p>
          ) : (
            <p className="text-xs text-neutral-500 line-clamp-1 mt-0.5 font-medium">
              {item.name}
            </p>
          )}

          {/* Same Row: ID + Type / Pose Tags (Center Aligned) */}
          <div className="flex items-center justify-center gap-1 mt-2 flex-wrap">
            {/* ID Badge (Click to copy) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(item.id);
                setCopiedId(true);
                setTimeout(() => setCopiedId(false), 1500);
              }}
              className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-[#262626] hover:bg-[#333333] text-white border border-[#383838] transition-colors cursor-pointer"
              title="클릭하여 ID 복사"
            >
              {copiedId ? '복사됨' : item.id}
            </button>

            {item.type === 'character' ? (
              (item.poses || ['idle']).map((pose) => (
                <span
                  key={pose}
                  className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-[#262626] text-white border border-[#383838] capitalize"
                >
                  {pose}
                </span>
              ))
            ) : (
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase ${config.tagBg}`}>
                {config.label}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-[#2a2a2a]">
          <button
            onClick={onOpenDetail}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-[#262626] hover:bg-[#333333] text-[11px] font-medium text-white transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3 h-3" />
            <span>상세보기</span>
          </button>

          <button
            onClick={onDownloadSingle}
            className={`flex items-center justify-center p-1.5 rounded-lg border transition-colors ${config.actionBtn}`}
            title="이 모델만 즉시 다운로드"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
