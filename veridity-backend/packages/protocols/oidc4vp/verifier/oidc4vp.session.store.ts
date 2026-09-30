import { Oidc4vpSession } from "./types";

const sessionStore = new Map<string, Oidc4vpSession>();

/**
 * Create session.
 * @param state Input used by createSession.
 * @param data Input used by createSession.
 * @returns The result of createSession.
 */
export function createSession(state: string, data: Oidc4vpSession) {
  sessionStore.set(state, data);
}

/**
 * Get session.
 * @param state Input used by getSession.
 * @returns The result of getSession.
 */
export function getSession(state: string) {
  return sessionStore.get(state);
}

/**
 * Delete session.
 * @param state Input used by deleteSession.
 * @returns The result of deleteSession.
 */
export function deleteSession(state: string) {
  sessionStore.delete(state);
}
