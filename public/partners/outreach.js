// GOOD TIMES venue outreach prep. Authenticated staff-only RPC; NO send commands.
const BASE='https://dzlmtvodpyhetvektfuo.supabase.co';
const KEY='sb_publishable_ekvoOK6QQ05dUZuWgzQfUw_2RgbWPFR';
const $=id=>document.getElementById(id);
const state={session:null,stage:'research',page:0,limit:35,items:[],selected:null,total:0};
const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toast=(msg,error=false)=>{const el=$('toast');el.textContent=msg;el.classList.toggle('error',error);el.hidden=false;setTimeout(()=>{el.hidden=true},6000)};
function authSession(){try{return JSON.parse(sessionStorage.getItem('gt_partner_session_v1')||'null')}catch{return null}}
async function rpc(name,args={}){
 const response=await fetch(BASE+'/rest/v1/rpc/'+name,{
  method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+state.session.access_token,Accept:'application/json','Content-Type':'application/json'},
  body:JSON.stringify(args),cache:'no-store'});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(data.message||data.error||'Request failed');
 return data;
}
async function user(){
 const response=await fetch(BASE+'/auth/v1/user',{headers:{apikey:KEY,Authorization:'Bearer '+state.session.access_token}});
 if(!response.ok)throw Error('Please sign in to your GOOD TIMES partner account first');
 return response.json();
}
async function init(){
 state.session=authSession();
 if(!state.session?.access_token){$('status').textContent='Sign in through the partner portal with your authorized staff account before using this desk.';return}
 try{
  const person=await user();const verified=await rpc('gt_portal_staff_profile');
  if(!verified.authorized)throw Error('This account does not hold explicit GOOD TIMES staff privileges');
  $('status').textContent='✓ VERIFIED STAFF · '+person.email+' · RESEARCH ONLY; NO EMAIL SENDS';
  $('workspace').hidden=false;
  bind();await load();
 }catch(e){$('status').textContent='Access blocked: '+e.message}
}
function renderSelect(r){
 state.selected=r;
 $('venue-name').textContent=r.venue_name;
 $('venue-status').textContent='Stage: '+r.target_status+' · Venue ID '+r.venue_id.slice(0,8);
 const cont=$('venue-identity');
 cont.replaceChildren();
 const meta=document.createElement('p');meta.textContent='Canonical Atlanta listing · '+r.venue_id;meta.className='reference';cont.appendChild(meta);
 if(r.public_website&&r.public_website.startsWith('https://')){
  const link=document.createElement('a');link.textContent='Official venue website ↗';link.target='_blank';link.rel='noopener noreferrer';link.href=r.public_website;cont.appendChild(link);
 }
 for(const field of ['public_phone','public_instagram'])if(r[field]){
  const e=document.createElement('p');e.textContent=field.replace('public_','').toUpperCase()+': '+r[field];cont.appendChild(e);
 }
 $('contact-name').value=r.contact_name||'';
 $('contact-title').value=r.contact_title||'';
 $('contact-email').value=r.contact_email||'';
 $('contact-proof').value=r.email_evidence_url||'';
 $('contact-note').value=r.contact_reviewer_note||'';
 $('subject').value='Make '+r.venue_name+' official on GOOD TIMES';
 $('email-copy').value=r.individualized_copy||template(r);
 $('copy-note').value=r.copy_reviewer_note||'';
 $('recipient-form').hidden=r.target_status!=='research'&&r.target_status!=='contact_qualified'&&r.target_status!=='copy_approved';
 $('email-form').hidden=r.target_status!=='contact_qualified'&&r.target_status!=='copy_approved';
 document.querySelectorAll('.outreach-item').forEach(b=>b.classList.toggle('active',b.dataset.venueId===r.venue_id));
}
function template(r){
 const nm=r.contact_name?.split(' ')[0];
 const intro=nm?'Hi '+nm+',':'Hello,';
 return intro+'\n\nI am reaching out on behalf of GOOD TIMES about '+r.venue_name+' in Atlanta.\n\nWe are inviting qualified local venues to claim their free official GOOD TIMES profile. The portal lets an authorized representative review existing listing details, request changes, upload approved photos and menus, and explore optional promotion opportunities such as in-app features, event boosts, email inclusion, social spotlights, and creator visits.\n\nWe would like to make sure the right member of your team receives the official claim invitation before any account is activated. There is no obligation to purchase marketing, and any paid opportunity requires a separate agreed scope and pricing.\n\nWould you be the right contact for '+r.venue_name+', or could you connect us with the authorized person who manages its marketing and business listings?\n\nThank you,\nGOOD TIMES Venue Partnerships\n';
}
function render(){
 $('list').innerHTML=state.items.length?state.items.map(r=>'<button type="button" class="outreach-item" data-venue-id="'+escapeHtml(r.venue_id)+'"><strong>'+escapeHtml(r.venue_name)+'</strong><small>'+escapeHtml(r.public_website||'No website available')+'</small><small>'+escapeHtml(r.target_status.replaceAll('_',' '))+(r.contact_email?' · Recipient recorded':' · Research needed')+'</small></button>').join(''):'<p class="empty-note">No venues in this stage.</p>';
 const first=state.total?state.page*state.limit+1:0,last=Math.min((state.page+1)*state.limit,state.total);
 $('page-note').textContent=first+'–'+last+' of '+state.total;
 $('prev').disabled=state.page<=0;$('next').disabled=(state.page+1)*state.limit>=state.total;
 if(state.selected){const found=state.items.find(r=>r.venue_id===state.selected.venue_id);if(found)renderSelect(found)}
}
async function load(){
 try{
 const [res,counts]=await Promise.all([
  rpc('gt_portal_outreach_page',{p_state:state.stage,p_limit:state.limit,p_offset:state.page*state.limit}),
  rpc('gt_portal_outreach_counts')
 ]);
 state.items=res.items||[];state.total=res.total||0;state.selected=null;
 for(const st of ['research','contact_qualified','copy_approved','send_ready','sent_receipted'])$('cnt-'+st).textContent=String(counts[st]||0);
 render();$('venue-name').textContent='Select a venue';$('venue-status').textContent='Choose a record from the left';
 $('venue-identity').replaceChildren();
 $('recipient-form').hidden=true;$('email-form').hidden=true;
 }catch(e){toast('Staff research queue unavailable: '+e.message,true)}
}
async function qualify(e){
 e.preventDefault();
 if(!state.selected)return;
 const args={
 p_venue_id:state.selected.venue_id,
 p_contact_name:$('contact-name').value.trim(),
 p_contact_title:$('contact-title').value.trim(),
 p_contact_email:$('contact-email').value.trim().toLowerCase(),
 p_source_url:$('contact-proof').value.trim(),
 p_note:$('contact-note').value.trim()
 };
 if(!args.p_source_url.startsWith('https://')){toast('Use an actual official HTTPS contact-evidence URL.',true);return}
 if(!confirm('Save this independently verified public business recipient? No email will be sent.'))return;
 const b=$('save-contact');b.disabled=true;
 try{await rpc('gt_portal_outreach_record_contact',args);toast('Verified recipient research saved. No email sent.');state.stage='contact_qualified';state.page=0;updateStage();await load();}
 catch(err){toast('Contact not saved: '+err.message,true)}finally{b.disabled=false}
}
async function saveCopy(e){
 e.preventDefault();
 if(!state.selected)return;
 const body=$('email-copy').value.trim();
 if(!body.includes(state.selected.venue_name)||body.length<80){toast('Use a tailored email mentioning the exact venue name.',true);return}
 const note=$('copy-note').value.trim();
 if(note.length<15){toast('Add at least 15 characters describing the customization.',true);return}
 const b=$('save-copy');b.disabled=true;
 try{await rpc('gt_portal_outreach_prepare_copy',{p_venue_id:state.selected.venue_id,p_copy:body,p_note:note});toast('Customized draft approved for internal preparation only. Muse has not sent it.');state.stage='copy_approved';state.page=0;updateStage();await load();}
 catch(err){toast('Draft not saved: '+err.message,true)}finally{b.disabled=false}
}
function updateStage(){
 document.querySelectorAll('[data-stage]').forEach(x=>x.classList.toggle('active',x.dataset.stage===state.stage));
}
function bind(){
 document.querySelectorAll('[data-stage]').forEach(x=>x.addEventListener('click',()=>{state.stage=x.dataset.stage;state.page=0;updateStage();load()}));
 $('list').addEventListener('click',e=>{const btn=e.target.closest('[data-venue-id]');if(!btn)return;const item=state.items.find(x=>x.venue_id===btn.dataset.venueId);if(item)renderSelect(item)});
 $('prev').addEventListener('click',()=>{state.page=Math.max(0,state.page-1);load()});
 $('next').addEventListener('click',()=>{if((state.page+1)*state.limit<state.total){state.page++;load()}});
 $('recipient-form').addEventListener('submit',qualify);
 $('email-form').addEventListener('submit',saveCopy);
 $('recipient-form').hidden=true;$('email-form').hidden=true;
}
init();