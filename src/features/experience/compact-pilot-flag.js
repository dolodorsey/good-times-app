/** Compile-time preview gate. No URL, storage, or customer setting enables this. */
export const COMPACT_PILOT = typeof __GT_COMPACT_PILOT__ !== 'undefined' && __GT_COMPACT_PILOT__ === true
