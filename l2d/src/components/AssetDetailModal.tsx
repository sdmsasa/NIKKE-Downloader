import React, { useState } from 'react';
import type { AnyAssetItem, CharacterPose } from '../types';
import { X, Download, Copy, Check, ExternalLink, Image as ImageIcon, Sparkles, Loader2 } from 'lucide-react';
import { AssetUrls, getCharacterPoseFileName } from '../services/nkasApi';

interface AssetDetailModalProps {
  item: AnyAssetItem | null;
  onClose: () => void;
  onDownloadSingle: (item: AnyAssetItem) => void;
}

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({
  item,
  onClose,
  onDownloadSingle
}) => {
  const [selectedImageTab, setSelectedImageTab] = useState<'medium' | 'full' | 'hq' | 'icon'>('full');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<boolean>(false);
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);

  // Prevent background body scrolling when modal is open
  React.useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  if (!item) return null;

  const copyToClipboard = (text: string, isId: boolean = false) => {
    navigator.clipboard.writeText(text);
    if (isId) {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedUrl(text);
      setTimeout(() => setCopiedUrl(null), 2000);
    }
  };

  // Direct single file browser download
  const handleDownloadSingleFile = async (url: string, filename: string) => {
    try {
      setDownloadingUrl(url);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) {
      console.warn('Direct blob download failed, falling back to open in window', err);
      window.open(url, '_blank');
    } finally {
      setDownloadingUrl(null);
    }
  };

  const getFileList = () => {
    const list: { name: string; type: string; url: string }[] = [];

    if (item.type === 'character') {
      const poses: CharacterPose[] = item.poses || ['idle'];
      poses.forEach((pose) => {
        const poseFileName = getCharacterPoseFileName(item.id, pose);
        list.push({
          name: `${poseFileName}.skel`,
          type: `Spine Skeleton (${pose.toUpperCase()})`,
          url: AssetUrls.characterPose(item.id, pose, 'skel')
        });
        list.push({
          name: `${poseFileName}.atlas`,
          type: `Spine Atlas (${pose.toUpperCase()})`,
          url: AssetUrls.characterPose(item.id, pose, 'atlas')
        });
        list.push({
          name: `${poseFileName}.png`,
          type: `Spine Texture (${pose.toUpperCase()})`,
          url: AssetUrls.characterPose(item.id, pose, 'png')
        });
      });
      list.push({
        name: `${item.id}_icon.png`,
        type: 'Character Icon (1:1)',
        url: item.thumbnails.icon
      });
      list.push({
        name: `${item.id}_medium.png`,
        type: 'Character Card (1:2)',
        url: item.thumbnails.medium
      });
      list.push({
        name: `${item.id}_full.png`,
        type: 'Character Full Illustration',
        url: item.thumbnails.full
      });
      list.push({
        name: `${item.id}_hq.png`,
        type: 'Character HQ Screenshot',
        url: item.thumbnails.hq
      });
    } else if (item.type === 'burst') {
      list.push({
        name: `${item.id}.skel`,
        type: 'Burst Spine Skeleton',
        url: AssetUrls.burst(item.id, 'skel')
      });
      list.push({
        name: `${item.id}.atlas`,
        type: 'Burst Spine Atlas',
        url: AssetUrls.burst(item.id, 'atlas')
      });
      list.push({
        name: `${item.id}.png`,
        type: 'Burst Spine Texture',
        url: AssetUrls.burst(item.id, 'png')
      });
      list.push({
        name: `${item.id}_hq.png`,
        type: 'Character HQ Illustration',
        url: `https://nkas.pages.dev/characters_hq/${item.characterId}.png`
      });
      list.push({
        name: `${item.id}_full.png`,
        type: 'Character Full Illustration',
        url: `https://nkas.pages.dev/characters/${item.characterId}.png`
      });
    } else if (item.type === 'monster') {
      list.push({
        name: `${item.id}.skel`,
        type: 'Rapture Spine Skeleton',
        url: AssetUrls.monster(item.id, 'skel')
      });
      list.push({
        name: `${item.id}.atlas`,
        type: 'Rapture Spine Atlas',
        url: AssetUrls.monster(item.id, 'atlas')
      });
      list.push({
        name: `${item.id}.png`,
        type: 'Rapture Spine Texture',
        url: AssetUrls.monster(item.id, 'png')
      });
    } else if (item.type === 'favorite') {
      list.push({
        name: `${item.id}.skel`,
        type: 'Favorite Spine Skeleton',
        url: AssetUrls.favorite(item.id, 'skel')
      });
      list.push({
        name: `${item.id}.atlas`,
        type: 'Favorite Spine Atlas',
        url: AssetUrls.favorite(item.id, 'atlas')
      });
      list.push({
        name: `${item.id}.png`,
        type: 'Favorite Spine Texture',
        url: AssetUrls.favorite(item.id, 'png')
      });
      if (item.wallpaper) {
        list.push({
          name: `wallpaper_${item.id}.png`,
          type: 'Favorite Wallpaper',
          url: item.wallpaper
        });
      }
      if (item.sceneMi) {
        list.push({
          name: `preview_${item.id}.png`,
          type: 'Favorite Scene Card',
          url: item.sceneMi
        });
      }
    } else if (item.type === 'eventscene') {
      list.push({
        name: `${item.id}.skel`,
        type: 'Spine Skeleton',
        url: AssetUrls.eventScene(item.id, 'skel')
      });
      list.push({
        name: `${item.id}.atlas`,
        type: 'Spine Atlas',
        url: AssetUrls.eventScene(item.id, 'atlas')
      });
      list.push({
        name: `${item.id}.png`,
        type: 'Spine Texture',
        url: AssetUrls.eventScene(item.id, 'png')
      });
      if (item.sceneMi) {
        list.push({
          name: `preview_${item.id}.png`,
          type: 'Scene Card',
          url: item.sceneMi
        });
      }
    }

    return list;
  };

  const files = getFileList();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 overscroll-contain">
      <div
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#1c1c1c] border border-[#333333] rounded-2xl shadow-2xl overflow-hidden overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#282828] bg-[#161616]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">{item.name}</h2>
                
                {/* Clickable ID button that copies ID to clipboard */}
                <button
                  type="button"
                  onClick={() => copyToClipboard(item.id, true)}
                  className="flex items-center gap-1 px-2 py-0.5 text-xs font-mono bg-[#282828] hover:bg-[#333333] text-neutral-300 hover:text-white border border-[#383838] rounded-md transition-colors group cursor-pointer"
                  title="클릭하여 ID 복사"
                >
                  <span>{item.id}</span>
                  {copiedId ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3 text-neutral-500 group-hover:text-neutral-300" />
                  )}
                  {copiedId && <span className="text-[10px] text-emerald-400 font-sans font-medium">복사됨!</span>}
                </button>

                {item.isNew && (
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold bg-amber-500 text-neutral-950 rounded-md">
                    <Sparkles className="w-2.5 h-2.5" />
                    NEW
                  </span>
                )}
              </div>
              {(item as any).krName && (
                <p className="text-xs text-neutral-400 mt-0.5">{(item as any).krName}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onDownloadSingle(item)}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>전체 에셋 다운로드</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white hover:bg-[#282828] rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overscroll-contain">
          
          {/* Left: Preview Panel */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                일러스트 & 썸네일 미리보기
              </span>
              {item.type === 'character' && (
                <div className="flex items-center gap-1 bg-[#262626] p-0.5 rounded-lg border border-[#383838] text-[11px]">
                  {(['full', 'medium', 'icon', 'hq'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setSelectedImageTab(tab)}
                      className={`px-2 py-0.5 rounded capitalize ${
                        selectedImageTab === tab
                          ? 'bg-orange-500 text-white font-medium shadow-sm'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Main Preview Frame */}
            <div className="relative w-full aspect-[3/4] max-h-[380px] bg-[#121212] border border-[#2a2a2a] rounded-xl overflow-hidden flex items-center justify-center p-2 shadow-inner">
              {item.type === 'character' ? (
                <img
                  src={
                    selectedImageTab === 'full' ? item.thumbnails.full :
                    selectedImageTab === 'medium' ? item.thumbnails.medium :
                    selectedImageTab === 'hq' ? item.thumbnails.hq :
                    item.thumbnails.icon
                  }
                  alt={item.name}
                  className="max-w-full max-h-full object-contain drop-shadow-2xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `${import.meta.env.BASE_URL}assets/icn_corp_unknown.png`;
                  }}
                />
              ) : item.type === 'burst' ? (
                <img
                  src={item.thumbnail}
                  alt={item.name}
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `${import.meta.env.BASE_URL}assets/icn_corp_unknown.png`;
                  }}
                />
              ) : item.type === 'favorite' ? (
                <img
                  src={item.sceneMi || item.icon || `${import.meta.env.BASE_URL}assets/icn_corp_unknown.png`}
                  alt={item.name}
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `${import.meta.env.BASE_URL}assets/icn_corp_unknown.png`;
                  }}
                />
              ) : item.type === 'eventscene' ? (
                <img
                  src={item.sceneMi || item.sceneSi || `${import.meta.env.BASE_URL}assets/icn_corp_unknown.png`}
                  alt={item.name}
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `${import.meta.env.BASE_URL}assets/icn_corp_unknown.png`;
                  }}
                />
              ) : (
                <img
                  src={(item as any).thumbnail || `${import.meta.env.BASE_URL}assets/icn_corp_unknown.png`}
                  alt={item.name}
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `${import.meta.env.BASE_URL}assets/icn_corp_unknown.png`;
                  }}
                />
              )}
            </div>
          </div>

          {/* Right: File Breakdown & Individual Download List */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                포함된 Spine & 에셋 파일 목록 ({files.length}개)
              </span>
              <span className="text-[11px] text-orange-400 font-medium">
                * 클릭 시 개별 다운로드
              </span>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[380px] flex flex-col gap-2 pr-1 overscroll-contain">
              {files.map((file, idx) => {
                const isDownloadingThis = downloadingUrl === file.url;
                return (
                  <div
                    key={idx}
                    onClick={() => handleDownloadSingleFile(file.url, file.name)}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#242424] hover:bg-[#2c2c2c] border border-[#303030] hover:border-orange-500/50 transition-all cursor-pointer group shadow-sm"
                    title={`클릭하여 ${file.name} 개별 다운로드`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="p-1.5 rounded-lg bg-[#1a1a1a] text-neutral-400 group-hover:text-orange-400 group-hover:bg-orange-500/10 transition-colors flex-shrink-0">
                        {isDownloadingThis ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-mono font-medium text-neutral-200 group-hover:text-white truncate">
                          {file.name}
                        </span>
                        <span className="text-[10px] text-neutral-500 group-hover:text-neutral-400">
                          {file.type}
                        </span>
                      </div>
                    </div>

                    <div
                      className="flex items-center gap-1 flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => copyToClipboard(file.url)}
                        className="p-1.5 text-neutral-400 hover:text-white hover:bg-[#333333] rounded-lg transition-colors cursor-pointer"
                        title="URL 복사"
                      >
                        {copiedUrl === file.url ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-neutral-400 hover:text-white hover:bg-[#333333] rounded-lg transition-colors cursor-pointer"
                        title="새 탭에서 열기"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
