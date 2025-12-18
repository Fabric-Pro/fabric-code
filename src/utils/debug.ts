// src/utils/debug.ts
// Simple debug logging utility - only logs when FABRIC_DEBUG env var is set

/**
 * Check if debug mode is enabled via FABRIC_DEBUG env var
 * Set FABRIC_DEBUG=1 or FABRIC_DEBUG=true to enable debug logging
 */
export function isDebugEnabled(): boolean {
  const debug = process.env.FABRIC_DEBUG;
  return debug === "1" || debug === "true";
}

/**
 * Log a debug message (only if FABRIC_DEBUG is enabled)
 * @param prefix - A prefix/tag for the log message (e.g., "check-approval")
 * @param message - The message to log
 * @param args - Additional arguments to log
 */
export function debugLog(
  prefix: string,
  message: string,
  ...args: unknown[]
): void {
  if (isDebugEnabled()) {
    console.log(`[${prefix}] ${message}`, ...args);
  }
}

/**
 * Log a debug warning (only if FABRIC_DEBUG is enabled)
 * @param prefix - A prefix/tag for the log message
 * @param message - The message to log
 * @param args - Additional arguments to log
 */
export function debugWarn(
  prefix: string,
  message: string,
  ...args: unknown[]
): void {
  if (isDebugEnabled()) {
    console.warn(`[${prefix}] ${message}`, ...args);
  }
}
