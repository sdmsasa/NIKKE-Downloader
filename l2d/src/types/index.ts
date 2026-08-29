export type AssetCategory = 'characters' | 'bursts' | 'monsters' | 'favorites' | 'eventscenes' | 'updates';

export type CharacterPose = 'idle' | 'aim' | 'cover';

export interface CharacterItem {
  id: string; // e.g. "c010_00"
  name: string; // e.g. "Rapi"
  displayName?: string; // Formatted display name (e.g. "라푼젤: 퓨어 그레이스")
  krName?: string; // Translated / search friendly name
  subInfo?: string; // e.g. "필그림 · 갓데스"
  aliases?: string[];
  color?: string;
  isNew?: boolean;
  poses: CharacterPose[];
  thumbnails: {
    icon: string;
    iconFallback?: string;
    medium: string;
    full: string;
    hq: string;
  };
}

export interface BurstItem {
  id: string; // e.g. "c010_00_skillcut"
  name: string;
  displayName?: string;
  krName?: string;
  subInfo?: string;
  characterId: string;
  isNew?: boolean;
  thumbnail: string;
}

export interface MonsterItem {
  id: string; // e.g. "eba003_psid"
  name: string;
  displayName?: string;
  krName?: string;
  subInfo?: string;
  isNew?: boolean;
  thumbnail?: string;
}

export interface FavoriteItem {
  id: string; // e.g. "FavoriteItemScene_c030_00"
  name: string;
  displayName?: string;
  krName?: string;
  subInfo?: string;
  characterId?: string;
  isNew?: boolean;
  icon?: string;
  wallpaper?: string;
  sceneSi?: string;
  sceneMi?: string;
}

export interface EventSceneItem {
  id: string; // e.g. "EventScene_staranis_03"
  name: string;
  displayName?: string;
  krName?: string;
  subInfo?: string;
  isNew?: boolean;
  sceneSi?: string;
  sceneMi?: string;
}

export type AnyAssetItem = 
  | ({ type: 'character' } & CharacterItem)
  | ({ type: 'burst' } & BurstItem)
  | ({ type: 'monster' } & MonsterItem)
  | ({ type: 'favorite' } & FavoriteItem)
  | ({ type: 'eventscene' } & EventSceneItem);

export interface DownloadFilePlan {
  url: string;
  targetPath: string; // e.g. "c010_00 Rapi/idle/c010_00.skel"
  fileType: 'skel' | 'atlas' | 'png' | 'image';
  size?: number;
}

export interface DownloadTask {
  id: string;
  assetId: string;
  assetType: 'character' | 'burst' | 'monster' | 'favorite' | 'eventscene';
  title: string;
  folderName: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'skipped';
  totalFiles: number;
  completedFiles: number;
  files: DownloadFilePlan[];
  error?: string;
}

export interface DownloadOptions {
  mode: 'directory' | 'zip';
  folderNaming: 'id_name' | 'bracket_id_name' | 'name_id' | 'id_only' | 'name_only';
  categorySubfolders: boolean; // characters/, bursts/ ...
  characterSubfolders: boolean; // idle/, aim/, cover/, images/
  poses: {
    idle: boolean;
    aim: boolean;
    cover: boolean;
  };
  includeImages: {
    icon: boolean;
    medium: boolean;
    full: boolean;
    hq: boolean;
  };
  includeBurst: boolean;
  concurrency: number;
  skipExisting: boolean;
}

export interface FilterState {
  category: AssetCategory;
  search: string;
  manufacturer: 'all' | 'elysion' | 'missilis' | 'tetra' | 'pilgrim' | 'abnormal' | 'other';
  onlyNew: boolean;
  onlySelected: boolean;
  onlyDownloaded: 'all' | 'downloaded' | 'not_downloaded';
  viewMode: 'grid' | 'list';
  sortBy: 'id' | 'name' | 'newest';
  sortOrder: 'asc' | 'desc';
}
