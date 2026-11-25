/** Geometry assertions deliberately include navigation and the raised Plan control. */
import assert from 'node:assert/strict'
export async function measureCompactGeometry(page) {
 return page.evaluate(() => {
  const rect = selector => document.querySelector(selector)?.getBoundingClientRect()
  const main = rect('.gt5-main'), nav = rect('.gt5-nav'), top = rect('.gt5-topbar'), plan = rect('.gt5-nav .plan span')
  const safeTop = Math.max(0, main?.top || 0, top?.bottom || 0)
  const safeBottom = Math.min(innerHeight, main?.bottom || innerHeight, nav?.top || innerHeight, plan?.top || innerHeight)
  const cards = [...document.querySelectorAll('.gt2-venue-grid article')]
  const cardRects = cards.slice(0, 8).map(el => {const r=el.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,bottom:r.bottom}})
  const visible = cards.filter(el => {const r=el.getBoundingClientRect();return r.top>=safeTop-1 && r.bottom<=safeBottom+1 && r.left>=-1 && r.right<=innerWidth+1}).length
  const container = rect('.gt-compact-explore')
  return {visible,columns:new Set(cardRects.slice(0,4).map(r=>Math.round(r.x))).size,width:innerWidth,containerWidth:container?.width||null,safeTop,safeBottom,overflow:document.documentElement.scrollWidth-innerWidth,cardRects}
 })
}
export function assertCompactGeometry(result) {
 assert.ok(result.overflow<=1, 'Horizontal page overflow')
 assert.ok(result.cardRects.every(r=>r.w>=140), 'Unreadable cards: width below 140 CSS pixels')
 if(result.width>=360 && result.width<=430) assert.equal(result.columns,2,'Normal-phone browse requires two columns')
 if(result.width===390) assert.ok(result.visible>=4,`Only ${result.visible} complete entries clear the header, navigation, and Plan control`)
 if(result.containerWidth<650 && result.width>340) assert.equal(result.columns,2,'Use the available container width, not the desktop viewport')
}
