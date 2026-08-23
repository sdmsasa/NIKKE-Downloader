import type { AnyAssetItem, DownloadOptions, DownloadFilePlan, CharacterPose } from '../types';
import { AssetUrls, parseAtlasPngFiles, getCharacterPoseFileName } from './nkasApi';
import { sanitizeFileName } from './fileSystem';

export interface FailedTaskInfo {
  item: AnyAssetItem;
  error: string;
  time: string;
}

export interface DownloadProgressInfo {
  isRunning: boolean;
  isPaused: boolean;
  totalItems: number;
  completedItems: number;
  failedItems: number;
  totalFiles: number;
  completedFiles: number;
  currentTaskName?: string;
  currentFileName?: string;
  bytesDownloaded: number;
  speedBytesPerSec: number;
  logs: { time: string; message: string; type: 'info' | 'success' | 'warning' | 'error' }[];
  failedTasks: FailedTaskInfo[];
}

export function formatFolderId(rawId: string): string {
  // If character/model ends with _00 (default skin), omit _00 (e.g. c411_00 -> c411, c010_00 -> c010)
  // Skin models with _01, _02, _03 etc. preserve their suffix (e.g. c411_01, c870_01)
  if (rawId.endsWith('_00')) {
    return rawId.slice(0, -3);
  }
  if (rawId.includes('_00_')) {
    return rawId.replace('_00_', '_');
  }
  return rawId;
}

export function formatItemFolderName(item: AnyAssetItem, naming: DownloadOptions['folderNaming']): string {
  const folderId = sanitizeFileName(formatFolderId(item.id));
  const name = sanitizeFileName(item.name || item.id);

  switch (naming) {
    case 'name_id':
      return `${name} ${folderId}`;
    case 'id_only':
      return folderId;
    case 'name_only':
      return name;
    case 'bracket_id_name':
      return `[${folderId}] ${name}`;
    case 'id_name':
    default:
      return `${folderId} ${name}`;
  }
}

