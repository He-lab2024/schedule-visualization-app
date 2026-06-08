import type { PersistedState } from './types';

export const dataFilename = 'schedule-data.json';
export const backupFolderName = 'backups';

export type StorageAdapter = {
  save(state: PersistedState): Promise<void>;
  load(): Promise<PersistedState | null>;
  createBackup(state: PersistedState): Promise<string>;
};

export class BrowserStorageAdapter implements StorageAdapter {
  constructor(
    private readonly storage: Storage,
    private readonly key: string,
    private readonly autoBackupKey: string,
    private readonly manualBackupKey: string,
  ) {}

  async save(state: PersistedState) {
    const previous = this.storage.getItem(this.key);
    if (previous) this.storage.setItem(this.autoBackupKey, previous);
    this.storage.setItem(this.key, JSON.stringify(state));
  }

  async load() {
    const raw = this.storage.getItem(this.key);
    return raw ? (JSON.parse(raw) as PersistedState) : null;
  }

  async createBackup(state: PersistedState) {
    this.storage.setItem(this.manualBackupKey, JSON.stringify(state));
    return this.manualBackupKey;
  }
}

export class FileSystemStorageAdapter implements StorageAdapter {
  constructor(private readonly directoryHandle: FileSystemDirectoryHandle) {}

  async hasDataFile() {
    try {
      await this.directoryHandle.getFileHandle(dataFilename);
      return true;
    } catch {
      return false;
    }
  }

  async save(state: PersistedState) {
    const fileHandle = await this.directoryHandle.getFileHandle(dataFilename, { create: true });
    await writeJsonFile(fileHandle, state);
  }

  async load() {
    const fileHandle = await this.directoryHandle.getFileHandle(dataFilename);
    const file = await fileHandle.getFile();
    return JSON.parse(await file.text()) as PersistedState;
  }

  async createBackup(state: PersistedState) {
    const backupDirectory = await this.directoryHandle.getDirectoryHandle(backupFolderName, { create: true });
    const filename = `schedule-data-${formatTimestamp(new Date())}.json`;
    const fileHandle = await backupDirectory.getFileHandle(filename, { create: true });
    await writeJsonFile(fileHandle, state);
    return `${backupFolderName}/${filename}`;
  }
}

const writeJsonFile = async (fileHandle: FileSystemFileHandle, state: PersistedState) => {
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(state, null, 2));
  await writable.close();
};

export const formatTimestamp = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('-');
};
