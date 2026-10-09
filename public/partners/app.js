// GOOD TIMES PARTNER PORTAL — independently routed. No consumer shell imports.
// Uses only public Supabase publishable key and end-user JWT; NEVER a privileged service key.
const BASE='https://dzlmtvodpyhetvektfuo.supabase.co'
const KEY='sb_publishable_ekvoOK6QQ05dUZuWgzQfUw_2RgbWPFR'
const SESSION_KEY='gt_partner_session_v1'
const $=id=>document.getElementById(id)
const clean=s=>String(s??'')
const escaped=s=>clean(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const safeName=s=>clean(s).replace(/[\r\n]/g,' ').trim()
const statusNames={pending_review:'Pending review',more_info:'More information needed',verified:'Verified',rejected:'Not approved',disputed:'Claim under dispute'}
const state={session:null,claims:[],media:[],interests:[],selectedVenue:null,venues:[],busy:false,searchSeq:0}
const marketing=[
 ['app_advertising','In-App Advertising','Bring your venue into the places and moments GOOD TIMES members explore.'],
 ['email_marketing','Email Promotions','Be considered for an upcoming GOOD TIMES editorial partner email.'],
 ['social_spotlight','Social Spotlights','Bring your atmosphere, menu or signature nights into the social conversation.'],
 ['influencer_posts','Creator Content','Explore brand-aligned creators and agreed sponsored deliverables.'],
 ['influencer_visits','Influencer Visits','Invite the right creator to experience and authentically document your venue.'],
 ['physical_marketing','Physical Activations','Explore QR programs, on-site placements and owned venue promotion.'],
 ['event_boost','Event Boosts','Help verified upcoming events gain sponsored discovery.'],
 ['content_production','Creative Production','Venue photography, reels and branded promotional assets.'],
 ['custom_bundle','Custom Venue Package','Coordinate multiple verified channels around your specific growth goal.'],
]
const getSession=()=>{try{return JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null')}catch{return null}}
const saveSession=s=>{state.session=s; s?sessionStorage.setItem(SESSION_KEY,JSON.stringify(s)):sessionStorage.removeItem(SESSION_KEY)}
const apiHeaders=(jwt,extra={})=>({apikey:KEY,Authorization:'Bearer '+(jwt||KEY),Accept:'application/json',...extra})
const toast=(msg,error=false)=>{const el=$('toast');el.textContent=msg;el.classList.toggle('error',error);el.hidden=false;setTimeout(()=>{el.hidden=true},6500)}
async function req(path,{method='GET',body,auth=true,headers={},raw=false}={}){
 const response=await fetch(BASE+path,{method,headers:apiHeaders(auth?state.session?.access_token:null,headers),body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'})
 const rawText=await response.text()
 let data;try{data=rawText?JSON.parse(rawText):null}catch{data={message:'Unexpected server response'}}
 if(!response.ok)throw new Error(data?.error_description||data?.msg||data?.message||data?.error||'Request failed')
 return raw?response:data
}
async function authenticated(){
 if(!state.session?.access_token)return false
 try{const user=await req('/auth/v1/user');if(!user?.id)throw Error('No user');state.session.user=user;saveSession(state.session);return true}catch{saveSession(null);return false}
}
async function refreshSession(){
 if(!state.session?.refresh_token)return false
 try{
 const r=await req('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:state.session.refresh_token},auth:false,headers:{'Content-Type':'application/json'}})
 if(!r.access_token)throw Error('Missing session')
 saveSession({...r,user:state.session.user});return true
 }catch{saveSession(null);return false}
}
function readHashAuth(){
 const p=new URLSearchParams(location.hash.slice(1))
 if(p.get('error')){toast(p.get('error_description')||'Authentication link could not be confirmed.',true);history.replaceState({},'',location.pathname+location.search);return}
 if(p.get('access_token')){
  saveSession({access_token:p.get('access_token'),refresh_token:p.get('refresh_token'),expires_at:Math.round(Date.now()/1000)+Number(p.get('expires_in')||3600)})
  history.replaceState({},'',location.pathname+location.search)
 }
}
async function sendEmail(){
 const email=$('partner-email').value.trim().toLowerCase()
 if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){toast('Enter a valid business email.',true);return}
 try{
  setBusy('email-link',true)
  const redirect=location.origin+'/partners/'
  await req('/auth/v1/otp',{method:'POST',auth:false,body:{email,create_user:true},headers:{'Content-Type':'application/json','x-supabase-auth-redirect-to':redirect}})
  sessionStorage.setItem('gt_partner_email',email)
  toast('Sign-in email requested. Check your inbox, and return to this page after verifying.')
 }catch(err){toast('Unable to send sign-in request: '+err.message,true)}finally{setBusy('email-link',false)}
}
async function verifyCode(){
 const email=($('partner-email').value||sessionStorage.getItem('gt_partner_email')||'').trim().toLowerCase()
 const token=$('partner-otp').value.trim()
 if(!email||!token){toast('Enter your email and the code from the message.',true);return}
 try{
 setBusy('verify-code',true)
 const r=await req('/auth/v1/verify',{method:'POST',auth:false,body:{email,token,type:'email'},headers:{'Content-Type':'application/json'}})
 if(!r.access_token)throw Error('No access token was returned')
 saveSession(r);await initSession();toast('Email successfully verified.')
 }catch(e){toast(e.message,true)}finally{setBusy('verify-code',false)}
}
function setBusy(id,on){const el=$(id);if(!el)return;el.disabled=on;el.dataset.label ||=el.textContent;el.textContent=on?'Working…':el.dataset.label}
function showAuth(){
 const signed=Boolean(state.session?.user?.id)
 $('signed-out-auth').hidden=signed;$('signed-in-auth').hidden=!signed;$('signout').hidden=!signed
 $('account-pill').textContent=signed?safeName(state.session.user.email):'Official venue access'
 $('verified-email').textContent=signed?safeName(state.session.user.email):''
}
async function initSession(){
 if(!await authenticated() && state.session?.refresh_token){await refreshSession();await authenticated()}
 showAuth()
 if(state.session?.user?.id){await loadPartnerData()}else{state.claims=[];state.media=[];state.interests=[];renderAll()}
}
async function loadPartnerData(){
 try{
  const [claims,media,interests]=await Promise.all([
   req('/rest/v1/gt_portal_claims?select=id,venue_id,requested_name,contact_name,contact_email,contact_phone,relationship,profile_draft,status,submitted_at,review_reason&order=submitted_at.desc&limit=40'),
   req('/rest/v1/gt_portal_media?select=id,claim_id,asset_type,file_name,review_status,created_at,reviewer_note&order=created_at.desc&limit=100'),
   req('/rest/v1/gt_portal_interests?select=id,claim_id,category,objective,budget_band,status,submitted_at&order=submitted_at.desc&limit=70')
  ])
  state.claims=Array.isArray(claims)?claims:[]
  state.media=Array.isArray(media)?media:[]
  state.interests=Array.isArray(interests)?interests:[]
  renderAll()
 }catch(e){toast('Unable to load your workspace: '+e.message,true)}
}
function renderAll(){
 $('metric-profile').textContent=state.claims.find(x=>x.status==='verified')?'Verified partner':state.claims.length?'Under review':'Not claimed'
 $('metric-assets').textContent=state.media.length+' files'
 $('metric-requests').textContent=state.interests.length+' inquiries'
 $('status-text').textContent=!state.session?.user?.id?'Connect your business to begin.':state.claims.some(x=>x.status==='verified')?'You have a verified partner claim.':state.claims.length?'Your venue application is in the review workflow.':'Email verified. Choose a venue and request official access.'
 $('status-label').textContent=!state.session?.user?.id?'NOT CONNECTED':state.claims.some(x=>x.status==='verified')?'VERIFIED':state.claims.length?'CLAIM SUBMITTED':'ACCOUNT VERIFIED'
 const claimOpts=state.claims.map(x=>'<option value="'+escaped(x.id)+'">'+escaped(x.requested_name||('Venue claim '+x.id.slice(0,8)))+' · '+escaped(statusNames[x.status]||x.status)+'</option>').join('')
 for(const id of ['asset-claim','interest-claim']){$(id).innerHTML=claimOpts||'<option value="">Claim a venue first</option>';$(id).disabled=!state.claims.length}
 $('claim-list').innerHTML=state.claims.length?'<h3 class="list-heading">YOUR VENUE CLAIMS</h3>'+state.claims.map(x=>record(x.requested_name||'Existing Atlanta venue',statusNames[x.status]||x.status,new Date(x.submitted_at).toLocaleDateString(),x.review_reason)).join(''):''
 $('media-list').innerHTML=state.media.length?state.media.map(x=>record(x.asset_type.toUpperCase()+' · '+x.file_name,x.review_status,new Date(x.created_at).toLocaleDateString(),x.reviewer_note)).join(''):'<p class="empty-note">Your submitted media will appear here.</p>'
 const combined=[...state.claims.map(x=>({time:x.submitted_at,title:'Venue claim: '+(x.requested_name||'Atlanta venue'),status:statusNames[x.status]||x.status,details:x.review_reason})),...state.interests.map(x=>({time:x.submitted_at,title:marketing.find(y=>y[0]===x.category)?.[1]||x.category,status:x.status,details:x.objective}))]
 combined.sort((a,b)=>new Date(b.time)-new Date(a.time))
 $('request-list').innerHTML=combined.length?combined.map(x=>record(x.title,x.status,new Date(x.time).toLocaleDateString(),x.details)).join(''):'<p class="empty-note">Your first activity will appear here.</p>'
}
function record(title,status,date,detail=''){return '<div class="record-item"><div><strong>'+escaped(title)+'</strong><small>'+escaped(date)+(detail?' · '+escaped(detail):'')+'</small></div><b>'+escaped(status)+'</b></div>'}
function renderSearch(items=[]){
 const list=$('venue-results')
 if(!items.length){list.innerHTML='<p class="form-hint">No eligible published Atlanta venue matches yet. If yours is missing, choose “My venue isn’t listed yet.”</p>';return}
 list.innerHTML=items.map(v=>'<button type="button" class="venue-result" role="option" data-venue-id="'+escaped(v.id)+'"><span><strong>'+escaped(v.name)+'</strong><br/><small>'+escaped([v.neighborhood,v.address].filter(Boolean).join(' · '))+'</small></span><span>Choose ↗</span></button>').join('')
}
async function searchVenues(){
 const q=$('venue-search').value.trim()
 state.selectedVenue=null;$('selected-venue').hidden=true
 if(q.length<2){$('venue-results').innerHTML='<p class="form-hint">Enter at least two letters to find an eligible venue.</p>';return}
 const seq=++state.searchSeq
 const p=new URLSearchParams({select:'id,name,address,neighborhood,category_key,city_key',city_key:'eq.atlanta',status:'eq.active',is_verified:'eq.true',name:'ilike.*'+q.replace(/[*%,().]/g,'')+'*',order:'name.asc',limit:'12'})
 try{
  const rows=await req('/rest/v1/gt_venues?'+p.toString(),{auth:false})
  if(seq!==state.searchSeq)return
  state.venues=rows||[];renderSearch(state.venues)
 }catch(e){$('venue-results').textContent='Directory is temporarily unavailable. Please retry.'}
}
function selectVenue(id){
 const v=state.venues.find(x=>x.id===id);if(!v)return
 state.selectedVenue=v;$('selected-venue').hidden=false
 $('selected-venue').innerHTML='<strong>✓ '+escaped(v.name)+'</strong><br/><small>'+escaped(v.address||'Atlanta venue')+'</small>'
 $('venue-search').value=v.name;$('venue-results').innerHTML=''
 $('unlisted').checked=false;$('manual-venue-wrap').hidden=true
}
function view(name){
 for(const el of document.querySelectorAll('.panel-view'))el.classList.toggle('active',el.id==='view-'+name)
 for(const el of document.querySelectorAll('.nav-link'))el.classList.toggle('active',el.dataset.view===name)
 window.scrollTo({top:0,behavior:'smooth'})
 if(name==='claim')$('main').focus({preventScroll:true})
}
async function submitClaim(e){
 e.preventDefault()
 if(!state.session?.user?.id){toast('Verify your business email first.',true);view('claim');return}
 const unlisted=$('unlisted').checked
 const venue=unlisted?null:state.selectedVenue
 const requested=unlisted?$('manual-venue').value.trim():venue?.name
 if(!requested||(!unlisted&&!venue)){toast('Select an exact venue from search, or mark it as not listed.',true);return}
 if(!$('claim-terms').checked){toast('Please confirm you have authority to submit a request.',true);return}
 const name=$('contact-name').value.trim()
 if(name.length<2){toast('Add your full name.',true);return}
 const description=$('contact-description').value.trim()
 const website=$('contact-website').value.trim()
 if(website && !/^https:\/\/[^ ]+\.[^ ]+/.test(website)){toast('Use an https:// website address.',true);return}
 if(venue && state.claims.some(c=>c.venue_id===venue.id)){toast('You already have a claim request for this venue.',true);return}
 const payload={venue_id:venue?.id||null,requested_name:requested,auth_user_id:state.session.user.id,contact_name:name,contact_email:state.session.user.email,contact_phone:$('contact-phone').value.trim()||null,relationship:$('relationship').value,profile_draft:{description,website,venue_display_name:requested},status:'pending_review',terms_accepted:true}
 try{
  setBusy('submit-claim',true)
  await req('/rest/v1/gt_portal_claims',{method:'POST',body:payload,headers:{'Content-Type':'application/json',Prefer:'return=minimal'}})
  toast('Your claim was submitted for GOOD TIMES partner verification. No public listing has changed.')
  await loadPartnerData()
 }catch(err){toast('Claim not submitted: '+err.message,true)}finally{setBusy('submit-claim',false)}
}
async function uploadAsset(){
 const claim=state.claims.find(x=>x.id===$('asset-claim').value)
 if(!claim){toast('Claim a venue before submitting assets.',true);return}
 const file=$('asset-file').files?.[0],allowed=['image/jpeg','image/png','image/webp','application/pdf']
 if(!file||!allowed.includes(file.type)||file.size>10485760||file.size<1){toast('Select a JPG, PNG, WEBP or PDF file of 10MB or less.',true);return}
 if(!$('asset-rights').checked){toast('Confirm you have rights to submit this asset.',true);return}
 const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','application/pdf':'pdf'}[file.type]
 const path=state.session.user.id+'/'+claim.id+'/'+crypto.randomUUID()+'.'+ext
 try{
  setBusy('upload-asset',true)
  const res=await fetch(BASE+'/storage/v1/object/gt-partner-pending/'+path,{method:'POST',headers:apiHeaders(state.session.access_token,{'Content-Type':file.type,'x-upsert':'false'}),body:file})
  if(!res.ok){const msg=await res.json().catch(()=>({}));throw Error(msg.message||msg.error||'Asset upload failed')}
  await req('/rest/v1/gt_portal_media',{method:'POST',body:{claim_id:claim.id,auth_user_id:state.session.user.id,storage_bucket:'gt-partner-pending',storage_path:path,asset_type:$('asset-type').value,file_name:file.name.slice(0,200),mime_type:file.type,size_bytes:file.size,rights_confirmed:true},headers:{'Content-Type':'application/json',Prefer:'return=minimal'}})
  $('asset-file').value='';$('asset-rights').checked=false;toast('Uploaded privately for review. The file is not publicly published.');await loadPartnerData()
 }catch(e){toast('Asset could not be registered: '+e.message,true)}finally{setBusy('upload-asset',false)}
}
async function submitInterest(e){
 e.preventDefault()
 const claim=state.claims.find(x=>x.id===$('interest-claim').value)
 if(!claim){toast('Start a venue claim before requesting a marketing proposal.',true);view('claim');return}
 const category=$('interest-category').value
 const objective=$('interest-objective').value.trim()
 try{
 const el=e.target.querySelector('button[type=submit]');el.disabled=true
 await req('/rest/v1/gt_portal_interests',{method:'POST',body:{claim_id:claim.id,auth_user_id:state.session.user.id,category,objective,budget_band:$('interest-budget').value,status:'new'},headers:{'Content-Type':'application/json',Prefer:'return=minimal'}})
 toast('Your GOOD TIMES growth inquiry is saved. This is not a booking or payment.')
 $('interest-objective').value='';await loadPartnerData();view('requests')
 }catch(err){toast('Inquiry not saved: '+err.message,true)}finally{e.target.querySelector('button[type=submit]').disabled=false}
}
function renderMarketing(){
 $('growth-cards').innerHTML=marketing.map(([key,title,desc],i)=>'<article class="growth-card"><span class="service-num">'+String(i+1).padStart(2,'0')+' / OPPORTUNITY</span><h3>'+escaped(title)+'</h3><p>'+escaped(desc)+'</p><button type="button" data-service="'+escaped(key)+'">Request details ↗</button></article>').join('')
}
function bind(){
 document.addEventListener('click',e=>{
  const btn=e.target.closest('[data-view]');if(btn){e.preventDefault();view(btn.dataset.view)}
  const venue=e.target.closest('[data-venue-id]');if(venue)selectVenue(venue.dataset.venueId)
  const serv=e.target.closest('[data-service]');if(serv){$('interest-category').value=serv.dataset.service;$('interest-form').scrollIntoView({behavior:'smooth',block:'start'})}
 })
 let searchTimer;$('venue-search').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(searchVenues,350)})
 $('unlisted').addEventListener('change',e=>{const checked=e.target.checked;$('manual-venue-wrap').hidden=!checked;if(checked){state.selectedVenue=null;$('selected-venue').hidden=true;$('venue-results').innerHTML=''}})
 $('email-link').addEventListener('click',sendEmail)
 $('verify-code').addEventListener('click',verifyCode)
 $('claim-form').addEventListener('submit',submitClaim)
 $('upload-asset').addEventListener('click',uploadAsset)
 $('interest-form').addEventListener('submit',submitInterest)
 $('signout').addEventListener('click',()=>{saveSession(null);initSession();toast('Signed out of the partner workspace.')})
}
async function main(){
 readHashAuth();state.session=getSession()
 renderMarketing();bind();await initSession()
 const qp=new URLSearchParams(location.search)
 const venueID=qp.get('venue')
 if(venueID && /^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(venueID)){
  view('claim')
  try{const arr=await req('/rest/v1/gt_venues?select=id,name,address,neighborhood,city_key,status,is_verified&id=eq.'+encodeURIComponent(venueID)+'&city_key=eq.atlanta&status=eq.active&limit=1',{auth:false});if(arr?.[0]){state.venues=arr;selectVenue(arr[0].id)}}catch{}
 }
}
main().catch(e=>toast('Partner workspace could not load: '+e.message,true))
