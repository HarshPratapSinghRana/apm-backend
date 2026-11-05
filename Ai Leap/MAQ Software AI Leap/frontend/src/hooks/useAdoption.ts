import { useState, useCallback, useMemo } from "react";
import { useMsal } from "@azure/msal-react";

const STORAGE_KEY = "ai-leap-adoptions";

interface AdoptionEntry {
  userEmail: string;
}

type AdoptionStore = Record<string, AdoptionEntry[]>;

function loadStore(): AdoptionStore {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveStore(store: AdoptionStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function getAnonId(): string {
  let id = localStorage.getItem("ai-leap-anon-id");
  if (!id) { id = "anon-" + crypto.randomUUID(); localStorage.setItem("ai-leap-anon-id", id); }
  return id;
}

export function useAdoption(useCaseId: string) {
  const { accounts } = useMsal();
  const userEmail = accounts?.[0]?.username || getAnonId();
  const [rev, setRev] = useState(0);

  const data = useMemo(() => {
    void rev;
    const store = loadStore();
    const entries = store[useCaseId] ?? [];
    const isAdopted = !!userEmail && entries.some((e) => e.userEmail === userEmail);
    return { adoptionCount: entries.length, isAdopted };
  }, [useCaseId, userEmail, rev]);

  const toggleAdoption = useCallback(() => {
    const store = loadStore();
    const entries = store[useCaseId] ?? [];
    const idx = entries.findIndex((e) => e.userEmail === userEmail);
    if (idx >= 0) {
      entries.splice(idx, 1);
    } else {
      entries.push({ userEmail });
    }
    store[useCaseId] = entries;
    saveStore(store);
    setRev((r) => r + 1);
  }, [useCaseId, userEmail]);

  return { ...data, toggleAdoption, isLoggedIn: !!userEmail };
}
