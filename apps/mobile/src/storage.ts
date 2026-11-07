import { Directory, File, Paths } from "expo-file-system";
import type { SnapshotStorage } from "@salvaspesa/app-core";

const fileFor = (key: string) => new File(Paths.document, `${key.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`);

// Snapshot e preferenze restano in file nella cartella documenti dell'app: nessun limite di dimensione come per AsyncStorage.
export async function readText(key: string): Promise<string | null> {
  try {
    const file = fileFor(key);
    return file.exists ? await file.text() : null;
  } catch {
    return null;
  }
}

export async function writeText(key: string, value: string): Promise<void> {
  const file = fileFor(key);
  if (!file.exists) file.create();
  file.write(value);
}

async function list(): Promise<{ key: string; size: number }[]> {
  return new Directory(Paths.document)
    .list()
    .filter((entry): entry is File => entry instanceof File && entry.name.endsWith(".json"))
    .map((entry) => ({ key: entry.name.slice(0, -".json".length), size: entry.size ?? 0 }));
}

async function remove(key: string): Promise<void> {
  const file = fileFor(key);
  if (file.exists) file.delete();
}

export const snapshotStorage: SnapshotStorage = { read: readText, write: writeText, list, remove };
