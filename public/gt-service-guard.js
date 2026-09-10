;(function installGoodTimesServiceGuard(){
  if (window.__GOOD_TIMES_SERVICE_READY__) return

  var HEALTH_URL = '/api/health'
  var CLIENT_TIMEOUT_MS = 5000
  var root = document.getElementById('root')
  var resolveReady

  window.__GOOD_TIMES_SERVICE_READY__ = new Promise(function(resolve){ resolveReady = resolve })

  function escapeText(value){
    return String(value == null ? '' : value)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#039;')
  }

  function renderShell(mode, detail){
    if (!root) return
    var checking = mode === 'checking'
    var eyebrow = checking ? 'VERIFYING LIVE SERVICE' : 'LIVE SERVICE TEMPORARILY PAUSED'
    var title = checking ? 'Opening GOOD TIMES.' : 'GOOD TIMES is reconnecting.'
    var body = checking
      ? 'Confirming the GOOD TIMES customer and live discovery systems before opening your experience.'
      : 'Discovery, saves, planning, concierge and account actions are paused until the GOOD TIMES data services are healthy. No request or account change was submitted.'
    var action = checking ? '' : '<button id="gt-service-retry" type="button">Check status again</button>'
    var diagnostic = detail && !checking ? '<small>Service check: '+escapeText(detail)+'</small>' : ''

    root.innerHTML = '<div class="gt-service-gate" role="status" aria-live="polite">'
      + '<style>'
      + '.gt-service-gate{min-height:100dvh;width:100%;display:flex;align-items:center;justify-content:center;padding:28px;background:radial-gradient(circle at 50% 12%,#20172b 0%,#0b0910 34%,#030307 78%);color:#f5f0e8;font-family:DM Sans,Arial,sans-serif;text-align:center}'
      + '.gt-service-card{width:min(100%,420px);border:1px solid rgba(206,170,100,.32);border-radius:28px;padding:38px 28px;background:linear-gradient(180deg,rgba(26,22,31,.92),rgba(8,7,11,.96));box-shadow:0 28px 80px rgba(0,0,0,.54)}'
      + '.gt-service-mark{width:64px;height:64px;border:1px solid rgba(206,170,100,.45);border-radius:50%;display:grid;place-items:center;margin:0 auto 24px;color:#d8b774;font-family:Georgia,serif;font-size:21px;letter-spacing:.08em}'
      + '.gt-service-eyebrow{font-size:11px;letter-spacing:.22em;color:#d8b774;font-weight:800;margin-bottom:14px}'
      + '.gt-service-card h1{font-family:Georgia,serif;font-size:36px;line-height:1.03;font-weight:500;margin:0 0 16px}'
      + '.gt-service-card p{font-size:14px;line-height:1.7;color:#c9c3bb;margin:0 auto 24px;max-width:340px}'
      + '.gt-service-card button{width:100%;min-height:50px;border-radius:999px;border:1px solid rgba(216,183,116,.55);background:#d8b774;color:#09080a;font-weight:800;font-size:13px;letter-spacing:.04em;margin-top:4px}'
      + '.gt-service-links{display:flex;justify-content:center;gap:18px;margin-top:22px;font-size:12px}.gt-service-links a{color:#d6d0c8;text-decoration:none;border-bottom:1px solid rgba(214,208,200,.35)}'
      + '.gt-service-gate small{display:block;margin-top:16px;color:#817b75;font-size:10px;letter-spacing:.06em}'
      + '.gt-service-pulse{height:2px;width:92px;margin:22px auto 0;background:linear-gradient(90deg,transparent,#d8b774,transparent);animation:gtServicePulse 1.2s ease-in-out infinite}@keyframes gtServicePulse{0%,100%{opacity:.25;transform:scaleX(.55)}50%{opacity:1;transform:scaleX(1)}}'
      + '@media(min-width:900px){.gt-service-gate{min-height:100%;padding:20px}.gt-service-card{padding:34px 28px}.gt-service-card h1{font-size:34px}}'
      + '</style>'
      + '<div class="gt-service-card"><div class="gt-service-mark">GT</div>'
      + '<div class="gt-service-eyebrow">'+eyebrow+'</div><h1>'+title+'</h1><p>'+body+'</p>'
      + (checking ? '<div class="gt-service-pulse" aria-hidden="true"></div>' : action)
      + '<div class="gt-service-links"><a href="/support.html">Support</a><a href="/privacy.html">Privacy</a></div>'+diagnostic+'</div></div>'

    var retry = document.getElementById('gt-service-retry')
    if (retry) retry.addEventListener('click', function(){
      retry.disabled = true
      retry.textContent = 'Checking…'
      checkHealth(true)
    })
  }

  async function fetchHealth(){
    var controller = new AbortController()
    var timer = setTimeout(function(){ controller.abort() }, CLIENT_TIMEOUT_MS)
    try {
      var response = await fetch(HEALTH_URL, { cache:'no-store', headers:{ Accept:'application/json' }, signal:controller.signal })
      var payload = await response.json().catch(function(){ return null })
      if (!response.ok || !payload || payload.ok !== true || payload.service !== 'good-times') {
        var state = payload && (payload.customer_ready === false || payload.content_ready === false) ? 'backend unavailable' : 'health check unavailable'
        return { ready:false, detail:state }
      }
      return { ready:true, detail:'ready' }
    } catch (error) {
      return { ready:false, detail:error && error.name === 'AbortError' ? 'health check timeout' : 'network unavailable' }
    } finally {
      clearTimeout(timer)
    }
  }

  async function checkHealth(isRetry){
    if (!isRetry) renderShell('checking')
    var state = await fetchHealth()
    window.__GOOD_TIMES_SERVICE_STATE__ = state
    if (state.ready) {
      if (isRetry) {
        window.location.reload()
        return
      }
      root.innerHTML = ''
      resolveReady(state)
      return
    }
    renderShell('unavailable', state.detail)
    if (!isRetry) resolveReady(state)
  }

  checkHealth(false)
})()
