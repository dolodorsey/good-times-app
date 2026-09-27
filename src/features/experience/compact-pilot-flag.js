/** Compile-time preview gate. No URL, storage, or customer setting enables this. */
export const COMPACT_PILOT = typeof __GT_COMPACT_PILOT__ !== 'undefined' && __GT_COMPACT_PILOT__ === true

export const COMPLETE_UPGRADE = typeof __GT_COMPLETE_UPGRADE__ !== 'undefined' && __GT_COMPLETE_UPGRADE__ === true
