'use client';

import type { TeamMember } from "@/lib/dashboard/types";

const STORAGE_KEY = "changia_user_team";

export function loadTeamMembers(): TeamMember[] {
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

export function saveTeamMember(member: TeamMember): void {
  if (typeof window === "undefined") return;
  const list = loadTeamMembers();
  list.unshift(member);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
