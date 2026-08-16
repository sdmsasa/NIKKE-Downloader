import React, { useRef, useEffect, useState } from 'react';
import type { DownloadProgressInfo, FailedTaskInfo } from '../services/downloadEngine';
import type { AnyAssetItem } from '../types';
import { X, Play, Pause, Square, RotateCcw, AlertCircle, Terminal, Copy, Check } from 'lucide-react';

interface DownloadManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  progress: DownloadProgressInfo;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onRetryFailed: () => void;
  onRetrySingleItem?: (item: AnyAssetItem) => void;
}

export const DownloadManagerModal: React.FC<DownloadManagerModalProps> = ({
  isOpen,
  onClose,
  progress,
  onPause,
  onResume,
  onCancel,
  onRetryFailed,
  onRetrySingleItem
}) => {
  const logEndRef = useRef<HTMLDivElement>(null);
  const [logFilter, setLogFilter] = useState<'all' | 'errors' | 'success'>('all');
  const [copiedLogs, setCopiedLogs] = useState(false);

  useEffect(() => {
    if (logEndRef.current && !progress.isPaused) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [progress.logs.length, progress.isPaused]);

  if (!isOpen) return null;

  const filePercent = progress.totalFiles > 0
    ? Math.round((progress.completedFiles / progress.totalFiles) * 100)
    : 0;

  const speedFormatted = (progress.speedBytesPerSec / (1024 * 1024)).toFixed(2);
  const totalMB = (progress.bytesDownloaded / (1024 * 1024)).toFixed(1);

  // Filter logs
  const filteredLogs = progress.logs.filter((l) => {
    if (logFilter === 'errors') return l.type === 'error' || l.type === 'warning';
    if (logFilter === 'success') return l.type === 'success';
    return true;
  });

  const handleCopyLogs = () => {
    const text = progress.logs.map(l => `[${l.time}] [${l.type.toUpperCase()}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-3xl flex flex-col bg-[#1c1c1c] border border-[#333333] rounded-2xl shadow-2xl overflow-hidden max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#282828] bg-[#161616]">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl border ${
              progress.isRunning
                ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                : progress.completedItems === progress.totalItems && progress.totalItems > 0
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-[#282828] border-[#383838] text-neutral-400'
            }`}>
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>다운로드 작업 관리자</span>
                {progress.isRunning && (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-full animate-pulse">
                    작업 진행 중
                  </span>
                )}
                {progress.isPaused && (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full">
                    일시 정지됨
                  </span>
                )}
              </h2>
              <p className="text-xs text-neutral-400">
                실시간 다운로드 속도, 전송 로그 및 실패 항목 관리
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white hover:bg-[#282828] rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Body */}
        <div className="p-6 flex flex-col gap-5 overflow-y-auto">
          
          {/* Progress Overview Card */}
          <div className="p-4 rounded-xl bg-[#222222] border border-[#2e2e2e] flex flex-col gap-4">
            
            {/* Top Stat Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-2.5 rounded-lg bg-[#181818] border border-[#2a2a2a]">
                <span className="text-[10px] text-neutral-400 block mb-0.5">총 모델</span>
                <span className="text-sm font-bold text-white">
                  {progress.completedItems} / {progress.totalItems}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#181818] border border-[#2a2a2a]">
                <span className="text-[10px] text-neutral-400 block mb-0.5">다운로드 파일수</span>
                <span className="text-sm font-bold text-cyan-300">
                  {progress.completedFiles} / {progress.totalFiles}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#181818] border border-[#2a2a2a]">
                <span className="text-[10px] text-neutral-400 block mb-0.5">전송 속도</span>
                <span className="text-sm font-bold text-orange-400 font-mono">
                  {speedFormatted} MB/s
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#181818] border border-[#2a2a2a]">
                <span className="text-[10px] text-neutral-400 block mb-0.5">총 다운로드 용량</span>
                <span className="text-sm font-bold text-emerald-400 font-mono">
                  {totalMB} MB
                </span>
              </div>
            </div>

            {/* Progress Bars */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-300 font-medium truncate max-w-[80%]">
                  {progress.currentTaskName ? `현재: ${progress.currentTaskName}` : '전체 진행률'}
                </span>
                <span className="text-orange-400 font-bold font-mono">{filePercent}%</span>
              </div>
              <div className="w-full h-2.5 bg-[#181818] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-300 rounded-full"
                  style={{ width: `${filePercent}%` }}
                />
              </div>
              {progress.currentFileName && (
                <span className="text-[11px] font-mono text-neutral-500 truncate">
                  파일: {progress.currentFileName}
                </span>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between pt-2 border-t border-[#2a2a2a] flex-wrap gap-2">
              <div className="flex items-center gap-2">
                {progress.isRunning ? (
                  <button
                    onClick={onPause}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>일시정지</span>
                  </button>
                ) : progress.isPaused ? (
                  <button
                    onClick={onResume}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>재개</span>
                  </button>
                ) : null}

                {(progress.isRunning || progress.isPaused) && (
                  <button
                    onClick={onCancel}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>취소</span>
                  </button>
                )}

                {progress.failedItems > 0 && !progress.isRunning && (
                  <button
                    onClick={onRetryFailed}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>실패한 {progress.failedItems}개 전체 재시도</span>
                  </button>
                )}
              </div>

              {progress.failedItems > 0 && (
                <span className="text-xs text-rose-400 flex items-center gap-1 font-semibold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  실패 {progress.failedItems}개
                </span>
              )}
            </div>

          </div>

          {/* Section: Failed Items Breakdown (If any) */}
          {progress.failedTasks && progress.failedTasks.length > 0 && (
            <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-800/40 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  <span>다운로드 실패 항목 ({progress.failedTasks.length}개)</span>
                </span>
                {!progress.isRunning && (
                  <button
                    onClick={onRetryFailed}
                    className="px-2.5 py-1 bg-rose-500/30 hover:bg-rose-500/50 text-rose-200 border border-rose-500/50 rounded-lg text-[11px] font-semibold"
                  >
                    전체 재시도
                  </button>
                )}
              </div>
              <div className="max-h-36 overflow-y-auto flex flex-col gap-1.5 pr-1">
                {progress.failedTasks.map((ft: FailedTaskInfo, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-[#1c1c1c] border border-rose-900/40 text-xs"
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="font-semibold text-neutral-200 truncate">
                        {ft.item.name} <span className="text-neutral-500 font-mono text-[10px]">({ft.item.id})</span>
                      </span>
                      <span className="text-[10px] text-rose-400 truncate">{ft.error}</span>
                    </div>
                    {onRetrySingleItem && !progress.isRunning && (
                      <button
                        onClick={() => onRetrySingleItem(ft.item)}
                        className="px-2 py-1 rounded bg-[#2a2a2a] hover:bg-[#383838] text-neutral-300 text-[10px] font-medium flex-shrink-0"
                      >
                        재시도
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Log Stream with Filter & Copy */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>실시간 전송 로그 ({filteredLogs.length}개)</span>
              </span>

              <div className="flex items-center gap-2">
                {/* Log Filter Chips */}
                <div className="flex items-center gap-1 bg-[#161616] border border-[#2e2e2e] rounded-lg p-0.5 text-[11px]">
                  <button
                    onClick={() => setLogFilter('all')}
                    className={`px-2 py-0.5 rounded ${logFilter === 'all' ? 'bg-[#333333] text-white' : 'text-neutral-400 hover:text-white'}`}
                  >
                    전체
                  </button>
                  <button
                    onClick={() => setLogFilter('errors')}
                    className={`px-2 py-0.5 rounded ${logFilter === 'errors' ? 'bg-rose-900/60 text-rose-200' : 'text-neutral-400 hover:text-white'}`}
                  >
                    오류만
                  </button>
                  <button
                    onClick={() => setLogFilter('success')}
                    className={`px-2 py-0.5 rounded ${logFilter === 'success' ? 'bg-emerald-900/60 text-emerald-200' : 'text-neutral-400 hover:text-white'}`}
                  >
                    완료만
                  </button>
                </div>

                {/* Copy Logs Button */}
                <button
                  onClick={handleCopyLogs}
                  className="flex items-center gap-1 px-2 py-1 bg-[#262626] hover:bg-[#333333] border border-[#333333] text-neutral-300 hover:text-white rounded-lg text-[11px] transition-colors"
                  title="전체 로그 텍스트 복사"
                >
                  {copiedLogs ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedLogs ? '복사됨' : '로그 복사'}</span>
                </button>
              </div>
            </div>

            <div className="h-52 overflow-y-auto bg-[#141414] border border-[#2a2a2a] rounded-xl p-3 font-mono text-[11px] flex flex-col gap-1">
              {filteredLogs.length === 0 ? (
                <span className="text-neutral-600">로그가 비어 있습니다.</span>
              ) : (
                filteredLogs.map((log, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 ${
                      log.type === 'error'
                        ? 'text-rose-400 font-semibold'
                        : log.type === 'success'
                        ? 'text-emerald-400'
                        : log.type === 'warning'
                        ? 'text-amber-400'
                        : 'text-neutral-400'
                    }`}
                  >
                    <span className="text-neutral-600 flex-shrink-0">[{log.time}]</span>
                    <span className="break-all">{log.message}</span>
                  </div>
                ))
              )}
              <div ref={logEndRef} />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#282828] bg-[#161616] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#282828] hover:bg-[#333333] text-neutral-200 text-xs font-semibold rounded-xl transition-colors"
          >
            닫기
          </button>
        </div>

      </div>
    </div>
  );
};
