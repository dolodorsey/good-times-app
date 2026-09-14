import React from 'react'
// Inline vectors keep navigation legible when an OS/font does not contain a glyph.
const PATHS = {
  home: 'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',
  search: 'M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15m5.5-2 5 5',
  plus: 'M12 4v16M4 12h16',
  saved: 'M6 3h12v18l-6-4-6 4V3Z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8m-8 9v-2a8 6 0 0 1 16 0v2',
  pin: 'M12 22s8-8 8-14A8 8 0 0 0 4 8c0 6 8 14 8 14Zm0-11a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
  diamond: 'm12 2 9 10-9 10L3 12 12 2Z',
  music: 'M9 18V5l12-3v13M9 8l12-3M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0m12-3a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  sparkle: 'm12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
  dining: 'M4 3v7m3-7v7m3-7v7M4 8h6M7 10v11M19 3c-4 4-4 9 0 9V3m0 9v9',
  star: 'm12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z',
  bed: 'M3 21V6m0 11h18v4m-18-9h18v5M7 8h5v4H7V8m5 0h7v4',
  more: 'M4 12h.01M12 12h.01M20 12h.01',
  menu: 'M4 6h16M4 12h16M4 18h16',
  edit: 'm3 17 12-12 4 4L7 21H3v-4Zm12-12 3-3 4 4-3 3',
  shield: 'm12 2 8 4v6c0 6-8 10-8 10S4 18 4 12V6l8-4Z',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20m0-16v6l4 2',
  check: 'm4 12 5 5L20 6',
}
const GLYPHS = { '⌂':'home','⌕':'search','＋':'plus','▣':'saved','◎':'user','⌖':'pin','♡':'heart','◇':'diamond','♫':'music','✦':'sparkle','♢':'bell','🍴':'dining','☆':'star','▱':'bed','••':'more','≡':'menu','✎':'edit','⌾':'shield','◷':'clock','✓':'check' }
export default function GoodTimesIcon({ glyph, name, size = 20 }) {
  const key = name || GLYPHS[glyph]
  if (!PATHS[key]) return <span aria-hidden="true">{glyph}</span>
  return <svg data-gt-icon={key} viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={key === 'more' ? 4 : 1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={{display:'inline-block',verticalAlign:'middle',flexShrink:0}}><path d={PATHS[key]}/></svg>
}
