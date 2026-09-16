/**
 * What the app is open for.
 *
 * Launch is North Macedonia, in euro. None of the machinery for the other
 * markets has been removed: which countries are open is decided by the API
 * (`countries.active`), and local-currency display is the one thing the app
 * decides for itself, because exchange rates keep being collected either way.
 */

/**
 * Prices are shown in euro alone. Turn this on when a market that does not use
 * the euro opens, and the local equivalent appears under every price again —
 * the rates, the endpoint and the formatting are all still here.
 */
export const SHOW_LOCAL_CURRENCY = false;
