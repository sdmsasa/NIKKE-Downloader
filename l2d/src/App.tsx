import { useState, useEffect, useMemo, useRef } from 'react';
import type {
  AssetCategory,
  AnyAssetItem,
  DownloadOptions,
  FilterState
} from './types';
import { fetchAllNKASData, getCachedNKASData, type FetchedData } from './services/nkasApi';
import {
  pickTargetDirectory,
  isFileSystemAccessSupported,
  writeUrlToFileSystem,
  ZipArchiveBuilder,
  getDirectoryHandleFromIDB,
  verifyDirectoryPermission
} from './services/fileSystem';
import {
  buildAssetDownloadPlan,
  HistoryStorage,
  type DownloadProgressInfo,
  type FailedTaskInfo
} from './services/downloadEngine';
import { Header } from './components/Header';
import { CategoryTabs } from './components/CategoryTabs';
import { FilterBar } from './components/FilterBar';
import { AssetCard } from './components/AssetCard';
import { AssetListView } from './components/AssetListView';
import { AssetDetailModal } from './components/AssetDetailModal';
import { DownloadManagerModal } from './components/DownloadManagerModal';
import { SettingsModal } from './components/SettingsModal';
import { FloatingCardSizeSlider } from './components/FloatingCardSizeSlider';
import { Loader2, AlertCircle, RefreshCw, Sparkles, CheckCircle2, X } from 'lucide-react';
import { getCharacterManufacturer } from './data/manufacturers';
import { getSearchVariants, matchSearchQuery } from './utils/searchHelper';

const STORAGE_KEYS = {
  CATEGORY: 'nikke_saved_category_v1',
  SELECTED_IDS: 'nikke_saved_selected_ids_v1',
  FILTER: 'nikke_saved_filter_v1',
  OPTIONS: 'nikke_saved_options_v1',
  CARD_SIZE: 'nikke_saved_card_size_v1'
};

