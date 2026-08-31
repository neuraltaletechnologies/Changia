"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/dashboard/utils";

export type SortDir = "asc" | "desc";

export type SortState<K extends string> = { key: K; dir: SortDir } | null;

/** Accessor map — one function per sortable column key, returning the value to sort on. */
export type SortAccessors<T, K extends string> = Record<K, (row: T) => unknown>;

function baseCompare(a: unknown, b: unknown): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);
  return String(a).localeCompare(String(b), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

/**
 * Client-side column sorting for a table. Clicking a header toggles that column
 * between ascending and descending (2-state); a different column starts at
 * ascending. Empty / nullish values always sort last regardless of direction.
 */
export function useTableSort<T, K extends string>(
  rows: T[],
  accessors: SortAccessors<T, K>,
  initial: SortState<NoInfer<K>> = null,
) {
  const [sort, setSort] = React.useState<SortState<K>>(initial);

  const toggle = React.useCallback((key: K) => {
    setSort((prev) =>
      prev?.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  }, []);

  const sorted = React.useMemo(() => {
    if (!sort) return rows;
    const accessor = accessors[sort.key];
    if (!accessor) return rows;
    const factor = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      const aEmpty = av == null || av === "";
      const bEmpty = bv == null || bv === "";
      if (aEmpty && bEmpty) return 0;
      if (aEmpty) return 1;
      if (bEmpty) return -1;
      return baseCompare(av, bv) * factor;
    });
    // accessors is expected to be a stable reference (module const or memoised)
  }, [rows, sort, accessors]);

  return { sorted, sort, toggle };
}

/**
 * A `<th>` whose label is a button that drives {@link useTableSort}. Keeps the
 * caller's own `<th>` styling — pass the same className the plain header used.
 */
export function SortableTh<K extends string>({
  sortKey,
  sort,
  onSort,
  className,
  align = "left",
  children,
}: {
  sortKey: K;
  sort: SortState<K>;
  onSort: (key: K) => void;
  className?: string;
  align?: "left" | "right";
  children: React.ReactNode;
}) {
  const active = sort?.key === sortKey;
  return (
    <th className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : "none"}
        className={cn(
          "inline-flex items-center gap-1 select-none transition-colors hover:text-foreground",
          align === "right" && "flex-row-reverse",
          active && "text-foreground",
        )}
      >
        <span>{children}</span>
        <span className="shrink-0" aria-hidden>
          {active ? (
            sort!.dir === "asc" ? (
              <ArrowUp className="w-3 h-3" />
            ) : (
              <ArrowDown className="w-3 h-3" />
            )
          ) : (
            <ChevronsUpDown className="w-3 h-3 opacity-40" />
          )}
        </span>
      </button>
    </th>
  );
}
