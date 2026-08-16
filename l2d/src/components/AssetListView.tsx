import React, { useState } from 'react';
import type { AnyAssetItem } from '../types';
import { Check, Download, ExternalLink, Sparkles, CheckCircle2 } from 'lucide-react';

interface AssetListViewProps {
  items: AnyAssetItem[];
  selectedIds: Set<string>;
  downloadedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onDownloadSingle: (item: AnyAssetItem) => void;
  onOpenDetail: (item: AnyAssetItem) => void;
}

export const AssetListView: React.FC<AssetListViewProps> = ({
  items,
  selectedIds,
  downloadedIds,
  onToggleSelect,
  onDownloadSingle,
  onOpenDetail
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-[#2a2a2a] bg-[#1c1c1c] shadow-xl">
      <table className="w-full text-left text-xs text-neutral-300">
        <thead className="bg-[#161616] text-neutral-400 font-semibold uppercase tracking-wider text-[10px] border-b border-[#282828]">
          <tr>
            <th className="py-2.5 px-3 w-10 text-center">선택</th>
            <th className="py-2.5 px-2 w-24">ID</th>
            <th className="py-2.5 px-2 w-16 text-center">아이콘</th>
            <th className="py-2.5 px-3">이름 (영문 / 한글)</th>
            <th className="py-2.5 px-3 w-28">종류</th>
            <th className="py-2.5 px-3 w-20 text-center">상태</th>
            <th className="py-2.5 px-3 w-24 text-right">작업</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#262626]">
          {items.map((item) => {
            const isSelected = selectedIds.has(item.id);
            const isDownloaded = downloadedIds.has(item.id);

            // 1:1 Square Icon
            let iconUrl: string | undefined;
            if (item.type === 'character') iconUrl = item.thumbnails.icon;
            else if (item.type === 'burst') iconUrl = item.thumbnail;
            else if (item.type === 'favorite') iconUrl = item.icon || item.sceneSi;
            else if (item.type === 'eventscene') iconUrl = item.sceneSi || item.sceneMi;
            else if (item.type === 'monster') iconUrl = item.thumbnail;

            return (
              <tr
                key={item.id}
                onClick={() => onToggleSelect(item.id)}
                className={`hover:bg-[#242424] cursor-pointer transition-colors ${
                  isSelected ? 'bg-orange-500/5' : ''
                }`}
              >
                {/* Selection V-Check */}
                <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => onToggleSelect(item.id)}
                    className="w-6 h-6 flex items-center justify-center cursor-pointer"
                    title={isSelected ? '선택 해제' : '선택'}
                  >
                    {isSelected && (
                      <Check className="w-5 h-5 text-red-600 stroke-[4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)] animate-in zoom-in-75 duration-100" />
                    )}
                  </button>
                </td>

                {/* 1. ID with Click-to-copy (Placed first) */}
                <td className="py-2 px-2 w-24" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => handleCopyId(item.id)}
                    className="inline-flex items-center px-2 py-0.5 rounded bg-[#222222] hover:bg-[#2c2c2c] border border-[#333333] hover:border-neutral-400 font-mono text-[11px] text-white transition-colors cursor-pointer"
                    title="클릭하여 ID 복사"
                  >
                    <span>{copiedId === item.id ? '복사됨' : item.id}</span>
                  </button>
                </td>

                {/* 2. 1:1 Square Profile Icon (Placed next to ID) */}
                <td className="py-2 px-2 w-16">
                  <div className="w-12 h-12 mx-auto rounded-xl overflow-hidden bg-[#222222] border border-[#333333] flex items-center justify-center p-0.5 shadow-sm">
                    {iconUrl ? (
                      <img
                        src={iconUrl}
                        alt={item.name}
                        className="w-full h-full object-contain hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (item.type === 'character' && item.thumbnails.iconFallback && target.src !== item.thumbnails.iconFallback) {
                            target.src = item.thumbnails.iconFallback;
                          } else {
                            target.src = `${import.meta.env.BASE_URL}assets/icn_corp_unknown.png`;
                          }
                        }}
                      />
                    ) : (
                      <img src={`${import.meta.env.BASE_URL}assets/icn_corp_unknown.png`} alt="N/A" className="w-8 h-8 object-contain opacity-50" />
                    )}
                  </div>
                </td>

                {/* Name */}
                <td className="py-2 px-3">
                  <div
                    onClick={() => onOpenDetail(item)}
                    className="font-bold text-sm text-neutral-100 hover:text-orange-400 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <span>{item.name}</span>
                    {item.isNew && (
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold bg-amber-500 text-neutral-950 rounded shadow-sm">
                        <Sparkles className="w-2.5 h-2.5" />
                        NEW
                      </span>
                    )}
                  </div>
                  {(item as any).krName && (
                    <div className="text-xs text-neutral-400 font-medium mt-0.5">
                      {(item as any).krName}
                    </div>
                  )}
                </td>

                {/* Category Type */}
                <td className="py-2 px-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase text-white ${
                    item.type === 'burst'
                      ? 'bg-purple-950/80 border-purple-700/60'
                      : item.type === 'eventscene'
                      ? 'bg-emerald-950/80 border-emerald-700/60'
                      : item.type === 'favorite'
                      ? 'bg-rose-950/80 border-rose-700/60'
                      : item.type === 'monster'
                      ? 'bg-red-950/80 border-red-700/60'
                      : 'bg-[#282828] border-[#383838]'
                  }`}>
                    {item.type === 'burst' ? 'SKILL CUT' : item.type === 'eventscene' ? 'EVENT SCENE' : item.type === 'favorite' ? 'FAVORITE' : item.type === 'monster' ? 'RAPTURE' : 'CHARACTER'}
                  </span>
                </td>

                {/* Status */}
                <td className="py-2 px-3 text-center">
                  {isDownloaded ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-white border border-emerald-500/40">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      완료
                    </span>
                  ) : (
                    <span className="text-[11px] text-neutral-500">대기</span>
                  )}
                </td>

                {/* Actions */}
                <td className="py-2 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => onOpenDetail(item)}
                      className="p-1.5 rounded-lg bg-[#282828] hover:bg-[#333333] text-white border border-[#383838] transition-colors cursor-pointer"
                      title="상세보기"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDownloadSingle(item)}
                      className="p-1.5 rounded-lg bg-orange-500/20 hover:bg-orange-500 text-white border border-orange-500/40 transition-colors cursor-pointer shadow-sm"
                      title="다운로드"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
