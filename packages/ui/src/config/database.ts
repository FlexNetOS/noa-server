/**
 * Frontend database configuration stub
 *
 * The actual database logic is in @noa/ui-server package.
 * This file exists only to prevent import errors in frontend code.
 */

export const db = null;
export function initializeDatabase() {
  console.warn('Database initialization should be done in backend (@noa/ui-server)');
}
export function cleanupExpiredUploads() {
  console.warn('Database cleanup should be done in backend (@noa/ui-server)');
}
export function closeDatabase() {
  console.warn('Database operations should be done in backend (@noa/ui-server)');
}
