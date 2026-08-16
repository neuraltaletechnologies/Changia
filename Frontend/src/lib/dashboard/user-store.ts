'use client';

import type { User } from "@/lib/dashboard/types";

const STORAGE_KEY = "changia_user_user";

export function loadUsers(): User[] {
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

export function saveUser(member: User): void {
  if (typeof window === "undefined") return;
  const list = loadUsers();
  list.unshift(member);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
