export type FeatureCostSku = {
  amount?: number;
  run_task_url?: string;
};

export const CLOTH_V4_TASK_PATH = "/s2s/v2.0/task/cloth-v4";

export function getBalance(results: Array<{ amount_dec?: number; amount?: number }>) {
  return results.reduce(
    (total, item) => total + Number(item.amount_dec ?? item.amount ?? 0),
    0
  );
}

export function findClothV4Cost(skus: FeatureCostSku[]) {
  const matching = skus
    .filter((sku) => {
      try {
        return new URL(sku.run_task_url || "").pathname === CLOTH_V4_TASK_PATH;
      } catch {
        return false;
      }
    })
    .map((sku) => Number(sku.amount))
    .filter((amount) => Number.isFinite(amount) && amount > 0);
  return matching.length ? Math.max(...matching) : null;
}

export function hasFreeBudget(balance: number, cost: number, reserve: number) {
  return (
    Number.isFinite(balance) &&
    Number.isFinite(cost) &&
    cost > 0 &&
    balance >= cost + Math.max(0, reserve)
  );
}