export async function buildAssetDownloadPlan(
  item: AnyAssetItem,
  options: DownloadOptions
): Promise<DownloadFilePlan[]> {
  const plans: DownloadFilePlan[] = [];
  const folderName = formatItemFolderName(item, options.folderNaming);

  // Category prefix matching D:\l2d folder structure
  const categoryDir = options.categorySubfolders
    ? item.type === 'character' ? 'L2D'
      : item.type === 'burst' ? 'SKILLCUT'
      : item.type === 'monster' ? 'RAPTURE'
      : item.type === 'favorite' ? 'FAVORITE ITEM'
      : 'EVENT SCENE'
    : '';

  const basePath = categoryDir ? `${categoryDir}/${folderName}` : folderName;

  if (item.type === 'character') {
    const posesToDownload: CharacterPose[] = [];
    if (options.poses.idle) posesToDownload.push('idle');
    if (options.poses.aim) posesToDownload.push('aim');
    if (options.poses.cover) posesToDownload.push('cover');

    for (const pose of posesToDownload) {
      const basePoseFileName = getCharacterPoseFileName(item.id, pose);
      const atlasUrl = AssetUrls.characterPose(item.id, pose, 'atlas');
      const skelUrl = AssetUrls.characterPose(item.id, pose, 'skel');

      // Probe if this pose exists on server
      try {
        const atlasRes = await fetch(atlasUrl);
        if (!atlasRes.ok) {
          // Pose doesn't exist for this model
          continue;
        }

        const atlasText = await atlasRes.text();
        const textureNames = parseAtlasPngFiles(atlasText, basePoseFileName);

        // idle pose is placed directly in character folder without creating an idle/ subfolder
        const poseSubdir = options.characterSubfolders
          ? (pose === 'idle' ? basePath : `${basePath}/${pose}`)
          : basePath;
        const filePrefix = options.characterSubfolders
          ? basePoseFileName
          : `${item.id}_${pose}`;

        plans.push({
          url: skelUrl,
          targetPath: `${poseSubdir}/${filePrefix}.skel`,
          fileType: 'skel'
        });

        plans.push({
          url: atlasUrl,
          targetPath: `${poseSubdir}/${filePrefix}.atlas`,
          fileType: 'atlas'
        });

        for (const texName of textureNames) {
          plans.push({
            url: AssetUrls.characterPose(item.id, pose, texName),
            targetPath: `${poseSubdir}/${texName}`,
            fileType: 'png'
          });
        }
      } catch {
        // If fetch fails, skip this pose
      }
    }

    // Thumbnails & Illustrations
    const imgDir = options.characterSubfolders ? `${basePath}/images` : basePath;
    if (options.includeImages.icon) {
      plans.push({
        url: AssetUrls.characterIcon(item.id),
        targetPath: `${imgDir}/icon_${item.id}.png`,
        fileType: 'image'
      });
    }
    if (options.includeImages.medium) {
      plans.push({
        url: AssetUrls.characterMedium(item.id),
        targetPath: `${imgDir}/card_${item.id}.png`,
        fileType: 'image'
      });
    }
    if (options.includeImages.full) {
      plans.push({
        url: AssetUrls.characterFull(item.id),
        targetPath: `${imgDir}/full_${item.id}.png`,
        fileType: 'image'
      });
    }
    if (options.includeImages.hq) {
      plans.push({
        url: AssetUrls.characterHQ(item.id),
        targetPath: `${imgDir}/hq_${item.id}.png`,
        fileType: 'image'
      });
    }
  } else if (item.type === 'burst') {
    const atlasUrl = AssetUrls.burst(item.id, 'atlas');
    let textureNames = [`${item.id}.png`];

    try {
      const atlasRes = await fetch(atlasUrl);
      if (atlasRes.ok) {
        const atlasText = await atlasRes.text();
        textureNames = parseAtlasPngFiles(atlasText, item.id);
      }
    } catch {
      // Fallback
    }

    plans.push({
      url: AssetUrls.burst(item.id, 'skel'),
      targetPath: `${basePath}/${item.id}.skel`,
      fileType: 'skel'
    });
    plans.push({
      url: atlasUrl,
      targetPath: `${basePath}/${item.id}.atlas`,
      fileType: 'atlas'
    });

    for (const tex of textureNames) {
      plans.push({
        url: AssetUrls.burst(item.id, tex),
        targetPath: `${basePath}/${tex}`,
        fileType: 'png'
      });
    }
  } else if (item.type === 'monster') {
    const atlasUrl = AssetUrls.monster(item.id, 'atlas');
    let textureNames = [`${item.id}.png`];

    try {
      const atlasRes = await fetch(atlasUrl);
      if (atlasRes.ok) {
        const atlasText = await atlasRes.text();
        textureNames = parseAtlasPngFiles(atlasText, item.id);
      }
    } catch {
      // Fallback
    }

    plans.push({
      url: AssetUrls.monster(item.id, 'skel'),
      targetPath: `${basePath}/${item.id}.skel`,
      fileType: 'skel'
    });
    plans.push({
      url: atlasUrl,
      targetPath: `${basePath}/${item.id}.atlas`,
      fileType: 'atlas'
    });

    for (const tex of textureNames) {
      plans.push({
        url: AssetUrls.monster(item.id, tex),
        targetPath: `${basePath}/${tex}`,
        fileType: 'png'
      });
    }
  } else if (item.type === 'favorite') {
    const atlasUrl = AssetUrls.favorite(item.id, 'atlas');
    let textureNames = [`${item.id}.png`];

    try {
      const atlasRes = await fetch(atlasUrl);
      if (atlasRes.ok) {
        const atlasText = await atlasRes.text();
        textureNames = parseAtlasPngFiles(atlasText, item.id);
      }
    } catch {
      // Fallback
    }

    plans.push({
      url: AssetUrls.favorite(item.id, 'skel'),
      targetPath: `${basePath}/${item.id}.skel`,
      fileType: 'skel'
    });
    plans.push({
      url: atlasUrl,
      targetPath: `${basePath}/${item.id}.atlas`,
      fileType: 'atlas'
    });

    for (const tex of textureNames) {
      plans.push({
        url: AssetUrls.favorite(item.id, tex),
        targetPath: `${basePath}/${tex}`,
        fileType: 'png'
      });
    }

    if (item.icon) {
      plans.push({
        url: item.icon,
        targetPath: `${basePath}/icon_${item.characterId || item.id}.png`,
        fileType: 'image'
      });
    }
    if (item.wallpaper) {
      plans.push({
        url: item.wallpaper,
        targetPath: `${basePath}/wallpaper_${item.characterId || item.id}.png`,
        fileType: 'image'
      });
    }
  } else if (item.type === 'eventscene') {
    const atlasUrl = AssetUrls.eventScene(item.id, 'atlas');
    let textureNames = [`${item.id}.png`];

    try {
      const atlasRes = await fetch(atlasUrl);
      if (atlasRes.ok) {
        const atlasText = await atlasRes.text();
        textureNames = parseAtlasPngFiles(atlasText, item.id);
      }
    } catch {
      // Fallback
    }

    plans.push({
      url: AssetUrls.eventScene(item.id, 'skel'),
      targetPath: `${basePath}/${item.id}.skel`,
      fileType: 'skel'
    });
    plans.push({
      url: atlasUrl,
      targetPath: `${basePath}/${item.id}.atlas`,
      fileType: 'atlas'
    });

    for (const tex of textureNames) {
      plans.push({
        url: AssetUrls.eventScene(item.id, tex),
        targetPath: `${basePath}/${tex}`,
        fileType: 'png'
      });
    }

    if (item.sceneMi) {
      plans.push({
        url: item.sceneMi,
        targetPath: `${basePath}/preview_${item.id}.png`,
        fileType: 'image'
      });
    }
  }

  return plans;
}

export interface DownloadHistoryRecord {
  downloadedAt: string;
  type: string;
  name: string;
}

export const HistoryStorage = {
  KEY: 'nikke_asset_download_history_v1',

  getHistory(): Record<string, DownloadHistoryRecord> {
    try {
      const raw = localStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  isDownloaded(id: string): boolean {
    const history = this.getHistory();
    return !!history[id];
  },

  recordDownloaded(item: AnyAssetItem): void {
    try {
      const history = this.getHistory();
      history[item.id] = {
        downloadedAt: new Date().toISOString(),
        type: item.type,
        name: item.name
      };
      localStorage.setItem(this.KEY, JSON.stringify(history));
    } catch (e) {
      console.warn('Failed to save download history to localStorage', e);
    }
  },

  recordMultiple(items: AnyAssetItem[]): void {
    try {
      const history = this.getHistory();
      const now = new Date().toISOString();
      for (const item of items) {
        history[item.id] = {
          downloadedAt: now,
          type: item.type,
          name: item.name
        };
      }
      localStorage.setItem(this.KEY, JSON.stringify(history));
    } catch (e) {
      console.warn('Failed to save download history', e);
    }
  },

  clearHistory(): void {
    localStorage.removeItem(this.KEY);
  }
};
