export const MAX_TASKS_PER_DAY = 3;

export function isSessionQuotaExceeded(taskCount: number) {
  return taskCount >= MAX_TASKS_PER_DAY;
}
