import React, { useMemo, useState } from 'react';

const SUPABASE_URL = 'https://dzlmtvodpyhetvektfuo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ekvoOK6QQ05dUZuWgzQfUw_2RgbWPFR';

const CONFIG = {
  join: {
    eyebrow: 'GOOD TIMES MEMBERSHIP',
    title: 'Join Good Times',
    description: 'Create your connection to curated experiences, city recommendations and future member benefits.',
    submit: 'Request membership access',
  },
  'concierge-request': {
    eyebrow: 'PERSONAL CONCIERGE',
    title: 'Request a Concierge',
    description: 'Tell us the night, occasion or experience you are trying to plan. The Good Times team will route the request correctly.',
    submit: 'Submit concierge request',
  },
  trip: {
    eyebrow: 'GOOD TIMES TRAVEL',
    title: 'Plan a Trip',
    description: 'Request a curated city plan for your dates, group, interests and occasion.',
    submit: 'Submit trip request',
  },
  group: {
    eyebrow: 'GROUP EXPERIENCES',
    title: 'Plan for a Group',
    description: 'Request nightlife, dining, activities, tickets or a full itinerary for your group.',
    submit: 'Submit group request',
  },
};

const initial = {
  full_name: '',
  email: '',
  phone: '',
  city: '',
  preferred_date: '',
  end_date: '',
  group_size: '',
  occasion: '',
  interests: '',
  budget: '',
  notes: '',
  sms_consent: true,
};

