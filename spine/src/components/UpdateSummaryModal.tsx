import React, { useState, useMemo, useEffect } from 'react';
import type { AnyAssetItem } from '../types';
import { X, Sparkles, Download, CheckCircle2, History, ExternalLink, Copy, Check, Search } from 'lucide-react';
import iconUnknown from '../assets/corp/icn_corp_unknown.png';

interface UpdateSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  newItems: AnyAssetItem[];
  downloadedIds?: Set<string>;
  onOpenDetail: (item: AnyAssetItem) => void;
  onDownloadSingle?: (item: AnyAssetItem) => void;
  onDownloadAllNew?: (items: AnyAssetItem[]) => void;
}

type CategoryFilter = 'all' | 'character' | 'burst' | 'favorite' | 'eventscene' | 'monster';

const CATEGORY_NAMES: Record<CategoryFilter, string> = {
  all: '전체',
  character: '캐릭터',
  burst: '스킬컷',
  favorite: '애장품',
  eventscene: '이벤트 씬',
  monster: 'RAPTURE'
};

const CATEGORY_TAG_STYLES: Record<string, string> = {
  character: 'bg-[#282828] text-white border-[#383838]',
  burst: 'bg-purple-950/80 text-purple-300 border-purple-700/60',
  eventscene: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60',
  favorite: 'bg-rose-950/80 text-rose-300 border-rose-700/60',
  monster: 'bg-red-950/80 text-red-300 border-red-700/60'
};

const CATEGORY_LABEL: Record<string, string> = {
  character: 'CHARACTER',
  burst: 'SKILL CUT',
  eventscene: 'EVENT SCENE',
  favorite: 'FAVORITE',
  monster: 'RAPTURE'
};

