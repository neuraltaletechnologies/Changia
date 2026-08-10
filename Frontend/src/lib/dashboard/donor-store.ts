'use client';

import type { Donor } from "@/lib/dashboard/types";

const STORAGE_KEY = "changia_user_donors";

export function loadDonors(): Donor[] {
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

export function saveDonor(donor: Donor): void {
  if (typeof window === "undefined") return;
  const list = loadDonors();
  list.unshift(donor);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function findDonor(id: string): Donor | undefined {
  return loadDonors().find((d) => d.id === id);
}
