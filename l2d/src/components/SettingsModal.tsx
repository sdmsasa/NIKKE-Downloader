import React from 'react';
import type { DownloadOptions } from '../types';
import { X, Settings, FolderTree, Layers, Cpu, Trash2 } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: DownloadOptions;
  setOptions: React.Dispatch<React.SetStateAction<DownloadOptions>>;
  onClearHistory: () => void;
  downloadedCount: number;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  options,
  setOptions,
  onClearHistory,
  downloadedCount
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-xl flex flex-col bg-[#1c1c1c] border border-[#333333] rounded-2xl shadow-2xl overflow-hidden max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#282828] bg-[#161616]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">다운로더 환경설정</h2>
              <p className="text-xs text-neutral-400">폴더 구조, 네이밍 규칙 및 다운로드 성능 설정</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white hover:bg-[#282828] rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex flex-col gap-6 overflow-y-auto text-xs">
          
          {/* Section 1: Folder Naming Pattern */}
          <div className="flex flex-col gap-2.5">
            <label className="font-bold text-neutral-200 flex items-center gap-1.5">
              <FolderTree className="w-4 h-4 text-orange-400" />
              <span>모델별 폴더명 생성 규칙</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { id: 'id_name', label: 'ID 이름 (대괄호 없음, 추천)', example: 'c010 Rapi' },
                { id: 'bracket_id_name', label: '[ID] 이름 (대괄호 포함)', example: '[c010] Rapi' },
                { id: 'name_id', label: '이름 ID', example: 'Rapi c010' },
                { id: 'id_only', label: 'ID만 사용', example: 'c010' },
                { id: 'name_only', label: '이름만 사용', example: 'Rapi' }
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
                    options.folderNaming === opt.id
                      ? 'bg-orange-500/15 border-orange-500/60 text-white'
                      : 'bg-[#222222] border-[#303030] text-neutral-400 hover:bg-[#282828]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{opt.label}</span>
                    <input
                      type="radio"
                      name="folderNaming"
                      value={opt.id}
                      checked={options.folderNaming === opt.id}
                      onChange={() => setOptions(prev => ({ ...prev, folderNaming: opt.id as any }))}
                      className="text-orange-500 focus:ring-0"
                    />
                  </div>
                  <span className="font-mono text-[11px] text-neutral-500 mt-1">
                    예시: {opt.example}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Section 2: Folder Hierarchy Structure */}
          <div className="flex flex-col gap-2.5 pt-4 border-t border-[#2a2a2a]">
            <label className="font-bold text-neutral-200 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-orange-400" />
              <span>하위 폴더 분류 구조</span>
            </label>

            <div className="flex flex-col gap-2">
              <label className="flex items-start justify-between p-3 rounded-xl bg-[#222222] border border-[#303030] hover:border-[#404040] cursor-pointer">
                <div>
                  <span className="font-semibold text-neutral-200 block">대분류 폴더로 자동 구분</span>
                  <span className="text-neutral-400 text-[11px]">
                    Characters/, Bursts/, Monsters/, Favorites/, EventScenes/ 폴더 아래에 생성
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={options.categorySubfolders}
                  onChange={(e) => setOptions(prev => ({ ...prev, categorySubfolders: e.target.checked }))}
                  className="rounded text-orange-500 mt-0.5"
                />
              </label>

              <label className="flex items-start justify-between p-3 rounded-xl bg-[#222222] border border-[#303030] hover:border-[#404040] cursor-pointer">
                <div>
                  <span className="font-semibold text-neutral-200 block">캐릭터 내 모션/이미지 하위 폴더 분리</span>
                  <span className="text-neutral-400 text-[11px]">
                    Idle(기본)은 캐릭터 폴더에 바로 저장하고, Aim/ Cover/ 이미지만 하위 폴더로 구분
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={options.characterSubfolders}
                  onChange={(e) => setOptions(prev => ({ ...prev, characterSubfolders: e.target.checked }))}
                  className="rounded text-orange-500 mt-0.5"
                />
              </label>
            </div>
          </div>

          {/* Section 3: Performance Concurrency */}
          <div className="flex flex-col gap-2.5 pt-4 border-t border-[#2a2a2a]">
            <div className="flex items-center justify-between">
              <label className="font-bold text-neutral-200 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-orange-400" />
                <span>동시 다운로드 연결 수</span>
              </label>
              <span className="font-mono text-orange-400 font-bold">{options.concurrency}개 동시 처리</span>
            </div>
            <input
              type="range"
              min={1}
              max={8}
              step={1}
              value={options.concurrency}
              onChange={(e) => setOptions(prev => ({ ...prev, concurrency: Number(e.target.value) }))}
              className="accent-orange-500 bg-[#282828] h-2 rounded-lg"
            />
            <span className="text-[11px] text-neutral-500">
              네트워크 환경이 원활할 경우 4~6을 권장합니다.
            </span>
          </div>

          {/* Section 4: History Management */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-rose-950/20 border border-rose-900/40 text-rose-300">
            <div className="flex flex-col">
              <span className="font-bold">다운로드 완료 기록 초기화</span>
              <span className="text-[11px] text-rose-400/80">
                현재 기록된 완료 항목: {downloadedCount}개
              </span>
            </div>
            <button
              onClick={onClearHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>기록 비우기</span>
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#282828] bg-[#161616] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all"
          >
            확인 및 닫기
          </button>
        </div>

      </div>
    </div>
  );
};