export default function DirectRequest({ requestType }) {
  const meta = CONFIG[requestType] || CONFIG.join;
  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const canSubmit = useMemo(() => {
    const base =
      form.full_name.trim().length >= 2 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) &&
      (!form.phone || form.phone.replace(/\D/g, '').length >= 10) &&
      status !== 'submitting';

    if (!base) return false;
    if (requestType === 'join') return form.city.trim().length >= 2 && form.interests.trim().length >= 2;
    if (requestType === 'concierge-request') return form.city.trim().length >= 2 && form.preferred_date && form.notes.trim().length >= 10;
    if (requestType === 'trip') return form.city.trim().length >= 2 && form.preferred_date && form.end_date && form.group_size;
    if (requestType === 'group') return form.city.trim().length >= 2 && form.preferred_date && form.group_size && form.occasion.trim().length >= 2;
    return true;
  }, [form, requestType, status]);

  const submit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;

    setStatus('submitting');
    setMessage('');

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/good_times_consumer_requests`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          request_type: requestType,
          full_name: form.full_name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim() || null,
          city: form.city.trim() || null,
          details: {
            preferred_date: form.preferred_date || null,
            end_date: form.end_date || null,
            group_size: form.group_size || null,
            occasion: form.occasion.trim() || null,
            interests: form.interests.trim() || null,
            budget: form.budget.trim() || null,
            notes: form.notes.trim() || null,
          },
          sms_consent: Boolean(form.sms_consent),
          status: 'new',
          source: 'good-times-direct-route',
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.message || 'Your request could not be submitted.');
      }

      setStatus('success');
      setMessage('Your request was received. The Good Times team will follow up with the correct next step.');
      setForm(initial);
    } catch (error) {
      setStatus('error');
      setMessage(error.message || 'Your request could not be submitted.');
    }
  };

  if (status === 'success') {
    return (
      <Page>
        <section style={styles.card}>
          <div style={styles.brand}>GOOD TIMES</div>
          <div style={styles.successIcon}>✓</div>
          <h1 style={styles.title}>Request received</h1>
          <p style={styles.copy}>{message}</p>
          <a href="/" style={styles.primaryLink}>Open the Good Times app</a>
        </section>
      </Page>
    );
  }

  return (
    <Page>
      <section style={styles.shell}>
        <a href="/" style={styles.back}>← Good Times app</a>
        <div style={styles.eyebrow}>{meta.eyebrow}</div>
        <h1 style={styles.heroTitle}>{meta.title}</h1>
        <p style={styles.heroCopy}>{meta.description}</p>

        <form onSubmit={submit} style={styles.card}>
          <div style={styles.grid}>
            <Field label="Full name"><input value={form.full_name} onChange={(event) => update('full_name', event.target.value)} autoComplete="name" required style={styles.input} /></Field>
            <Field label="Email"><input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} autoComplete="email" required style={styles.input} /></Field>
            <Field label="Mobile phone" optional><input type="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} autoComplete="tel" style={styles.input} /></Field>
            <Field label={requestType === 'trip' ? 'Destination city' : 'City'}><input value={form.city} onChange={(event) => update('city', event.target.value)} required style={styles.input} /></Field>

            {requestType !== 'join' && <Field label={requestType === 'trip' ? 'Trip start' : 'Preferred date'}><input type="date" value={form.preferred_date} onChange={(event) => update('preferred_date', event.target.value)} required style={styles.input} /></Field>}
            {requestType === 'trip' && <Field label="Trip end"><input type="date" value={form.end_date} onChange={(event) => update('end_date', event.target.value)} required style={styles.input} /></Field>}
            {(requestType === 'trip' || requestType === 'group' || requestType === 'concierge-request') && <Field label="Group size" optional={requestType === 'concierge-request'}><input type="number" min="1" max="1000" value={form.group_size} onChange={(event) => update('group_size', event.target.value)} required={requestType !== 'concierge-request'} style={styles.input} /></Field>}
            {(requestType === 'trip' || requestType === 'group' || requestType === 'concierge-request') && <Field label="Occasion" optional={requestType !== 'group'}><input value={form.occasion} onChange={(event) => update('occasion', event.target.value)} required={requestType === 'group'} style={styles.input} /></Field>}
            <Field label="Budget" optional><input value={form.budget} onChange={(event) => update('budget', event.target.value)} placeholder="Example: $1,500 total" style={styles.input} /></Field>
          </div>

          <Field label="Interests and vibe" optional={requestType !== 'join'}><textarea rows="4" value={form.interests} onChange={(event) => update('interests', event.target.value)} required={requestType === 'join'} style={styles.textarea} placeholder="Dining, nightlife, art, sports, wellness, family, VIP…" /></Field>
          <Field label={requestType === 'concierge-request' ? 'What do you need planned?' : 'Additional details'} optional={requestType !== 'concierge-request'}><textarea rows="5" value={form.notes} onChange={(event) => update('notes', event.target.value)} required={requestType === 'concierge-request'} style={styles.textarea} /></Field>

          <label style={styles.consent}>
            <input type="checkbox" checked={form.sms_consent} onChange={(event) => update('sms_consent', event.target.checked)} style={{ accentColor: '#D4A853' }} />
            <span>I agree to receive confirmation and follow-up messages about this request. Message and data rates may apply.</span>
          </label>

          {status === 'error' && <div style={styles.error}>{message}</div>}
          <button type="submit" disabled={!canSubmit} style={{ ...styles.button, opacity: canSubmit ? 1 : 0.4 }}>
            {status === 'submitting' ? 'Submitting…' : meta.submit}
          </button>
        </form>
      </section>
    </Page>
  );
}

function Page({ children }) {
  return (
    <main style={styles.page}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      {children}
    </main>
  );
}

function Field({ label, optional = false, children }) {
  return <label style={styles.field}><span style={styles.label}>{label}{optional ? ' · optional' : ''}</span>{children}</label>;
}

const styles = {
  page: { minHeight: '100vh', padding: '40px 20px 90px', background: 'radial-gradient(circle at 85% 0%, rgba(212,168,83,.18), transparent 35%), #06060C', color: '#F5F0E8', fontFamily: "'DM Sans',sans-serif" },
  shell: { width: 'min(850px,100%)', margin: '0 auto' },
  back: { color: 'rgba(245,240,232,.62)', textDecoration: 'none', fontSize: 13 },
  eyebrow: { marginTop: 36, color: '#D4A853', fontSize: 11, fontWeight: 800, letterSpacing: '.24em' },
  heroTitle: { margin: '10px 0 12px', fontFamily: "'Cormorant Garamond',serif", fontSize: 'clamp(48px,9vw,82px)', lineHeight: .92, fontWeight: 500, letterSpacing: '-.045em' },
  heroCopy: { maxWidth: 680, margin: '0 0 28px', color: 'rgba(245,240,232,.66)', fontSize: 16, lineHeight: 1.65 },
  card: { padding: 'clamp(22px,5vw,40px)', border: '1px solid rgba(255,255,255,.11)', borderRadius: 22, background: 'rgba(12,12,20,.92)', boxShadow: '0 30px 90px rgba(0,0,0,.4)' },
  brand: { color: '#D4A853', fontSize: 11, fontWeight: 800, letterSpacing: '.25em', textAlign: 'center' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 15 },
  field: { display: 'block', marginBottom: 16 },
  label: { display: 'block', marginBottom: 7, color: 'rgba(245,240,232,.86)', fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase' },
  input: { width: '100%', boxSizing: 'border-box', padding: '13px 14px', border: '1px solid rgba(255,255,255,.13)', borderRadius: 10, background: '#15151E', color: '#fff', font: 'inherit', fontSize: 16 },
  textarea: { width: '100%', boxSizing: 'border-box', padding: '13px 14px', border: '1px solid rgba(255,255,255,.13)', borderRadius: 10, background: '#15151E', color: '#fff', font: 'inherit', fontSize: 16, resize: 'vertical' },
  consent: { display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 6, color: 'rgba(245,240,232,.6)', fontSize: 12, lineHeight: 1.5 },
  button: { width: '100%', marginTop: 22, padding: '16px 20px', border: 0, borderRadius: 11, background: 'linear-gradient(135deg,#D4A853,#B8942F)', color: '#09090F', fontSize: 15, fontWeight: 900, cursor: 'pointer' },
  error: { marginTop: 16, padding: 12, border: '1px solid rgba(239,68,68,.35)', borderRadius: 10, background: 'rgba(239,68,68,.12)', color: '#FCA5A5', fontSize: 13 },
  successIcon: { display: 'grid', placeItems: 'center', width: 68, height: 68, margin: '26px auto 18px', borderRadius: '50%', background: 'rgba(212,168,83,.14)', color: '#D4A853', fontSize: 34 },
  title: { margin: '0 0 10px', fontFamily: "'Cormorant Garamond',serif", fontSize: 44, textAlign: 'center' },
  copy: { maxWidth: 600, margin: '0 auto', color: 'rgba(245,240,232,.68)', lineHeight: 1.6, textAlign: 'center' },
  primaryLink: { display: 'flex', justifyContent: 'center', marginTop: 24, padding: 14, borderRadius: 10, background: '#D4A853', color: '#09090F', textDecoration: 'none', fontWeight: 900 },
};
