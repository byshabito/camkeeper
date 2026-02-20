/*
 * CamKeeper - Cross-site creator profile manager
 * Copyright (C) 2026  Shabito
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

const DB_NAME = "camkeeper_profiles_db_v1";
const DB_VERSION = 1;
const STORE_NAME = "profiles";

let dbPromise = null;

function createIndexedDbError(message) {
  return new Error(`[CamKeeper] ${message}`);
}

function getIndexedDb() {
  const idb = globalThis.indexedDB;
  if (!idb) {
    throw createIndexedDbError("IndexedDB is unavailable in this context");
  }
  return idb;
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      reject(request.error || createIndexedDbError("IndexedDB request failed"));
    };
  });
}

function transactionToPromise(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => {
      reject(transaction.error || createIndexedDbError("IndexedDB transaction aborted"));
    };
    transaction.onerror = () => {
      reject(transaction.error || createIndexedDbError("IndexedDB transaction failed"));
    };
  });
}

async function openProfilesDb() {
  if (!dbPromise) {
    const indexedDb = getIndexedDb();
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDb.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };
      request.onerror = () => {
        dbPromise = null;
        reject(request.error || createIndexedDbError("Failed to open profiles database"));
      };
      request.onblocked = () => {
        console.warn("[CamKeeper] IndexedDB open blocked while migrating profiles store");
      };
    });
  }
  return dbPromise;
}

export async function getProfiles() {
  const db = await openProfilesDb();
  const transaction = db.transaction(STORE_NAME, "readonly");
  const transactionDone = transactionToPromise(transaction);
  const store = transaction.objectStore(STORE_NAME);
  const profiles = await requestToPromise(store.getAll());
  await transactionDone;
  return Array.isArray(profiles) ? profiles : [];
}

export async function getProfile(id) {
  if (!id) return null;
  const db = await openProfilesDb();
  const transaction = db.transaction(STORE_NAME, "readonly");
  const transactionDone = transactionToPromise(transaction);
  const store = transaction.objectStore(STORE_NAME);
  const profile = await requestToPromise(store.get(id));
  await transactionDone;
  return profile || null;
}

export async function saveProfile(profile) {
  const db = await openProfilesDb();
  const transaction = db.transaction(STORE_NAME, "readwrite");
  const store = transaction.objectStore(STORE_NAME);
  store.put(profile);
  await transactionToPromise(transaction);
  return profile;
}

export async function saveProfiles(profiles) {
  const next = Array.isArray(profiles) ? profiles : [];
  const db = await openProfilesDb();
  const transaction = db.transaction(STORE_NAME, "readwrite");
  const store = transaction.objectStore(STORE_NAME);
  store.clear();
  next.forEach((profile) => {
    store.put(profile);
  });
  await transactionToPromise(transaction);
  return next;
}

export async function deleteProfile(id) {
  if (!id) return getProfiles();
  const db = await openProfilesDb();
  const transaction = db.transaction(STORE_NAME, "readwrite");
  const store = transaction.objectStore(STORE_NAME);
  store.delete(id);
  await transactionToPromise(transaction);
  return getProfiles();
}
