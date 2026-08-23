import React from 'react';
import { Folder, FolderOpen, Archive, Settings, Download, RefreshCw, Sparkles } from 'lucide-react';
import type { DownloadOptions } from '../types';

interface HeaderProps {
  options: DownloadOptions;
  setOptions: React.Dispatch<React.SetStateAction<DownloadOptions>>;
  selectedCount: number;
  totalCount: number;
  newCount: number;
  dirHandle: FileSystemDirectoryHandle | null;
  onPickDirectory: () => void;
  onOpenSettings: () => void;
  onOpenDownloadManager: () => void;
  onStartDownload: () => void;
  onRefreshData: () => void;
  isDownloading: boolean;
  downloadProgressPercent: number;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  options,
  setOptions,
  selectedCount,
  newCount,
  dirHandle,
  onPickDirectory,
  onOpenSettings,
  onOpenDownloadManager,
  onStartDownload,
  onRefreshData,
  isDownloading,
  downloadProgressPercent,
  isRefreshing = false
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-[#282828] bg-[#161616]/95 backdrop-blur-md px-4 lg:px-8 py-3.5 shadow-xl">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Left: Title */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-black text-white tracking-tight">
              니케 스파인 에셋 다운로더
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-md">
              Spine Live2D
            </span>
            {newCount > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-full animate-pulse">
                <Sparkles className="w-2.5 h-2.5 text-cyan-300" />
                +{newCount} NEW
              </span>
            )}
          </div>

          <button
            onClick={onRefreshData}
            disabled={isRefreshing}
            title={isRefreshing ? "데이터 동기화 중..." : "데이터 새로고침"}
            className="p-2 text-neutral-400 hover:text-white hover:bg-[#262626] rounded-lg transition-colors md:hidden disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-orange-400' : ''}`} />
          </button>
        </div>

        {/* Right: Actions, Path & Download */}
        <div className="flex items-center flex-wrap md:flex-nowrap gap-2.5 w-full md:w-auto justify-end">
          
          {/* Target Directory Picker / Mode toggle */}
          <div className="flex items-center bg-[#1c1c1c] border border-[#2e2e2e] rounded-xl p-1 shadow-inner">
            <button
              onClick={() => {
                if (options.mode !== 'directory') {
                  setOptions(prev => ({ ...prev, mode: 'directory' }));
                }
                onPickDirectory();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                options.mode === 'directory'
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                  : 'text-neutral-300 hover:text-white hover:bg-[#282828]'
              }`}
              title={dirHandle ? `저장 폴더: ${dirHandle.name}` : '로컬 폴더 선택 (File System API)'}
            >
              {dirHandle ? <FolderOpen className="w-3.5 h-3.5 text-amber-200" /> : <Folder className="w-3.5 h-3.5" />}
              <span className="max-w-[140px] truncate">
                {dirHandle ? dirHandle.name : '폴더 지정'}
              </span>
            </button>

            <button
              onClick={() => setOptions(prev => ({ ...prev, mode: 'zip' }))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                options.mode === 'zip'
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                  : 'text-neutral-300 hover:text-white hover:bg-[#282828]'
              }`}
              title="ZIP 압축 파일로 다운로드"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>ZIP</span>
            </button>
          </div>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="flex items-center justify-center p-2 rounded-xl bg-[#1c1c1c] hover:bg-[#262626] border border-[#2e2e2e] text-neutral-300 hover:text-white transition-colors"
            title="다운로드 설정"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefreshData}
            disabled={isRefreshing}
            className="hidden md:flex items-center justify-center p-2 rounded-xl bg-[#1c1c1c] hover:bg-[#262626] border border-[#2e2e2e] text-neutral-300 hover:text-white transition-colors disabled:opacity-50"
            title={isRefreshing ? "데이터 동기화 중..." : "데이터 동기화 / 새로고침"}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-orange-400' : ''}`} />
          </button>

          {/* Download Queue / Status Manager Trigger */}
          <button
            onClick={onOpenDownloadManager}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1c1c1c] hover:bg-[#262626] border border-[#2e2e2e] text-neutral-300 hover:text-white text-xs font-medium transition-colors"
            title="다운로드 작업 관리자 열기"
          >
            <span className="relative flex h-2 w-2">
              {isDownloading ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              )}
            </span>
            <span>작업 상태</span>
            {isDownloading && (
              <span className="text-orange-400 font-bold ml-0.5 font-mono">
                {downloadProgressPercent}%
              </span>
            )}
          </button>

          {/* Main Download CTA Button */}
          <button
            onClick={onStartDownload}
            disabled={selectedCount === 0 || isDownloading}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-xs shadow-lg transition-all ${
              selectedCount === 0 || isDownloading
                ? 'bg-[#222222] text-neutral-600 border border-[#2a2a2a] cursor-not-allowed'
                : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white shadow-orange-500/25 active:scale-95'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>
              {isDownloading
                ? '다운로드 진행 중...'
                : selectedCount > 0
                ? `${selectedCount}개 다운로드`
                : '선택 후 다운로드'}
            </span>
          </button>

        </div>

      </div>
    </header>
  );
};
