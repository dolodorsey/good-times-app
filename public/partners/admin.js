// GOOD TIMES partner staff console. Explicit Gateway verified staff permissions are enforced by RPCs.
const BASE='https://dzlmtvodpyhetvektfuo.supabase.co';
const KEY='sb_publishable_ekvoOK6QQ05dUZuWgzQfUw_2RgbWPFR';
const $=id=>document.getElementById(id);
const state={session:null,queues:{claims:[],media:[],interests:[],publications:[]},tab:'claims',selected:null,previewUrl:null};
const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names={pending_review:'Pending staff review',more_info:'More evidence required',verified:'Official profile verified',rejected:'Claim rejected',disputed:'Disputed',pending:'Pending review',approved:'Approved',new:'New inquiry'};
function notice(m,error=false){const el=$('admin-toast');el.textContent=m;el.classList.toggle('error',error);el.hidden=false;setTimeout(()=>{el.hidden=true},6000)}
function getSession(){try{return JSON.parse(sessionStorage.getItem('gt_partner_session_v1')||'null')}catch{return null}}
async function api(path,{method='GET',body}={}){
 const response=await fetch(BASE+path,{method,headers:{apikey:KEY,Authorization:'Bearer '+(state.session?.access_token||''),Accept:'application/json',...(body!==undefined?{'Content-Type':'application/json'}:{})},body:body!==undefined?JSON.stringify(body):undefined,cache:'no-store'});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(data?.message||data?.error||'Request was refused');
 return data;
}
const rpc=(name,body={})=>api('/rest/v1/rpc/'+name,{method:'POST',body});
async function start(){
 state.session=getSession();
 if(!state.session?.access_token){$('auth').textContent='Staff login required. First verify your business email through the GOOD TIMES partner portal, then return here.';return}
 try{
 const who=await api('/auth/v1/user');
 if(!who?.id)throw Error('Please sign in again');
 const p=await rpc('gt_portal_staff_profile');
 if(!p?.authorized){$('auth').textContent='Access denied. Your verified account does not have explicit GOOD TIMES partner-review permissions.';return}
 $('auth').innerHTML='<span class="admin-verified">✓ VERIFIED GOOD TIMES STAFF ACCESS</span> · '+escapeHtml(p.role)+' · '+escapeHtml(who.email||'');
 $('staff-app').hidden=false;
 bind();await refreshAll();
 }catch(err){$('auth').textContent='Staff access not available: '+err.message}
}
async function refreshAll(){
 try{
 const [claims,media,interests,publications]=await Promise.all([
 rpc('gt_portal_staff_queue',{p_kind:'claims',p_limit:100}),
 rpc('gt_portal_staff_queue',{p_kind:'media',p_limit:100}),
 rpc('gt_portal_staff_queue',{p_kind:'interests',p_limit:100}),
 rpc('gt_portal_staff_queue',{p_kind:'publications',p_limit:100})]);
 state.queues={claims:Array.isArray(claims)?claims:[],media:Array.isArray(media)?media:[],interests:Array.isArray(interests)?interests:[],publications:Array.isArray(publications)?publications:[]};
 $('claims-count').textContent=String(state.queues.claims.filter(x=>['pending_review','more_info','disputed'].includes(x.status)).length)+' recent';
 $('media-count').textContent=String(state.queues.media.filter(x=>x.review_status==='pending').length)+' recent';
 $('interest-count').textContent=String(state.queues.interests.filter(x=>x.status==='new').length)+' recent';
 renderList();if(state.selected)select(state.selected.id);
 }catch(e){notice('Cannot load staff queue: '+e.message,true)}
}
function tab(kind){
 state.tab=kind;state.selected=null;
 if(state.previewUrl){URL.revokeObjectURL(state.previewUrl);state.previewUrl=null}
 document.querySelectorAll('[data-staff-tab]').forEach(x=>x.classList.toggle('active',x.dataset.staffTab===kind));
 $('detail-title').textContent='Choose a '+(kind==='claims'?'venue claim':kind==='media'?'media asset':kind==='interests'?'growth request':'published change');
 $('detail-status').textContent='The full request and review actions appear here.';
 $('selected-summary').textContent='';$('selected-detail').textContent='Select a row to inspect';
 $('staff-action').hidden=true;$('media-preview').replaceChildren();renderList();
}
function renderList(){
 const items=state.queues[state.tab]||[];
 $('review-list').innerHTML=items.length?items.map(r=>{
  const title=state.tab==='claims'?(r.canonical_venue_name||r.requested_name):state.tab==='media'?(r.file_name||r.asset_type):state.tab==='interests'?(r.requested_name||'Venue inquiry'):'Published venue update';
  const label=r.status||r.review_status||'Published';
  const when=r.submitted_at||r.created_at||r.published_at;
  return '<button type="button" class="review-item" data-id="'+escapeHtml(r.id)+'" aria-selected="'+(state.selected?.id===r.id)+'"><strong>'+escapeHtml(title||'Unnamed record')+'</strong><small>'+escapeHtml(names[label]||label)+' · '+escapeHtml(when?new Date(when).toLocaleString():'')+'</small></button>';
 }).join(''):'<p class="empty-note">No '+escapeHtml(state.tab)+' in the current queue.</p>';
}
async function previewAsset(record){
 if(state.previewUrl){URL.revokeObjectURL(state.previewUrl);state.previewUrl=null}
 $('media-preview').replaceChildren();
 if(!record.mime_type?.startsWith('image/'))return;
 try{
  const url=BASE+'/storage/v1/object/authenticated/'+record.storage_bucket+'/'+record.storage_path.split('/').map(encodeURIComponent).join('/');
  const response=await fetch(url,{headers:{apikey:KEY,Authorization:'Bearer '+state.session.access_token}});
  if(!response.ok)throw Error('Private image preview is not available');
  const blob=await response.blob();
  if(!blob.type.startsWith('image/'))throw Error('Unexpected object type');
  state.previewUrl=URL.createObjectURL(blob);
  const img=document.createElement('img');img.src=state.previewUrl;img.alt='Private pending venue media preview';img.className='admin-image';
  $('media-preview').replaceChildren(img);
 }catch(e){$('media-preview').textContent=e.message}
}
function select(id){
 const record=(state.queues[state.tab]||[]).find(x=>x.id===id);if(!record)return;
 state.selected=record;renderList();
 $('detail-title').textContent=state.tab==='claims'?(record.canonical_venue_name||record.requested_name||'Venue claim'):state.tab==='media'?(record.file_name||'Media asset'):state.tab==='interests'?'Marketing inquiry':'Publication record';
 $('detail-status').textContent=names[record.status||record.review_status]||record.status||record.review_status||'Published';
 $('selected-summary').textContent=state.tab==='claims'?'Applicant: '+(record.contact_name||'')+' · '+(record.contact_email||'')+' · '+(record.relationship||''):state.tab==='media'?'Claim '+record.claim_id+' · '+record.asset_type:'';
 $('selected-detail').textContent=JSON.stringify(record,null,2);
 $('staff-action').hidden=state.tab==='publications';
 $('authority-wrap').hidden=state.tab!=='claims';
 $('publish-controls').hidden=!(state.tab==='claims'&&record.status==='verified');
 $('staff-note').value='';$('staff-evidence').value='';$('authority-method').value='';
 document.querySelectorAll('[name="publish-field"]').forEach(x=>x.checked=false);
 const actions=$('staff-buttons');actions.replaceChildren();
 if(state.tab==='claims'){
  if(record.status==='pending_review'||record.status==='more_info'||record.status==='disputed'){
   for(const [label,act,kind] of [['Approve verified claim','approve','primary'],['Request more information','more_info','outline'],['Reject claim','reject','outline'],['Mark disputed','dispute','outline']])actions.appendChild(actionButton(label,act,kind));
  }else if(record.status==='verified'){actions.appendChild(actionButton('Publish selected verified fields','publish','primary'))}
  else $('staff-action').hidden=true;
 }else if(state.tab==='media'){
  if(record.review_status==='pending'){actions.appendChild(actionButton('Approve media','approved','primary'));actions.appendChild(actionButton('Reject media','rejected','outline'))}
  else $('staff-action').hidden=true;
  previewAsset(record);
 }else if(state.tab==='interests'){
   $('media-preview').replaceChildren();
   $('authority-wrap').hidden=true;
   if(['new','qualified','proposal'].includes(record.status)){
     if(record.status==='new')actions.appendChild(actionButton('Mark qualified','qualified','primary'));
     if(record.status!=='proposal')actions.appendChild(actionButton('Proposal prepared (not sent)','proposal','outline'));
     actions.appendChild(actionButton('Decline inquiry','declined','outline'));
   }else $('staff-action').hidden=true;
 }else $('media-preview').replaceChildren();
}
function actionButton(label,act,variant){
 const b=document.createElement('button');b.type='button';b.className='button '+variant;b.textContent=label;b.addEventListener('click',()=>submitAction(act));return b;
}
async function submitAction(action){
 const current=state.selected;if(!current)return;
 const note=$('staff-note').value.trim(),evidence=$('staff-evidence').value.trim(),method=$('authority-method').value;
 if(note.length<15){notice('Enter a review note of at least 15 characters.',true);return}
 if((action==='approve'||action==='publish')&&evidence.length<18){notice('Document the verified evidence source before approval.',true);return}
 if(action==='approve'&&!method){notice('Choose an independently verified authority method.',true);return}
 if(action==='publish'&&!document.querySelectorAll('[name="publish-field"]:checked').length){notice('Choose specific approved fields to publish.',true);return}
 if(!confirm('Apply '+action+' to this record? This change is audited.'))return;
 const buttons=[...$('staff-buttons').querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);
 try{
  let result;
  if(state.tab==='media')result=await rpc('gt_portal_staff_media_decision',{p_media_id:current.id,p_decision:action,p_note:note});
  else if(state.tab==='interests')result=await rpc('gt_portal_staff_interest_decision',{p_interest_id:current.id,p_decision:action,p_note:note});
  else if(action==='publish')result=await rpc('gt_portal_staff_publish_checked',{p_claim_id:current.id,p_fields:[...document.querySelectorAll('[name="publish-field"]:checked')].map(x=>x.value),p_evidence_ref:evidence,p_expected_draft:current.profile_draft||{}});
  else result=await rpc('gt_portal_staff_claim_decision',{p_claim_id:current.id,p_decision:action,p_authority_method:method||null,p_evidence_ref:evidence||null,p_note:note});
  notice((result?.status||action)+' saved with audit evidence.');await refreshAll();
 }catch(err){notice('Action blocked: '+err.message,true)}finally{buttons.forEach(b=>b.disabled=false)}
}
function bind(){
 document.querySelectorAll('[data-staff-tab]').forEach(x=>x.addEventListener('click',()=>tab(x.dataset.staffTab)));
 $('staff-refresh').addEventListener('click',refreshAll);
 $('review-list').addEventListener('click',e=>{const b=e.target.closest('[data-id]');if(b)select(b.dataset.id)});
}
start();