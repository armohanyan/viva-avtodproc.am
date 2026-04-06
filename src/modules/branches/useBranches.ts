import { useCallback, useEffect, useState } from "react";
import { DEFAULT_BRANCHES } from "./branches.defaults";
import { loadBranches, saveBranches } from "./branches.storage";
import type { Branch } from "./branch.types";

function newId() {
  return `br-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function useBranches() {
  const [branches, setBranches] = useState<Branch[]>(() =>
    typeof window !== "undefined" ? loadBranches() : DEFAULT_BRANCHES
  );

  useEffect(() => {
    setBranches(loadBranches());
  }, []);

  useEffect(() => {
    const handler = () => setBranches(loadBranches());
    window.addEventListener("storage", handler);
    window.addEventListener("viva-branches-updated", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("viva-branches-updated", handler);
    };
  }, []);

  const persist = useCallback((updater: (prev: Branch[]) => Branch[]) => {
    setBranches((prev) => {
      const next = updater(prev);
      saveBranches(next);
      return next;
    });
  }, []);

  const addBranch = useCallback(
    (b: Omit<Branch, "id">) => {
      persist((prev) => [...prev, { ...b, id: newId() }]);
    },
    [persist]
  );

  const updateBranch = useCallback(
    (id: string, patch: Partial<Omit<Branch, "id">>) => {
      persist((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    },
    [persist]
  );

  const removeBranch = useCallback(
    (id: string) => {
      persist((prev) => prev.filter((x) => x.id !== id));
    },
    [persist]
  );

  const setBranchesReplace = useCallback((next: Branch[]) => {
    saveBranches(next);
    setBranches(next);
  }, []);

  return { branches, addBranch, updateBranch, removeBranch, setBranches: setBranchesReplace };
}

export function branchNameById(branches: readonly Branch[], id: string): string {
  return branches.find((b) => b.id === id)?.name ?? id;
}
