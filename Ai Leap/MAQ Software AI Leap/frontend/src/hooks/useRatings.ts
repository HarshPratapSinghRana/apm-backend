import { useState, useCallback, useMemo } from "react";
import { useMsal } from "@azure/msal-react";

const STORAGE_KEY = "ai-leap-ratings";

interface RatingEntry {
  userEmail: string;
  rating: number;
}

type RatingsStore = Record<string, RatingEntry[]>;

function loadStore(): RatingsStore {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveStore(store: RatingsStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function getAnonId(): string {
  let id = localStorage.getItem("ai-leap-anon-id");
  if (!id) { id = "anon-" + crypto.randomUUID(); localStorage.setItem("ai-leap-anon-id", id); }
  return id;
}

export function useRatings(useCaseId: string) {
  const { accounts } = useMsal();
  const userEmail = accounts?.[0]?.username || getAnonId();
  const [rev, setRev] = useState(0); // force re-read

  const data = useMemo(() => {
    void rev; // subscribe to rev changes
    const store = loadStore();
    const entries = store[useCaseId] ?? [];
    const total = entries.length;
    const avg = total > 0 ? entries.reduce((s, e) => s + e.rating, 0) / total : 0;
    const mine = userEmail ? entries.find((e) => e.userEmail === userEmail)?.rating ?? 0 : 0;
    return { avgRating: Math.round(avg * 10) / 10, totalRatings: total, userRating: mine };
  }, [useCaseId, userEmail, rev]);

  const setRating = useCallback(
    (rating: number) => {
      const store = loadStore();
      const entries = store[useCaseId] ?? [];
      const idx = entries.findIndex((e) => e.userEmail === userEmail);
      if (idx >= 0) {
        entries[idx].rating = rating;
      } else {
        entries.push({ userEmail, rating });
      }
      store[useCaseId] = entries;
      saveStore(store);
      setRev((r) => r + 1);
    },
    [useCaseId, userEmail]
  );

  return { ...data, setRating, isLoggedIn: !!userEmail };
}
