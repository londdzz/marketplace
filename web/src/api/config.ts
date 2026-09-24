/**
 * Where the API is.
 *
 * Baked in at build time like the app's, so a deployed site cannot be pointed
 * anywhere else. There is deliberately no runtime override here: the app has
 * one for testing against a PC, and a website has no equivalent need.
 */
export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'https://api.autevo.mk/api/v1';
