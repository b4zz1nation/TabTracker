import { Creditor } from "@/hooks/use-creditors";

export interface CreditorGroup {
  id: number;
  name: string;
  balance: number;
  entries: Creditor[];
}

export function normalizeCreditorName(name: string) {
  return name.trim().toLowerCase();
}

export function groupCreditors(creditors: Creditor[]) {
  const groups = new Map<string, Creditor[]>();

  for (const creditor of creditors) {
    const key = normalizeCreditorName(creditor.name);
    if (!key) continue;

    const existing = groups.get(key);
    if (existing) {
      existing.push(creditor);
    } else {
      groups.set(key, [creditor]);
    }
  }

  return Array.from(groups.values())
    .map<CreditorGroup>((entries) => {
      const sortedEntries = [...entries].sort((left, right) => {
        const leftTime = new Date(left.created_at).getTime();
        const rightTime = new Date(right.created_at).getTime();
        return leftTime - rightTime || left.id - right.id;
      });
      const representative = sortedEntries[0];
      const balance = sortedEntries.reduce(
        (sum, creditor) => sum + (creditor.balance || 0),
        0,
      );

      return {
        id: representative.id,
        name: representative.name,
        balance,
        entries: sortedEntries,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}
