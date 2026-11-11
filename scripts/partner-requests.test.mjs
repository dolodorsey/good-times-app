import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { partnerPayload } from '../api/partners.js'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('partner request needs a real type, names and a way to reach them', () => {
  assert.throws(() => partnerPayload({ partner_type: 'service_provider', business_name: 'X', contact_name: 'Y', email: 'a@b.co' }))
  assert.throws(() => partnerPayload({ partner_type: 'venue', business_name: '', contact_name: 'Y', email: 'a@b.co' }))
  assert.throws(() => partnerPayload({ partner_type: 'venue', business_name: 'X', contact_name: 'Y' }))
  assert.throws(() => partnerPayload({ partner_type: 'venue', business_name: 'X', contact_name: 'Y', email: 'not-an-email' }))
  const ok = partnerPayload({ partner_type: 'promoter', business_name: ' Flirt Fridays ', contact_name: 'Dee', phone: '(404) 555-0100', instagram: '@flirt', website: 'flirt.example', interests: ['events', 'hack'] })
  assert.equal(ok.business_name, 'Flirt Fridays')
  assert.equal(ok.instagram, 'flirt')
  assert.equal(ok.website, 'https://flirt.example')
  assert.deepEqual(ok.interests, ['events'])
})

test('Add Space left the main screens and lives under Profile as a partner form', () => {
  const ent = read('src/features/experience/complete/EntertainmentHub.jsx')
  const kit = read('src/features/experience/complete/Kit.jsx')
  const profile = read('src/features/experience/complete/ProfileHub.jsx')
  assert.ok(!/<AddSpace\b/.test(ent))
  assert.match(kit, /addSpace=false/)
  assert.match(profile, /Partner with GOOD TIMES/)
  assert.ok(!/service provider/i.test(read('src/features/experience/complete/ListWithUs.jsx')))
})
