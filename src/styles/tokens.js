export const COLORS = {
  bg: '#06060C', bgCard: '#1A1A14', bgSheet: '#18180F',
  gold: '#D4A853', goldDim: 'rgba(212,168,83,0.35)',
  text: '#FFFFFF', textSec: '#E8DCC8', muted: '#D4C49A',
  a3: '#D4A853', a4: '#FFB86B', overlay: 'rgba(6,6,12,0.88)',
}
export const FONTS = { f: "'DM Sans',sans-serif", s: "'Playfair Display',Georgia,serif" }
export const btnStyle = (active) => ({
  background: active ? `linear-gradient(135deg,${COLORS.gold},#B8942F)` : 'rgba(212,168,83,0.08)',
  color: active ? '#0A0A0F' : '#fff', border: active ? 'none' : '1px solid rgba(212,168,83,0.25)',
  borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  fontFamily: FONTS.f, letterSpacing: 0.3, transition: 'all 0.25s ease',
})
export const cardStyle = {
  background: COLORS.bgCard, border: '1px solid rgba(255,255,255,0.4)',
  borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
}
