import { useCallback } from "react";

export interface UploadDraft {
  projectTitle: string;
  projectDescription: string;
  category: string;
  keyFeatures: string;
  techStack: string;
  demoVideoUrl: string;
  impact: string;
  zipFilename: string | null;
  zipFileSize: number | null;
  architectureDiagramFilename: string | null;
  architectureDiagramFileSize: number | null;
}

const DRAFT_STORAGE_KEY = "upload-solution-draft";

export function useUploadDraft() {
  // Load draft from localStorage
  const loadDraft = useCallback((): UploadDraft | null => {
    try {
      const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!stored) return null;
      return JSON.parse(stored) as UploadDraft;
    } catch {
      return null;
    }
  }, []);

  // Save draft to localStorage
  const saveDraft = useCallback((draft: UploadDraft): void => {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Silently fail if localStorage is unavailable
    }
  }, []);

  // Clear draft from localStorage
  const clearDraft = useCallback((): void => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // Silently fail if localStorage is unavailable
    }
  }, []);

  // Check if draft exists
  const hasDraft = useCallback((): boolean => {
    try {
      return localStorage.getItem(DRAFT_STORAGE_KEY) !== null;
    } catch {
      return false;
    }
  }, []);

  return {
    loadDraft,
    saveDraft,
    clearDraft,
    hasDraft,
  };
}
