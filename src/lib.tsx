export type SignaturePackImageType = 'signatures' | 'initials';

export interface SignaturePack {
  id: string;
  name: string;
  signatures: Blob[];
  initials: Blob[];
}

interface StoredSignaturePack {
  id: string;
  name: string;
  signatures: ArrayBuffer[];
  initials: ArrayBuffer[];
}

const ACTIVE_PACK_SETTING = 'activeSignaturePackId';
let databasePromise: Promise<IDBDatabase> | null = null;

const requestResult = <T,>(request: IDBRequest<T>, errorMessage: string) =>
  new Promise<T>((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result));
    request.addEventListener('error', () => reject(new Error(errorMessage)));
  });

const transactionDone = (transaction: IDBTransaction, errorMessage: string) =>
  new Promise<void>((resolve, reject) => {
    transaction.addEventListener('complete', () => resolve());
    transaction.addEventListener('abort', () => reject(new Error(errorMessage)));
    transaction.addEventListener('error', () => reject(new Error(errorMessage)));
  });

export const getIndexedDbDatabase = () => {
  if (databasePromise) return databasePromise;

  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('signatur', 2);
    let wasBlocked = false;

    request.addEventListener('success', () => {
      if (wasBlocked) {
        request.result.close();
        return;
      }
      request.result.addEventListener('versionchange', () => {
        request.result.close();
        databasePromise = null;
      });
      resolve(request.result);
    });

    request.addEventListener('error', () => {
      reject(new Error('Could not open saved signature packs'));
    });

    request.addEventListener('blocked', () => {
      wasBlocked = true;
      reject(new Error('Close other tabs of this app, then reload to update saved signature packs'));
    });

    request.addEventListener('upgradeneeded', (event) => {
      const database = request.result;
      const { transaction } = request;
      if (!transaction) throw new Error('No IndexedDB upgrade transaction found');

      const { oldVersion } = event;
      const packsStore = database.createObjectStore('signaturePacks', { keyPath: 'id' });
      const settingsStore = database.createObjectStore('settings');
      const personalPackId = crypto.randomUUID();

      if (oldVersion < 1) {
        packsStore.add({
          id: personalPackId,
          name: 'Personal',
          signatures: [],
          initials: [],
        } satisfies StoredSignaturePack);
        settingsStore.put(personalPackId, ACTIVE_PACK_SETTING);
        return;
      }

      const signaturesRequest = transaction.objectStore('signatures').getAll();
      signaturesRequest.addEventListener('success', () => {
        const initialsRequest = transaction.objectStore('initials').getAll();
        initialsRequest.addEventListener('success', () => {
          packsStore.add({
            id: personalPackId,
            name: 'Personal',
            signatures: signaturesRequest.result as ArrayBuffer[],
            initials: initialsRequest.result as ArrayBuffer[],
          } satisfies StoredSignaturePack);
          settingsStore.put(personalPackId, ACTIVE_PACK_SETTING);
          database.deleteObjectStore('signatures');
          database.deleteObjectStore('initials');
        });
      });
    });
  }).catch((error: unknown) => {
    databasePromise = null;
    throw error;
  });

  return databasePromise;
};

export const readSignaturePacks = async (database: IDBDatabase): Promise<SignaturePack[]> => {
  const transaction = database.transaction('signaturePacks', 'readonly');
  const records = await requestResult(
    transaction.objectStore('signaturePacks').getAll() as IDBRequest<StoredSignaturePack[]>,
    'Could not read saved signature packs',
  );

  return records.map((record) => ({
    id: record.id,
    name: record.name,
    signatures: record.signatures.map((buffer) => new Blob([buffer], { type: 'image/png' })),
    initials: record.initials.map((buffer) => new Blob([buffer], { type: 'image/png' })),
  }));
};

export const writeSignaturePack = async (database: IDBDatabase, pack: SignaturePack) => {
  const record: StoredSignaturePack = {
    id: pack.id,
    name: pack.name,
    signatures: await Promise.all(pack.signatures.map((blob) => blob.arrayBuffer())),
    initials: await Promise.all(pack.initials.map((blob) => blob.arrayBuffer())),
  };
  const transaction = database.transaction('signaturePacks', 'readwrite');
  transaction.objectStore('signaturePacks').put(record);
  await transactionDone(transaction, 'Could not save signature pack');
};

export const createSignaturePackAndSelect = async (database: IDBDatabase, pack: SignaturePack) => {
  const record: StoredSignaturePack = {
    id: pack.id,
    name: pack.name,
    signatures: await Promise.all(pack.signatures.map((blob) => blob.arrayBuffer())),
    initials: await Promise.all(pack.initials.map((blob) => blob.arrayBuffer())),
  };
  const transaction = database.transaction(['signaturePacks', 'settings'], 'readwrite');
  transaction.objectStore('signaturePacks').add(record);
  transaction.objectStore('settings').put(pack.id, ACTIVE_PACK_SETTING);
  await transactionDone(transaction, 'Could not create signature pack');
};

export const writeSignaturePackName = async (database: IDBDatabase, packId: string, name: string) => {
  const transaction = database.transaction('signaturePacks', 'readwrite');
  const store = transaction.objectStore('signaturePacks');
  const record = await requestResult(
    store.get(packId) as IDBRequest<StoredSignaturePack | undefined>,
    'Could not rename signature pack',
  );
  if (!record) {
    transaction.abort();
    throw new Error('Could not find signature pack to rename');
  }
  store.put({ ...record, name } satisfies StoredSignaturePack);
  await transactionDone(transaction, 'Could not rename signature pack');
};

export const readActiveSignaturePackId = async (database: IDBDatabase) => {
  const transaction = database.transaction('settings', 'readonly');
  const result = await requestResult(
    transaction.objectStore('settings').get(ACTIVE_PACK_SETTING) as IDBRequest<string | undefined>,
    'Could not read the active signature pack',
  );
  return result ?? null;
};

export const writeActiveSignaturePackId = async (database: IDBDatabase, packId: string) => {
  const transaction = database.transaction('settings', 'readwrite');
  transaction.objectStore('settings').put(packId, ACTIVE_PACK_SETTING);
  await transactionDone(transaction, 'Could not save the active signature pack');
};

export const deleteSignaturePackAndSelect = async (database: IDBDatabase, packId: string, nextPackId: string) => {
  const transaction = database.transaction(['signaturePacks', 'settings'], 'readwrite');
  transaction.objectStore('signaturePacks').delete(packId);
  transaction.objectStore('settings').put(nextPackId, ACTIVE_PACK_SETTING);
  await transactionDone(transaction, 'Could not delete signature pack');
};

// https://stackoverflow.com/a/2450976
export const shuffle = <T,>(originalArray: T[]): T[] => {
  const array = [...originalArray];
  let currentIndex = array.length;
  let randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex !== 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [array[randomIndex] as T, array[currentIndex] as T];
  }

  return array;
};
