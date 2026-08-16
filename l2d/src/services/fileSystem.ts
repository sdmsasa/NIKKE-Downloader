import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const DB_NAME = 'nikke_downloader_fs_db';
const STORE_NAME = 'dir_handles';
const DIR_KEY = 'saved_directory_handle';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB is not available'));
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save directory handle to IndexedDB across page reloads
 */
export async function saveDirectoryHandleToIDB(handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(handle, DIR_KEY);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to save directory handle to IndexedDB', err);
  }
}

/**
 * Retrieve saved directory handle from IndexedDB
 */
export async function getDirectoryHandleFromIDB(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(DIR_KEY);
    const handle = await new Promise<FileSystemDirectoryHandle | null>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    return handle;
  } catch {
    return null;
  }
}

/**
 * Clear saved directory handle from IndexedDB
 */
export async function clearDirectoryHandleFromIDB(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(DIR_KEY);
  } catch (err) {
    console.warn('Failed to clear directory handle from IndexedDB', err);
  }
}

/**
 * Verify / Request readwrite permission for a saved directory handle
 */
export async function verifyDirectoryPermission(
  handle: FileSystemDirectoryHandle,
  requestIfNeeded: boolean = true
): Promise<boolean> {
  if (!handle) return false;
  try {
    const opts = { mode: 'readwrite' };
    if ((await (handle as any).queryPermission(opts)) === 'granted') {
      return true;
    }
    if (requestIfNeeded) {
      if ((await (handle as any).requestPermission(opts)) === 'granted') {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

// Polyfill check for File System Access API
export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/**
 * Ask user to pick a target directory on their computer and save to IndexedDB
 */
export async function pickTargetDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!isFileSystemAccessSupported()) {
    throw new Error('File System Access API is not supported in this browser. Please use Chrome/Edge or ZIP mode.');
  }

  try {
    const handle = await (window as any).showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'downloads'
    });
    if (handle) {
      await saveDirectoryHandleToIDB(handle);
    }
    return handle;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return null; // User cancelled
    }
    throw err;
  }
}

/**
 * Recursively create subdirectories if they don't exist
 */
export async function getOrCreateSubdirectory(
  rootHandle: FileSystemDirectoryHandle,
  pathSegments: string[]
): Promise<FileSystemDirectoryHandle> {
  let currentHandle = rootHandle;
  for (const segment of pathSegments) {
    const cleanSegment = sanitizeFileName(segment);
    if (!cleanSegment) continue;
    currentHandle = await currentHandle.getDirectoryHandle(cleanSegment, { create: true });
  }
  return currentHandle;
}

/**
 * Sanitize filename to avoid invalid characters on Windows/Linux/Mac
 */
export function sanitizeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_').trim();
}

/**
 * Write remote URL content directly to target folder in FileSystem
 */
export async function writeUrlToFileSystem(
  rootHandle: FileSystemDirectoryHandle,
  filePathSegments: string[],
  url: string,
  onBytesProgress?: (bytes: number) => void
): Promise<{ success: boolean; bytes: number; error?: string }> {
  if (filePathSegments.length === 0) {
    throw new Error('Empty file path');
  }

  const dirSegments = filePathSegments.slice(0, -1);
  const fileName = sanitizeFileName(filePathSegments[filePathSegments.length - 1]);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { success: false, bytes: 0, error: `HTTP ${response.status} ${response.statusText}` };
    }

    const dirHandle = await getOrCreateSubdirectory(rootHandle, dirSegments);
    const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
    const writable = await (fileHandle as any).createWritable();

    if (response.body && 'pipeTo' in response.body && !onBytesProgress) {
      await response.body.pipeTo(writable);
      return { success: true, bytes: 0 };
    }

    const buffer = await response.arrayBuffer();
    await writable.write(buffer);
    await writable.close();

    if (onBytesProgress) {
      onBytesProgress(buffer.byteLength);
    }

    return { success: true, bytes: buffer.byteLength };
  } catch (err: any) {
    return { success: false, bytes: 0, error: err.message || 'Download error' };
  }
}

/**
 * Write raw text or blob to FileSystem
 */
export async function writeDataToFileSystem(
  rootHandle: FileSystemDirectoryHandle,
  filePathSegments: string[],
  data: string | Blob | Uint8Array
): Promise<void> {
  const dirSegments = filePathSegments.slice(0, -1);
  const fileName = sanitizeFileName(filePathSegments[filePathSegments.length - 1]);

  const dirHandle = await getOrCreateSubdirectory(rootHandle, dirSegments);
  const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
  const writable = await (fileHandle as any).createWritable();
  await writable.write(data);
  await writable.close();
}

/**
 * ZIP Archive builder
 */
export class ZipArchiveBuilder {
  private zip: JSZip;
  private zipName: string;

  constructor(zipName: string = 'nikke_assets.zip') {
    this.zip = new JSZip();
    this.zipName = zipName;
  }

  async addRemoteFile(pathInZip: string, url: string): Promise<boolean> {
    try {
      const response = await fetch(url);
      if (!response.ok) return false;
      const buffer = await response.arrayBuffer();
      this.zip.file(pathInZip, buffer);
      return true;
    } catch {
      return false;
    }
  }

  addTextFile(pathInZip: string, content: string): void {
    this.zip.file(pathInZip, content);
  }

  async generateAndDownload(onProgress?: (percent: number) => void): Promise<void> {
    const blob = await this.zip.generateAsync(
      { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
      (metadata) => {
        if (onProgress) {
          onProgress(metadata.percent);
        }
      }
    );
    saveAs(blob, this.zipName);
  }
}
