// Shared maintenance mode cache — isolated to avoid circular imports between app.ts and admin.ts

export let maintenanceCache = { value: false, ts: 0 };

export function invalidateMaintenanceCache() {
  maintenanceCache.ts = 0;
}