export function App() {
  // Data loading state (Initialize immediately with cached data if available)
  const [data, setData] = useState<FetchedData | null>(() => getCachedNKASData());
  const [isLoading, setIsLoading] = useState<boolean>(() => !getCachedNKASData());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Active Category (Persistent)
  const [activeCategory, setActiveCategory] = useState<AssetCategory>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CATEGORY);
      return (saved as AssetCategory) || 'characters';
    } catch {
      return 'characters';
    }
  });

  // Selected Models (Persistent)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SELECTED_IDS);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Download History
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(() => {
    const history = HistoryStorage.getHistory();
    return new Set(Object.keys(history));
  });

  // Filter & Search (Persistent)
  const [filter, setFilter] = useState<FilterState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FILTER);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      category: 'characters',
      search: '',
      manufacturer: 'all',
      onlyNew: false,
      onlySelected: false,
      onlyDownloaded: 'all',
      viewMode: 'grid',
      sortBy: 'id',
      sortOrder: 'asc'
    };
  });

  // Card Size in pixels (Persistent, default: 185px)
  const [cardSize, setCardSize] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CARD_SIZE);
      if (saved) return Number(saved) || 185;
    } catch {}
    return 185;
  });

  // Download Options (Persistent)
  const [options, setOptions] = useState<DownloadOptions>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.OPTIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.folderNaming === 'bracket_id_name' || !parsed.folderNaming) {
          parsed.folderNaming = 'id_name';
        }
        return parsed;
      }
    } catch {}
    return {
      mode: 'directory',
      folderNaming: 'id_name',
      categorySubfolders: true,
      characterSubfolders: true,
      poses: {
        idle: true,
        aim: true,
        cover: true
      },
      includeImages: {
        icon: true,
        medium: true,
        full: false,
        hq: false
      },
      includeBurst: true,
      concurrency: 4,
      skipExisting: false
    };
  });

  // Target Directory Handle
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);

  // Modals
  const [detailItem, setDetailItem] = useState<AnyAssetItem | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDownloadManagerOpen, setIsDownloadManagerOpen] = useState(false);

  // Download Progress Engine State
  const [progress, setProgress] = useState<DownloadProgressInfo>({
    isRunning: false,
    isPaused: false,
    totalItems: 0,
    completedItems: 0,
    failedItems: 0,
    totalFiles: 0,
    completedFiles: 0,
    bytesDownloaded: 0,
    speedBytesPerSec: 0,
    logs: [],
    failedTasks: []
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const isPausedRef = useRef<boolean>(false);
  isPausedRef.current = progress.isPaused;

  // Persist UI state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CATEGORY, activeCategory);
    } catch {}
  }, [activeCategory]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SELECTED_IDS, JSON.stringify(Array.from(selectedIds)));
    } catch {}
  }, [selectedIds]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.FILTER, JSON.stringify(filter));
    } catch {}
  }, [filter]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CARD_SIZE, String(cardSize));
    } catch {}
  }, [cardSize]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.OPTIONS, JSON.stringify(options));
    } catch {}
  }, [options]);

  // Toast notification state
  const [toast, setToast] = useState<{ id: number; type: 'success' | 'error' | 'info'; title: string; message?: string } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', title: string, message?: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    const id = Date.now();
    setToast({ id, type, title, message });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Load / refresh data & restore saved directory handle
  const loadData = async (forceRefresh: boolean = false) => {
    if (forceRefresh) {
      setIsRefreshing(true);
    } else if (!data) {
      setIsLoading(true);
    }
    setLoadError(null);
    const start = Date.now();
    try {
      const [fetched, savedHandle] = await Promise.all([
        fetchAllNKASData(forceRefresh),
        getDirectoryHandleFromIDB()
      ]);
      setData(fetched);

      if (savedHandle) {
        setDirHandle(savedHandle);
      }

      // Refresh download history
      const history = HistoryStorage.getHistory();
      setDownloadedIds(new Set(Object.keys(history)));

      if (forceRefresh) {
        // Guarantee smooth visual feedback duration (minimum 600ms)
        const elapsed = Date.now() - start;
        if (elapsed < 600) {
          await new Promise(r => setTimeout(r, 600 - elapsed));
        }
        const totalCount =
          fetched.characters.length +
          fetched.bursts.length +
          fetched.monsters.length +
          fetched.favorites.length +
          fetched.eventScenes.length;
        showToast('success', '데이터 새로고침 완료', `총 ${totalCount}개의 최신 모델 정보가 동기화되었습니다.`);
      }
    } catch (err: any) {
      const msg = err.message || '데이터를 불러오는 중 오류가 발생했습니다.';
      setLoadError(msg);
      if (forceRefresh) {
        showToast('error', '새로고침 실패', msg);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, []);

  // Pick target folder via File System Access API
  const handlePickDirectory = async () => {
    try {
      const handle = await pickTargetDirectory();
      if (handle) {
        setDirHandle(handle);
        setOptions(prev => ({ ...prev, mode: 'directory' }));
      }
    } catch (err: any) {
      alert(err.message || '폴더 선택에 실패했습니다. ZIP 모드를 사용해주세요.');
    }
  };

  // Convert all items to generic list
  const allAssetItems: AnyAssetItem[] = useMemo(() => {
    if (!data) return [];
    const items: AnyAssetItem[] = [];

    data.characters.forEach(c => items.push({ type: 'character', ...c }));
    data.bursts.forEach(b => items.push({ type: 'burst', ...b }));
    data.monsters.forEach(m => items.push({ type: 'monster', ...m }));
    data.favorites.forEach(f => items.push({ type: 'favorite', ...f }));
    data.eventScenes.forEach(e => items.push({ type: 'eventscene', ...e }));

    return items;
  }, [data]);

  // Items by category
  const categoryItems: AnyAssetItem[] = useMemo(() => {
    if (!data) return [];
    if (activeCategory === 'characters') return data.characters.map(c => ({ type: 'character', ...c }));
    if (activeCategory === 'bursts') return data.bursts.map(b => ({ type: 'burst', ...b }));
    if (activeCategory === 'monsters') return data.monsters.map(m => ({ type: 'monster', ...m }));
    if (activeCategory === 'favorites') return data.favorites.map(f => ({ type: 'favorite', ...f }));
    if (activeCategory === 'eventscenes') return data.eventScenes.map(e => ({ type: 'eventscene', ...e }));
    if (activeCategory === 'updates') return allAssetItems.filter(item => item.isNew);
    return allAssetItems;
  }, [data, activeCategory, allAssetItems]);

  // Counts for tabs
  const counts = useMemo(() => {
    return {
      characters: data?.characters.length || 0,
      bursts: data?.bursts.length || 0,
      monsters: data?.monsters.length || 0,
      favorites: data?.favorites.length || 0,
      eventscenes: data?.eventScenes.length || 0,
      updates: allAssetItems.filter(i => i.isNew).length
    };
  }, [data, allAssetItems]);

  // Filtered & Sorted items
  const filteredItems = useMemo(() => {
    let list = [...categoryItems];

    // Smart Multi-Attribute Search Filter (English, Korean, ID, Space-tolerant, Typo-tolerant)
    if (filter.search.trim()) {
      const variants = getSearchVariants(filter.search);
      list = list.filter((item) => matchSearchQuery(item as any, variants));
    }

    // Manufacturer filter (Elysion, Missilis, Tetra, Pilgrim, Abnormal)
    if (filter.manufacturer && filter.manufacturer !== 'all') {
      list = list.filter((item) => {
        const charId = (item as any).characterId || item.id;
        const m = getCharacterManufacturer(charId, item.name);
        return m === filter.manufacturer;
      });
    }

    // Downloaded status filter
    if (filter.onlyDownloaded === 'downloaded') {
      list = list.filter(item => downloadedIds.has(item.id));
    } else if (filter.onlyDownloaded === 'not_downloaded') {
      list = list.filter(item => !downloadedIds.has(item.id));
    }

    // Sorting
    list.sort((a, b) => {
      if (filter.sortBy === 'newest') {
        if (a.isNew && !b.isNew) return -1;
        if (!a.isNew && b.isNew) return 1;
      }
      if (filter.sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      return a.id.localeCompare(b.id, undefined, { numeric: true });
    });

    return list;
  }, [categoryItems, filter.search, filter.manufacturer, filter.onlyDownloaded, filter.sortBy, downloadedIds]);

  // Selection actions
  const handleCategoryChange = (cat: AssetCategory) => {
    setActiveCategory(cat);
    setFilter(prev => ({ ...prev, category: cat }));
    setSelectedIds(new Set()); // Automatically reset all checked items when switching category
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      filteredItems.forEach(item => next.add(item.id));
      return next;
    });
  };

  const handleDeselectAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      filteredItems.forEach(item => next.delete(item.id));
      return next;
    });
  };

  // Select New / Update Only
  const handleSelectNewOnly = () => {
    const newItems = allAssetItems.filter(item => item.isNew);
    if (newItems.length === 0) {
      alert('현재 새로 추가된 신규 업데이트 모델이 없습니다.');
      return;
    }
    const next = new Set<string>();
    newItems.forEach(item => next.add(item.id));
    setSelectedIds(next);
    setActiveCategory('updates');
  };

  const handleSelectUndownloadedOnly = () => {
    const next = new Set<string>();
    filteredItems.forEach(item => {
      if (!downloadedIds.has(item.id)) {
        next.add(item.id);
      }
    });
    setSelectedIds(next);
  };

  const handleInvertSelection = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      filteredItems.forEach(item => {
        if (next.has(item.id)) next.delete(item.id);
        else next.add(item.id);
      });
      return next;
    });
  };

  const handleClearHistory = () => {
    if (window.confirm('다운로드 완료 기록을 초기화하시겠습니까?')) {
      HistoryStorage.clearHistory();
      setDownloadedIds(new Set());
    }
  };

  // Helper log
  const addLog = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const time = new Date().toLocaleTimeString();
    setProgress(prev => ({
      ...prev,
      logs: [...prev.logs.slice(-500), { time, message, type }]
    }));
  };

  // Start Download Execution
  const handleStartDownload = async (targetItems?: AnyAssetItem[]) => {
    const itemsToDownload = targetItems || allAssetItems.filter(item => selectedIds.has(item.id));
    if (itemsToDownload.length === 0) return;

    let activeDirHandle = dirHandle;

    // Check directory mode requirement and restore/request permission
    if (options.mode === 'directory') {
      if (!isFileSystemAccessSupported()) {
        alert('현재 브라우저가 File System Access API를 지원하지 않습니다. ZIP 모드로 전환합니다.');
        setOptions(prev => ({ ...prev, mode: 'zip' }));
      } else if (!activeDirHandle) {
        try {
          const picked = await pickTargetDirectory();
          if (!picked) return; // cancelled
          activeDirHandle = picked;
          setDirHandle(picked);
        } catch {
          return;
        }
      } else {
        // Verify / request permission on existing saved handle
        const hasPermission = await verifyDirectoryPermission(activeDirHandle, true);
        if (!hasPermission) {
          try {
            const picked = await pickTargetDirectory();
            if (!picked) return;
            activeDirHandle = picked;
            setDirHandle(picked);
          } catch {
            return;
          }
        }
      }
    }

    setIsDownloadManagerOpen(true);
    abortControllerRef.current = new AbortController();

    const failedTaskList: FailedTaskInfo[] = [];

    setProgress({
      isRunning: true,
      isPaused: false,
      totalItems: itemsToDownload.length,
      completedItems: 0,
      failedItems: 0,
      totalFiles: 0,
      completedFiles: 0,
      bytesDownloaded: 0,
      speedBytesPerSec: 0,
      logs: [],
      failedTasks: []
    });

    addLog(`총 ${itemsToDownload.length}개 모델 다운로드 작업을 시작합니다. (모드: ${options.mode === 'directory' ? `로컬 폴더: ${activeDirHandle?.name}` : 'ZIP 압축'})`, 'info');

    const startTime = Date.now();
    let totalBytes = 0;
    let completedItemCount = 0;
    let failedItemCount = 0;
    let totalFileCount = 0;
    let completedFileCount = 0;

    const newlyDownloaded: AnyAssetItem[] = [];
    const zipBuilder = options.mode === 'zip' ? new ZipArchiveBuilder(`nikke_assets_${Date.now()}.zip`) : null;

    try {
      const concurrency = options.concurrency;
      let currentIndex = 0;

      const worker = async () => {
        while (currentIndex < itemsToDownload.length) {
          if (abortControllerRef.current?.signal.aborted) break;

          while (isPausedRef.current) {
            await new Promise(r => setTimeout(r, 400));
            if (abortControllerRef.current?.signal.aborted) break;
          }

          const index = currentIndex++;
          const item = itemsToDownload[index];
          if (!item) break;

          setProgress(prev => ({
            ...prev,
            currentTaskName: `[${index + 1}/${itemsToDownload.length}] ${item.name} (${item.id})`
          }));

          try {
            const plans = await buildAssetDownloadPlan(item, options);
            totalFileCount += plans.length;
            setProgress(prev => ({ ...prev, totalFiles: totalFileCount }));

            let itemFilesSuccess = 0;

            for (const plan of plans) {
              if (abortControllerRef.current?.signal.aborted) break;

              while (isPausedRef.current) {
                await new Promise(r => setTimeout(r, 400));
                if (abortControllerRef.current?.signal.aborted) break;
              }

              setProgress(prev => ({ ...prev, currentFileName: plan.targetPath }));

              if (options.mode === 'directory' && activeDirHandle) {
                const pathSegments = plan.targetPath.split('/');
                const res = await writeUrlToFileSystem(activeDirHandle, pathSegments, plan.url, (bytes) => {
                  totalBytes += bytes;
                  const elapsedSec = Math.max(1, (Date.now() - startTime) / 1000);
                  setProgress(prev => ({
                    ...prev,
                    bytesDownloaded: totalBytes,
                    speedBytesPerSec: Math.round(totalBytes / elapsedSec)
                  }));
                });

                if (res.success) {
                  itemFilesSuccess++;
                  completedFileCount++;
                } else {
                  addLog(`[파일 건너뜀] ${plan.targetPath}: ${res.error || '404'}`, 'warning');
                }
              } else if (zipBuilder) {
                const success = await zipBuilder.addRemoteFile(plan.targetPath, plan.url);
                if (success) {
                  itemFilesSuccess++;
                  completedFileCount++;
                }
              }

              setProgress(prev => ({ ...prev, completedFiles: completedFileCount }));
            }

            if (itemFilesSuccess > 0) {
              completedItemCount++;
              newlyDownloaded.push(item);
              HistoryStorage.recordDownloaded(item);
              setDownloadedIds(prev => new Set(prev).add(item.id));
              addLog(`[완료] ${item.name} (${item.id})`, 'success');
            } else {
              failedItemCount++;
              const failInfo: FailedTaskInfo = {
                item,
                error: '다운로드 가능한 에셋 파일을 찾지 못함 (404/네트워크)',
                time: new Date().toLocaleTimeString()
              };
              failedTaskList.push(failInfo);
              addLog(`[실패] ${item.name} (${item.id}) - 에셋을 찾을 수 없음`, 'error');
            }
          } catch (err: any) {
            failedItemCount++;
            const failInfo: FailedTaskInfo = {
              item,
              error: err.message || '알 수 없는 오류',
              time: new Date().toLocaleTimeString()
            };
            failedTaskList.push(failInfo);
            addLog(`[에러] ${item.name} (${item.id}): ${err.message}`, 'error');
          }

          setProgress(prev => ({
            ...prev,
            completedItems: completedItemCount,
            failedItems: failedItemCount,
            failedTasks: [...failedTaskList]
          }));
        }
      };

      const workers = Array.from({ length: Math.min(concurrency, itemsToDownload.length) }, () => worker());
      await Promise.all(workers);

      if (zipBuilder && !abortControllerRef.current?.signal.aborted) {
        addLog('ZIP 압축 파일을 생성하고 다운로드를 시작합니다...', 'info');
        await zipBuilder.generateAndDownload((percent) => {
          setProgress(prev => ({
            ...prev,
            currentTaskName: `ZIP 압축 중... (${Math.round(percent)}%)`
          }));
        });
        addLog('ZIP 파일 다운로드가 브라우저에서 시작되었습니다.', 'success');
      }

      addLog(`모든 다운로드 작업 완료! (성공: ${completedItemCount}개, 실패: ${failedItemCount}개)`, 'success');
    } catch (err: any) {
      addLog(`다운로드 도중 예외 발생: ${err.message}`, 'error');
    } finally {
      setProgress(prev => ({
        ...prev,
        isRunning: false,
        isPaused: false,
        currentTaskName: undefined,
        currentFileName: undefined
      }));
    }
  };

  const handlePauseDownload = () => {
    setProgress(prev => ({ ...prev, isPaused: true }));
    addLog('다운로드를 일시 정지했습니다.', 'warning');
  };

  const handleResumeDownload = () => {
    setProgress(prev => ({ ...prev, isPaused: false }));
    addLog('다운로드를 재개합니다.', 'info');
  };

  const handleCancelDownload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setProgress(prev => ({ ...prev, isRunning: false, isPaused: false }));
    addLog('사용자에 의해 다운로드가 중단되었습니다.', 'error');
  };

  return (
    <div className="min-h-screen bg-[#101010] text-slate-100 flex flex-col selection:bg-orange-500 selection:text-white">
      
      {/* Top Main Header (Fixed Sticky) */}
      <Header
        options={options}
        setOptions={setOptions}
        selectedCount={selectedIds.size}
        totalCount={allAssetItems.length}
        newCount={counts.updates}
        dirHandle={dirHandle}
        onPickDirectory={handlePickDirectory}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenDownloadManager={() => setIsDownloadManagerOpen(true)}
        onStartDownload={() => handleStartDownload()}
        onRefreshData={() => loadData(true)}
        isDownloading={progress.isRunning}
        isRefreshing={isRefreshing}
        downloadProgressPercent={
          progress.totalFiles > 0
            ? Math.round((progress.completedFiles / progress.totalFiles) * 100)
            : 0
        }
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-2 flex flex-col gap-4">
        
        {/* Loading View (Only on initial cache-miss) */}
        {isLoading && !data && (
          <div className="flex-1 flex flex-col items-center justify-center py-32 text-slate-400 gap-3">
            <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
            <p className="text-sm font-semibold text-slate-200">
              스파인 에셋 및 모델 목록을 불러오는 중...
            </p>
            <span className="text-xs text-slate-500">
              캐릭터, 버스트, 랩쳐, 애장품, 이벤트 씬 메타데이터 동기화
            </span>
          </div>
        )}

        {/* Error View */}
        {!isLoading && loadError && !data && (
          <div className="flex flex-col items-center justify-center py-20 bg-rose-950/20 border border-rose-800/40 rounded-2xl p-8 text-center gap-3">
            <AlertCircle className="w-10 h-10 text-rose-400" />
            <h3 className="text-base font-bold text-rose-200">데이터 로드 실패</h3>
            <p className="text-xs text-rose-300 max-w-md">{loadError}</p>
            <button
              onClick={() => loadData(true)}
              className="mt-2 flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>다시 시도</span>
            </button>
          </div>
        )}

        {/* Main Content Area */}
        {data && (
          <>
            {/* Always Sticky Menu Bar (Category Tabs + Filter & Search Bar) */}
            <div className="sticky top-[57px] z-30 bg-[#101010]/95 backdrop-blur-md pt-1.5 pb-2 -mx-4 px-4 lg:-mx-8 lg:px-8 border-b border-[#282828] shadow-lg shadow-black/40 flex flex-col gap-1.5">
              {/* Category Switcher Tabs */}
              <CategoryTabs
                activeCategory={activeCategory}
                onSelectCategory={handleCategoryChange}
                counts={counts}
              />

              {/* Filter and Action Toolbar */}
              <FilterBar
                filter={filter}
                setFilter={setFilter}
                options={options}
                setOptions={setOptions}
                selectedCount={selectedIds.size}
                filteredCount={filteredItems.length}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
                onSelectNewOnly={handleSelectNewOnly}
                onInvertSelection={handleInvertSelection}
                onSelectUndownloadedOnly={handleSelectUndownloadedOnly}
              />
            </div>

            {/* Directory Path Reminder Banner */}
            {options.mode === 'directory' && !dirHandle && (
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-200 text-xs mt-1">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-orange-400 flex-shrink-0" />
                  <span>
                    <strong>로컬 폴더를 지정하세요:</strong> 브라우저에서 내 PC의 폴더를 선택하면 모델별로 하위 폴더를 자동 생성하여 다이렉트 저장합니다.
                  </span>
                </div>
                <button
                  onClick={handlePickDirectory}
                  className="px-3 py-1.5 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-lg text-xs transition-colors flex-shrink-0"
                >
                  폴더 지정하기
                </button>
              </div>
            )}

            {/* Asset Items Display (Grid or List with customizable card size) */}
            {filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-2 border border-dashed border-slate-800 rounded-2xl">
                <p className="text-sm font-medium text-slate-400">일치하는 에셋이 없습니다.</p>
                <span className="text-xs text-slate-600">검색어 또는 필터 조건을 변경해 보세요.</span>
              </div>
            ) : filter.viewMode === 'grid' ? (
              <div
                className="grid gap-3.5 transition-all duration-200"
                style={{
                  gridTemplateColumns: `repeat(auto-fill, minmax(${cardSize}px, 1fr))`
                }}
              >
                {filteredItems.map((item) => (
                  <AssetCard
                    key={item.id}
                    item={item}
                    isSelected={selectedIds.has(item.id)}
                    isDownloaded={downloadedIds.has(item.id)}
                    onToggleSelect={() => toggleSelect(item.id)}
                    onDownloadSingle={() => handleStartDownload([item])}
                    onOpenDetail={() => setDetailItem(item)}
                  />
                ))}
              </div>
            ) : (
              <AssetListView
                items={filteredItems}
                selectedIds={selectedIds}
                downloadedIds={downloadedIds}
                onToggleSelect={toggleSelect}
                onDownloadSingle={(item) => handleStartDownload([item])}
                onOpenDetail={(item) => setDetailItem(item)}
              />
            )}
          </>
        )}

      </main>

      {/* Floating Card Size Controller on bottom right */}
      <FloatingCardSizeSlider
        cardSize={cardSize}
        onChangeCardSize={setCardSize}
        onResetCardSize={() => setCardSize(185)}
        disabled={filter.viewMode === 'list' || !data}
      />

      {/* Detail Inspector Modal */}
      {detailItem && (
        <AssetDetailModal
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onDownloadSingle={(item) => handleStartDownload([item])}
        />
      )}

      {/* Download Progress & Queue Manager Modal */}
      <DownloadManagerModal
        isOpen={isDownloadManagerOpen}
        onClose={() => setIsDownloadManagerOpen(false)}
        progress={progress}
        onPause={handlePauseDownload}
        onResume={handleResumeDownload}
        onCancel={handleCancelDownload}
        onRetryFailed={() => {
          if (progress.failedTasks && progress.failedTasks.length > 0) {
            handleStartDownload(progress.failedTasks.map(f => f.item));
          } else {
            const failedList = allAssetItems.filter(i => selectedIds.has(i.id) && !downloadedIds.has(i.id));
            handleStartDownload(failedList);
          }
        }}
        onRetrySingleItem={(item) => handleStartDownload([item])}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        options={options}
        setOptions={setOptions}
        onClearHistory={handleClearHistory}
        downloadedCount={downloadedIds.size}
      />

      {/* Top-Right Floating Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-start gap-3 p-4 bg-[#1a1a1a]/95 border border-neutral-700/80 rounded-2xl shadow-2xl backdrop-blur-md max-w-sm w-full animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`p-2 rounded-xl flex-shrink-0 ${
            toast.type === 'success'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : toast.type === 'error'
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-white tracking-tight">{toast.title}</h4>
            {toast.message && (
              <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">{toast.message}</p>
            )}
          </div>
          <button
            onClick={() => setToast(null)}
            className="p-1 text-neutral-500 hover:text-white rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-[#282828] py-4 text-center text-xs text-neutral-500">
        <p>니케 스파인 에셋 다운로더 · NIKKE Live2D Resource Tool · Data source from nkas.pages.dev</p>
      </footer>

    </div>
  );
}

export default App;
