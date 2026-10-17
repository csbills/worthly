/**
 * With passkeys set up, a session with no activity for this long asks for
 * Face ID / biometrics again. The open app pings every minute while visible,
 * so in practice this means "five minutes in the background".
 */
export const LOCK_AFTER_MS = 5 * 60 * 1000;

/** How often the visible app tells the server it is still in use. */
export const PING_EVERY_MS = 60 * 1000;
