import test from 'node:test'
import assert from 'node:assert/strict'
import {diverseHomeItems,homePlaceSelection} from '../src/features/experience/complete/home-feed.js'
test('Home preserves typed IDs, removes duplicates and varies category and neighborhood',()=>{
 const rows=[{id:'same',category_key:'food',neighborhood:'Midtown'},{id:'two',category_key:'food',neighborhood:'Midtown'},{event_key:'same',category_key:'music',venue_name:'Downtown'},{id:'same',category_key:'food'}]
 const result=diverseHomeItems(rows,4)
 assert.equal(result.length,3);assert.equal(result[0].id,'same');assert.equal(result[1].event_key,'same');assert.equal(result[2].id,'two')
})
test('Home excludes closed, wrong-city, event and lodging records from Place rails',()=>{
 const good={id:'1',city_key:'atlanta',status:'active',category_key:'dining_culinary'}
 assert.deepEqual(homePlaceSelection([good,{...good,id:'2',status:'closed'},{...good,id:'3',city_key:'miami'},{...good,id:'4',event_key:'show:4'},{...good,id:'5',category_key:'hotels'}]),[good])
})
