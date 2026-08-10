'use client';

import type { Donation } from "@/lib/dashboard/types";

const STORAGE_KEY = "changia_transactions";

export function loadTransactions(): Donation[] {
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

export function saveTransaction(transaction: Donation): void {
  if (typeof window === "undefined") return;
  const list = loadTransactions();
  list.unshift(transaction);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function findCampaignTransactions(campaignId: string): Donation[] {
  return loadTransactions().filter((t) => t.campaignId === campaignId);
}
