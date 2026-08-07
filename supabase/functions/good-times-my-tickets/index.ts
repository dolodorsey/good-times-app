import QRCode from 'npm:qrcode@1.5.4'
import { createClient } from 'npm:@supabase/supabase-js@2'

const GOOD_TIMES_URL='https://czocqfaovfpjweayniuw.supabase.co'
const GOOD_TIMES_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6ImN6b2NxZmFvdmZwandlYXluaXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNzEzODAsImV4cCI6MjA4Mzk0NzM4MH0.6-3rmA9tZXHLVg5N6a_82rKA9Kvrj4gRrUUiSczovho'
const ALLOWED_ORIGINS=new Set([
  'https://thegoodtimesworldwide.com','https://www.thegoodtimesworldwide.com','https://good-times-app.vercel.app',
  'https://good-times-app-dr-dorseys-projects.vercel.app','https://good-times-app-git-main-dr-dorseys-projects.vercel.app',
  'capacitor://localhost','http://localhost','http://localhost:5173',
])
const PREVIEW_ORIGIN=/^https:\/\/good-times-[a-z0-9-]+-dr-dorseys-projects\.vercel\.app$/i

function allowedOrigin(origin:string|null){return Boolean(origin&&(ALLOWED_ORIGINS.has(origin)||PREVIEW_ORIGIN.test(origin)))}
function cors(origin:string|null){
  const value=allowedOrigin(origin)?origin!:'https://thegoodtimesworldwide.com'
  return {'Access-Control-Allow-Origin':value,'Access-Control-Allow-Headers':'authorization, content-type, apikey','Access-Control-Allow-Methods':'GET, OPTIONS','Vary':'Origin'}
}
function json(status:number,body:unknown,origin:string|null){return new Response(JSON.stringify(body),{status,headers:{...cors(origin),'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}})}
async function qrImage(token:string){
  const svg=await QRCode.toString(token,{type:'svg',errorCorrectionLevel:'M',margin:1,width:256})
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

Deno.serve(async req=>{
  const origin=req.headers.get('origin')
  if(req.method==='OPTIONS')return allowedOrigin(origin)?new Response(null,{status:204,headers:cors(origin)}):new Response(null,{status:403})
  if(!allowedOrigin(origin))return json(403,{ok:false,error:'Origin not allowed'},origin)
  if(req.method!=='GET')return json(405,{ok:false,error:'Method not allowed'},origin)

  const authorization=req.headers.get('authorization')||''
  if(!authorization.toLowerCase().startsWith('bearer '))return json(401,{ok:false,error:'Authentication required'},origin)

  const authResponse=await fetch(`${GOOD_TIMES_URL}/auth/v1/user`,{headers:{apikey:GOOD_TIMES_ANON_KEY,Authorization:authorization,Accept:'application/json'}})
  if(!authResponse.ok)return json(401,{ok:false,error:'GOOD TIMES session is invalid or expired'},origin)
  const user=await authResponse.json().catch(()=>null)
  const email=String(user?.email||'').trim().toLowerCase()
  const userId=String(user?.id||'').trim()
  if(!email||!userId)return json(401,{ok:false,error:'GOOD TIMES account identity is incomplete'},origin)

  const serviceUrl=Deno.env.get('SUPABASE_URL')
  const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if(!serviceUrl||!serviceKey)return json(503,{ok:false,error:'Ticket wallet is not configured'},origin)
  const admin=createClient(serviceUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
  const select='id,event_id,brand_key,event_series,event_name,event_date,event_city,venue,venue_name,venue_address,tier,price,quantity,total,status,qr_code,qr_token,ticket_number,checked_in,checked_in_at,purchased_at,source,payment_provider'
  const [byUser,byEmail]=await Promise.all([
    admin.from('event_tickets').select(select).eq('user_id',userId).order('purchased_at',{ascending:false}).limit(100),
    admin.from('event_tickets').select(select).eq('user_email',email).order('purchased_at',{ascending:false}).limit(100),
  ])
  if(byUser.error||byEmail.error){
    console.error('[GOOD TIMES ticket wallet]',{byUser:byUser.error?.message,byEmail:byEmail.error?.message,userId})
    return json(503,{ok:false,error:'Ticket wallet is temporarily unavailable'},origin)
  }
  const merged=new Map<string,any>()
  for(const ticket of [...(byUser.data||[]),...(byEmail.data||[])])merged.set(ticket.id,ticket)
  const sorted=[...merged.values()].sort((a,b)=>String(b.purchased_at||'').localeCompare(String(a.purchased_at||'')))
  const tickets=await Promise.all(sorted.map(async ticket=>{
    const credential=String(ticket.qr_token||'').trim()
    const generated=credential?await qrImage(credential):null
    const {qr_token,...safeTicket}=ticket
    return {...safeTicket,qr_code:ticket.qr_code||generated}
  }))
  return json(200,{ok:true,tickets,count:tickets.length},origin)
})
