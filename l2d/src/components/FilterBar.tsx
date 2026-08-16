import React from 'react';
import { Search, X, LayoutGrid, List } from 'lucide-react';
import type { FilterState, DownloadOptions } from '../types';
import { MANUFACTURERS } from '../data/manufacturers';

interface FilterBarProps {
  filter: FilterState;
  setFilter: React.Dispatch<React.SetStateAction<FilterState>>;
  options: DownloadOptions;
  setOptions: React.Dispatch<React.SetStateAction<DownloadOptions>>;
  selectedCount: number;
  filteredCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onSelectNewOnly: () => void;
  onInvertSelection: () => void;
  onSelectUndownloadedOnly: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filter,
  setFilter,
  options,
  setOptions,
  selectedCount,
  filteredCount,
  onSelectAll,
  onDeselectAll,
  onSelectNewOnly,
  onInvertSelection,
  onSelectUndownloadedOnly
}) => {
  const [showOptionsDropdown, setShowOptionsDropdown] = React.useState(false);

  return (
    <div className="flex flex-col gap-1.5 py-0.5">
      
      {/* 1. Manufacturer (기업/소속) Filter Buttons (Enlarged Icons & Tight Spacing) */}
      {(filter.category === 'characters' || filter.category === 'bursts' || filter.category === 'favorites' || filter.category === 'updates') && (
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
          <span className="text-xs text-white font-bold mr-1 flex-shrink-0">
            기업:
          </span>
          {MANUFACTURERS.map((m) => {
            const isActive = filter.manufacturer === m.id;
            const isAll = m.id === 'all';
            return (
              <button
                key={m.id}
                onClick={() => setFilter(prev => ({ ...prev, manufacturer: m.id }))}
                className={`flex items-center justify-center gap-2 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 border cursor-pointer ${
                  isAll ? 'px-3 min-w-[46px]' : 'px-3'
                } ${
                  isActive
                    ? 'bg-[#383838] border-neutral-300 text-white font-bold shadow-sm'
                    : 'bg-[#1c1c1c] text-white border-[#2e2e2e] hover:bg-[#262626]'
                }`}
                title={m.label}
              >
                <img src={m.icon} alt="" className="w-6.5 h-6.5 object-contain" />
                {!isAll && <span className="text-white font-bold">{m.label}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* 2. Top row: Search Bar + [표시: XX개 | 선택: XX개] + View Mode Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={filter.search}
            onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
            placeholder="이름, 한글명, ID(c010), 별명 검색..."
            className="w-full pl-9 pr-8 py-2 bg-[#1c1c1c] border border-[#2e2e2e] focus:border-neutral-400 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none transition-colors shadow-inner"
          />
          {filter.search && (
            <button
              onClick={() => setFilter(prev => ({ ...prev, search: '' }))}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-neutral-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right of Search Bar: [표시: XX개 | 선택: XX개] Counter + View Mode Switcher */}
        <div className="flex items-center gap-3">
          {/* Selected & Filtered Count Display */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1c1c1c] border border-[#2e2e2e] text-xs">
            <span className="text-neutral-300">
              표시: <strong className="text-white font-bold">{filteredCount.toLocaleString()}</strong>개
            </span>
            <span className="text-neutral-600">|</span>
            <span className="text-neutral-300">
              선택: <strong className="text-white font-bold">{selectedCount.toLocaleString()}</strong>개
            </span>
          </div>

          {/* View Mode Toggle (Grid vs List) */}
          <div className="flex items-center bg-[#222222] border border-[#333333] rounded-xl p-0.5">
            <button
              onClick={() => setFilter(prev => ({ ...prev, viewMode: 'grid' }))}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                filter.viewMode === 'grid' ? 'bg-[#383838] text-white shadow-sm' : 'text-neutral-400 hover:text-white'
              }`}
              title="그리드 뷰"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setFilter(prev => ({ ...prev, viewMode: 'list' }))}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                filter.viewMode === 'list' ? 'bg-[#383838] text-white shadow-sm' : 'text-neutral-400 hover:text-white'
              }`}
              title="리스트 테이블 뷰"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* 3. Bottom row: View Filter Chips + Sort By + [Checkbox Action Buttons on the Right of ID순] */}
      <div className="flex items-center justify-between gap-2.5 flex-wrap pt-1 border-t border-[#262626]">
        
        {/* Left: View Filter Tabs & Sorting */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Download Status Filter Tabs */}
          <div className="flex items-center gap-1 bg-[#1c1c1c] border border-[#2e2e2e] rounded-lg p-0.5">
            <button
              onClick={() => setFilter(prev => ({ ...prev, onlyDownloaded: 'all' }))}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                filter.onlyDownloaded === 'all' ? 'bg-[#383838] text-white shadow-sm' : 'text-white hover:bg-[#262626]'
              }`}
              title="전체 목록 표시"
            >
              전체 보기
            </button>
            <button
              onClick={() => setFilter(prev => ({ ...prev, onlyDownloaded: 'not_downloaded' }))}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                filter.onlyDownloaded === 'not_downloaded' ? 'bg-[#383838] text-white shadow-sm' : 'text-white hover:bg-[#262626]'
              }`}
              title="아직 다운로드받지 않은 항목만 화면에 표시"
            >
              미다운로드
            </button>
            <button
              onClick={() => setFilter(prev => ({ ...prev, onlyDownloaded: 'downloaded' }))}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                filter.onlyDownloaded === 'downloaded' ? 'bg-[#383838] text-white shadow-sm' : 'text-white hover:bg-[#262626]'
              }`}
              title="이미 다운로드 완료된 항목만 화면에 표시"
            >
              다운로드 완료
            </button>
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1 text-[11px] text-white bg-[#1c1c1c] border border-[#2e2e2e] rounded-lg px-2 py-1">
            <span>정렬:</span>
            <select
              value={filter.sortBy}
              onChange={(e) => setFilter(prev => ({ ...prev, sortBy: e.target.value as any }))}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="id" className="bg-[#1c1c1c] text-white">ID순</option>
              <option value="name" className="bg-[#1c1c1c] text-white">이름순</option>
              <option value="newest" className="bg-[#1c1c1c] text-white">신규순</option>
            </select>
          </div>
        </div>

        {/* Right: Checkbox Action Buttons Group (Unified White Text) */}
        <div className="flex items-center flex-wrap gap-1.5 text-xs">
          
          {/* Select New Only Button */}
          <button
            onClick={onSelectNewOnly}
            className="px-2.5 py-1.5 bg-[#222222] hover:bg-[#2c2c2c] text-white border border-[#333333] rounded-xl font-medium shadow-sm transition-colors cursor-pointer"
            title="신규 업데이트 모델만 체크박스 자동 선택"
          >
            신규 체크
          </button>

          {/* Select All */}
          <button
            onClick={onSelectAll}
            className="px-2.5 py-1.5 bg-[#222222] hover:bg-[#2c2c2c] text-white border border-[#333333] rounded-xl transition-colors font-medium cursor-pointer"
            title="현재 목록 전체 체크"
          >
            전체 체크
          </button>

          {/* Deselect */}
          <button
            onClick={onDeselectAll}
            disabled={selectedCount === 0}
            className="px-2.5 py-1.5 bg-[#222222] hover:bg-[#2c2c2c] disabled:opacity-40 text-white border border-[#333333] rounded-xl transition-colors font-medium cursor-pointer"
            title="체크박스 선택 해제"
          >
            해제
          </button>

          {/* Invert */}
          <button
            onClick={onInvertSelection}
            className="px-2.5 py-1.5 bg-[#222222] hover:bg-[#2c2c2c] text-white border border-[#333333] rounded-xl transition-colors font-medium hidden md:flex cursor-pointer"
            title="체크 선택 반전"
          >
            반전
          </button>

          {/* Select Undownloaded */}
          <button
            onClick={onSelectUndownloadedOnly}
            className="px-2.5 py-1.5 bg-[#222222] hover:bg-[#2c2c2c] text-white border border-[#333333] rounded-xl transition-colors font-medium hidden sm:flex cursor-pointer"
            title="아직 다운로드받지 않은 항목만 체크"
          >
            미다운로드 체크
          </button>

          {/* Pose & Asset Options Dropdown Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowOptionsDropdown(prev => !prev)}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                showOptionsDropdown
                  ? 'bg-[#383838] text-white border-neutral-300'
                  : 'bg-[#222222] hover:bg-[#2c2c2c] text-white border-[#333333]'
              }`}
            >
              포즈/포맷 옵션
            </button>

            {/* Dropdown Menu */}
            {showOptionsDropdown && (
              <div className="absolute right-0 bottom-full mb-2 w-72 bg-[#1c1c1c] border border-[#333333] rounded-2xl p-4 shadow-2xl z-40 text-xs">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#2e2e2e]">
                  <span className="font-bold text-white">포즈 및 이미지 다운로드 범위</span>
                  <button
                    onClick={() => setShowOptionsDropdown(false)}
                    className="text-neutral-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Character Poses */}
                <div className="mb-3">
                  <span className="text-neutral-300 font-semibold block mb-1.5">Spine 모션 포즈</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['idle', 'aim', 'cover'] as const).map((pose) => (
                      <label
                        key={pose}
                        className={`flex items-center justify-center gap-1.5 p-1.5 rounded-lg border cursor-pointer select-none transition-all ${
                          options.poses[pose]
                            ? 'bg-[#383838] text-white border-neutral-300 font-semibold'
                            : 'bg-[#262626] text-white border-[#333333] hover:bg-[#303030]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={options.poses[pose]}
                          onChange={(e) =>
                            setOptions(prev => ({
                              ...prev,
                              poses: { ...prev.poses, [pose]: e.target.checked }
                            }))
                          }
                          className="hidden"
                        />
                        <span className="capitalize">{pose}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Extra Images */}
                <div>
                  <span className="text-neutral-300 font-semibold block mb-1.5">일러스트 / 썸네일</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { key: 'icon', label: '아이콘 (1:1)' },
                      { key: 'medium', label: '카드 (1:2)' },
                      { key: 'full', label: '전신 일러스트' },
                      { key: 'hq', label: 'HQ 스크린샷' }
                    ].map(({ key, label }) => (
                      <label
                        key={key}
                        className={`flex items-center gap-1.5 p-1.5 rounded-lg border cursor-pointer select-none transition-all ${
                          (options.includeImages as any)[key]
                            ? 'bg-[#383838] text-white border-neutral-300 font-semibold'
                            : 'bg-[#262626] text-white border-[#333333] hover:bg-[#303030]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={(options.includeImages as any)[key]}
                          onChange={(e) =>
                            setOptions(prev => ({
                              ...prev,
                              includeImages: { ...prev.includeImages, [key]: e.target.checked }
                            }))
                          }
                          className="hidden"
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
