'use client';

import type { Campaign } from "@/lib/dashboard/types";

const STORAGE_KEY = "changia_user_campaigns";

export function loadUserCampaigns(): Campaign[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveUserCampaign(campaign: Campaign): void {
  if (typeof window === "undefined") return;
  const list = loadUserCampaigns();
  list.unshift(campaign);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function findUserCampaign(id: string): Campaign | undefined {
  return loadUserCampaigns().find((c) => c.id === id);
}

export function updateCampaign(id: string, patch: Partial<Campaign>): void {
  if (typeof window === "undefined") return;
  const list = loadUserCampaigns();
  const idx = list.findIndex((c) => c.id === id);
  if (idx === -1) return;
  list[idx] = { ...list[idx], ...patch };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
