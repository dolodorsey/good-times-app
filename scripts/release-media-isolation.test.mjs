import {UX_NAV,HOME_MODES} from '../src/features/experience/good-times-ux-model.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {screenEditorialMedia,categoryEditorialMedia} from '../src/features/experience/good-times-editorial-media.js'
const zoo={city_key:'atlanta',category_key:'entertainment',hero_image:'https://zooatlanta.org/main-gate.jpg'}
const dinner={city_key:'atlanta',category_key:'restaurant',hero_image:'https://restaurant.example/dinner.jpg'}
const club={city_key:'atlanta',category_key:'nightclub',hero_image:'https://club.example/club.jpg'}
// September 24 restoration uses the owner's supplied editorial reference, not a venue image.
test('home uses owner-reference editorial art instead of top venue',()=>assert.equal(screenEditorialMedia('atlanta','home'),'/reference-base/atlanta-rooftop.webp'))
test('owner-reference artwork bytes remain unchanged',()=>{const art=readFileSync(new URL('../public/reference-base/atlanta-rooftop.webp',import.meta.url));assert.equal(createHash('sha256').update(art).digest('hex'),'bf0e1f69441e899c6cb4d75949f693831e6b74ef75b286577c83957333dfaeb7')})
test('other cities cannot inherit Atlanta art',()=>assert.ok(!screenEditorialMedia('miami','home').includes('atlanta')))
test('screen mapping is independent of event order',()=>assert.notEqual(screenEditorialMedia('atlanta','home'),screenEditorialMedia('atlanta','plan')))
test('dining cannot use a zoo image',()=>assert.ok(!categoryEditorialMedia('dining',[zoo],'atlanta').includes('zoo')))
test('dining selects restaurant by category, not position',()=>assert.equal(categoryEditorialMedia('dining',[zoo,club,dinner],'atlanta'),dinner.hero_image))
test('nightlife selects nightclub',()=>assert.equal(categoryEditorialMedia('nightlife',[zoo,dinner,club],'atlanta'),club.hero_image))
test('city mismatch cannot pass media selection',()=>assert.notEqual(categoryEditorialMedia('dining',[{...dinner,city_key:'miami'}],'atlanta'),dinner.hero_image))
test('missing city identity fails closed to explicit category cover',()=>assert.notEqual(categoryEditorialMedia('dining',[{...dinner,city_key:null}],'atlanta'),dinner.hero_image))
test('no accurate dining photo retains approved dining category cover',()=>assert.ok(categoryEditorialMedia('dining',[],'atlanta').endsWith('/gt-cat-dining.webp')))
test('category covers do not alter original venue records',()=>{const row={...zoo};categoryEditorialMedia('dining',[row],'atlanta');assert.deepEqual(row,zoo)})
test('invalid image protocol is rejected',()=>assert.ok(!categoryEditorialMedia('dining',[{...dinner,hero_image:'javascript:alert(1)'}],'atlanta').includes('javascript')))
test('unknown category uses only brand frame',()=>assert.ok(categoryEditorialMedia('invalid',[zoo],'atlanta').endsWith('/motion/goodtimes.jpg')))
test('primary navigation retains all five labels and uses SVG icons',()=>{const src=readFileSync(new URL('../src/features/experience/GoodTimesCommandAppV4.jsx',import.meta.url),'utf8');assert.deepEqual(UX_NAV.map(row=>row[2]),['Home','Entertainment','Plan','Venues','Profile']);assert.match(src,/const NAV=UX_NAV/);assert.ok(src.includes('<GoodTimesIcon glyph={icon}/>'));assert.ok(!src.includes('homeVenues[i]?.hero_image'))})
test('iOS keeps reviewed export answer for future builds',()=>{const src=readFileSync(new URL('../ios/App/App/Info.plist',import.meta.url),'utf8');assert.match(src,/<key>ITSAppUsesNonExemptEncryption<\/key>\s*<false\/>/);assert.ok(src.includes('NSLocationWhenInUseUsageDescription'));assert.ok(src.includes('NSUserNotificationUsageDescription'))})
