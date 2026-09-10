await (window.__GT_STABILIZER_READY__ || Promise.resolve())
const serviceState = await (window.__GOOD_TIMES_SERVICE_READY__ || Promise.resolve({ ready: true }))
if (serviceState?.ready !== false) await import('./main.jsx')