export const UpdateSummaryModal: React.FC<UpdateSummaryModalProps> = ({
  isOpen,
  onClose,
  newItems,
  downloadedIds,
  onOpenDetail,
  onDownloadSingle,
  onDownloadAllNew
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedName, setCopiedName] = useState<string | null>(null);

  // ESC key and body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Reset category & search on open
  useEffect(() => {
    if (isOpen) {
      setSelectedCategory('all');
      setSearchQuery('');
    }
  }, [isOpen]);

  const categoryCounts = useMemo(() => {
    return {
      all: newItems.length,
      character: newItems.filter(i => i.type === 'character').length,
      burst: newItems.filter(i => i.type === 'burst').length,
      favorite: newItems.filter(i => i.type === 'favorite').length,
      eventscene: newItems.filter(i => i.type === 'eventscene').length,
      monster: newItems.filter(i => i.type === 'monster').length
    };
  }, [newItems]);

  const filteredItems = useMemo(() => {
    let list = newItems;

    if (selectedCategory !== 'all') {
      list = list.filter(item => item.type === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(item => {
        const name = (item.displayName || item.krName || item.name || '').toLowerCase();
        const rawName = (item.name || '').toLowerCase();
        const id = item.id.toLowerCase();
        return name.includes(q) || rawName.includes(q) || id.includes(q);
      });
    }

    return list;
  }, [newItems, selectedCategory, searchQuery]);

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyName = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(name);
    setCopiedName(name);
    setTimeout(() => setCopiedName(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 cursor-pointer"
    >
      <div
        className="relative w-full max-w-2xl flex flex-col bg-[#1c1c1c] border border-[#333333] rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#282828] bg-[#161616]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">최신 업데이트 내역 요약</h2>
                {newItems.length > 0 && (
                  <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-full animate-pulse">
                    <Sparkles className="w-2.5 h-2.5 text-cyan-300" />
                    +{newItems.length} NEW
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                서버 동기화 기준 신규 등록 및 업데이트된 에셋 목록입니다.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white hover:bg-[#282828] rounded-xl transition-colors cursor-pointer"
            title="닫기 (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        {newItems.length === 0 ? (
          /* Empty State */
          <div className="py-16 px-6 flex flex-col items-center justify-center text-center gap-3 overflow-y-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white">
              현재 새로운 업데이트 내역이 없습니다. (최신 상태입니다)
            </h3>
            <p className="text-xs text-neutral-400 max-w-sm leading-relaxed">
              서버와 모든 에셋 메타데이터가 최신 상태로 동기화되어 있습니다. 신규 캐릭터나 에셋이 추가되면 이곳에 실시간으로 요약 표시됩니다.
            </p>
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Summary Statistics & Category Filter Pills */}
            <div className="px-6 py-3 border-b border-[#282828] bg-[#1a1a1a] flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs text-neutral-300">
                <span className="font-semibold text-white">
                  신규 항목: <strong className="text-cyan-400 font-bold">{newItems.length}개</strong>
                </span>
                {newItems.length > 5 && (
                  <div className="relative w-48">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="신규 항목 검색..."
                      className="w-full pl-8 pr-2.5 py-1 text-xs bg-[#121212] border border-[#333333] rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500/60"
                    />
                  </div>
                )}
              </div>

              {/* Category Badges / Filter Buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                {(['all', 'character', 'burst', 'favorite', 'eventscene', 'monster'] as CategoryFilter[]).map((cat) => {
                  const count = categoryCounts[cat];
                  if (cat !== 'all' && count === 0) return null;

                  const isActive = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap border ${
                        isActive
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-sm'
                          : 'bg-[#242424] text-neutral-400 hover:text-white border-[#333333] hover:bg-[#2c2c2c]'
                      }`}
                    >
                      <span>{CATEGORY_NAMES[cat]}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isActive ? 'bg-cyan-500/30 text-cyan-200' : 'bg-[#181818] text-neutral-400'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scrollable Items List */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
              {filteredItems.length === 0 ? (
                <div className="py-12 text-center text-xs text-neutral-500">
                  해당 조건에 맞는 신규 업데이트 항목이 없습니다.
                </div>
              ) : (
                filteredItems.map((item) => {
                  const isDownloaded = downloadedIds?.has(item.id);

                  // Resolve icon
                  let iconUrl: string | undefined;
                  if (item.type === 'character') iconUrl = item.thumbnails.icon;
                  else if (item.type === 'burst') iconUrl = item.thumbnail;
                  else if (item.type === 'favorite') iconUrl = item.icon || item.sceneSi;
                  else if (item.type === 'eventscene') iconUrl = item.sceneSi || item.sceneMi;
                  else if (item.type === 'monster') iconUrl = item.thumbnail;

                  const displayName = item.displayName || item.krName || item.name;

                  return (
                    <div
                      key={item.id}
                      onClick={() => onOpenDetail(item)}
                      className="group flex items-center justify-between p-3 rounded-xl bg-[#222222] hover:bg-[#282828] border border-[#303030] hover:border-neutral-500 transition-all cursor-pointer gap-3 shadow-sm"
                    >
                      {/* Left: Thumbnail & Name & ID */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Thumbnail */}
                        <div className="w-11 h-11 rounded-lg overflow-hidden bg-[#161616] border border-[#333333] flex items-center justify-center p-0.5 flex-shrink-0">
                          {iconUrl ? (
                            <img
                              src={iconUrl}
                              alt={item.name}
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                              loading="lazy"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                if (item.type === 'character' && item.thumbnails.iconFallback && target.src !== item.thumbnails.iconFallback) {
                                  target.src = item.thumbnails.iconFallback;
                                } else {
                                  target.src = iconUnknown;
                                }
                              }}
                            />
                          ) : (
                            <img src={iconUnknown} alt="N/A" className="w-7 h-7 object-contain opacity-50" />
                          )}
                        </div>

                        {/* Title & Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-sm text-white group-hover:text-cyan-300 transition-colors truncate">
                              {displayName}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleCopyName(displayName, e)}
                              className="p-1 text-neutral-400 hover:text-white hover:bg-[#282828] rounded-md transition-colors cursor-pointer flex-shrink-0"
                              title="이름 복사"
                            >
                              {copiedName === displayName ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                            <span className="flex items-center gap-0.5 px-1.5 py-0.2 text-[9px] font-bold bg-amber-500 text-neutral-950 rounded shadow-sm">
                              <Sparkles className="w-2.5 h-2.5" />
                              NEW
                            </span>
                            {isDownloaded && (
                              <span className="flex items-center gap-0.5 px-1.5 py-0.2 text-[9px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                                완료
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-1">
                            {/* Copyable ID */}
                            <button
                              type="button"
                              onClick={(e) => handleCopyId(item.id, e)}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#181818] hover:bg-[#2c2c2c] border border-[#2d2d2d] hover:border-neutral-400 font-mono text-[10px] text-neutral-300 transition-colors cursor-pointer select-text"
                              title="클릭하여 ID 복사"
                            >
                              <span>{item.id}</span>
                              {copiedId === item.id ? (
                                <Check className="w-2.5 h-2.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-2.5 h-2.5 text-neutral-500" />
                              )}
                            </button>

                            {item.subInfo ? (
                              <span className="text-[11px] text-neutral-400 truncate">
                                {item.subInfo}
                              </span>
                            ) : item.name && displayName !== item.name ? (
                              <span className="text-[11px] text-neutral-500 truncate">
                                {item.name}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* Right: Category badge & Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Category Badge */}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                          CATEGORY_TAG_STYLES[item.type] || 'bg-[#282828] text-white border-[#383838]'
                        }`}>
                          {CATEGORY_LABEL[item.type] || item.type.toUpperCase()}
                        </span>

                        {/* Download button */}
                        {onDownloadSingle && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDownloadSingle(item);
                            }}
                            className="p-1.5 rounded-lg bg-[#1c1c1c] hover:bg-orange-500 text-neutral-300 hover:text-white border border-[#333333] transition-all cursor-pointer"
                            title="다운로드"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Open Detail button */}
                        <button
                          type="button"
                          onClick={() => onOpenDetail(item)}
                          className="p-1.5 rounded-lg bg-[#1c1c1c] hover:bg-cyan-500/20 text-neutral-300 hover:text-cyan-300 border border-[#333333] transition-all cursor-pointer"
                          title="상세 정보 및 프리뷰 보기"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-[#282828] bg-[#161616]">
          <div className="text-xs text-neutral-400">
            {newItems.length > 0 ? (
              <span>총 <strong className="text-white">{newItems.length}개</strong> 신규 에셋</span>
            ) : (
              <span>업데이트 상태: 최신</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#222222] hover:bg-[#2c2c2c] text-neutral-300 hover:text-white text-xs font-semibold border border-[#333333] transition-colors cursor-pointer"
            >
              닫기
            </button>

            {newItems.length > 0 && onDownloadAllNew && (
              <button
                onClick={() => onDownloadAllNew(filteredItems)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-bold text-xs shadow-lg shadow-orange-500/25 active:scale-95 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>
                  {selectedCategory === 'all'
                    ? `신규 전체 다운로드 (${newItems.length}개)`
                    : `${CATEGORY_NAMES[selectedCategory]} 다운로드 (${filteredItems.length}개)`}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
