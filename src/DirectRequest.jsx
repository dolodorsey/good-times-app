import React, { useMemo, useRef, useState } from 'react';
import { localTodayISO, validateDirectRequest } from './direct-request-validation.js';

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
  sms_consent: false,
};

export default function DirectRequest({ requestType }) {
  const meta = CONFIG[requestType] || CONFIG.join;
  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [attempted, setAttempted] = useState(false);
  const formRef = useRef(null);
  const submittingRef = useRef(false);
  const todayISO = useMemo(() => localTodayISO(), []);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const validation = useMemo(
    () => validateDirectRequest(form, requestType, todayISO),
    [form, requestType, todayISO],
  );
  const canSubmit = validation.valid && status !== 'submitting';

  const submit = async (event) => {
    event.preventDefault();
    if (status === 'submitting') return;
    if (submittingRef.current) return;
    setAttempted(true);
    if (!canSubmit) {
      setStatus('error');
      formRef.current?.elements.namedItem(Object.keys(validation.errors)[0])?.focus();
      setMessage(Object.values(validation.errors)[0] || 'Review the request details and try again.');
      return;
    }

    submittingRef.current = true;
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
            group_size: form.group_size ? Number(form.group_size) : null,
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
    } finally {
      submittingRef.current = false;
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

        <form ref={formRef} onSubmit={submit} onInvalid={() => setAttempted(true)} style={styles.card}>
          <p style={styles.formHint}>Tell us the essentials. Optional details help us tailor your experience.</p>
          <div style={styles.grid}>
            <Field fieldKey="full_name" error={attempted ? validation.errors.full_name : null} label="Full name"><input value={form.full_name} onChange={(event) => update('full_name', event.target.value)} autoComplete="name" required minLength="2" maxLength="120" style={styles.input} /></Field>
            <Field fieldKey="email" error={attempted ? validation.errors.email : null} label="Email"><input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} autoComplete="email" required style={styles.input} /></Field>
            <Field fieldKey="phone" error={attempted ? validation.errors.phone : null} label="Mobile phone" optional><input type="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} autoComplete="tel" style={styles.input} /></Field>
            <Field fieldKey="city" error={attempted ? validation.errors.city : null} label={requestType === 'trip' ? 'Destination city' : 'City'}><input value={form.city} onChange={(event) => update('city', event.target.value)} required minLength="2" maxLength="120" style={styles.input} /></Field>

            {requestType !== 'join' && <Field fieldKey="preferred_date" error={attempted ? validation.errors.preferred_date : null} label={requestType === 'trip' ? 'Trip start' : 'Preferred date'}><input type="date" min={todayISO} value={form.preferred_date} onChange={(event) => update('preferred_date', event.target.value)} required style={styles.input} /></Field>}
            {requestType === 'trip' && <Field fieldKey="end_date" error={attempted ? validation.errors.end_date : null} label="Trip end"><input type="date" min={form.preferred_date || todayISO} value={form.end_date} onChange={(event) => update('end_date', event.target.value)} required style={styles.input} /></Field>}
            {(requestType === 'trip' || requestType === 'group' || requestType === 'concierge-request') && <Field fieldKey="group_size" error={attempted ? validation.errors.group_size : null} label="Group size" optional={requestType === 'concierge-request'}><input type="number" min="1" max="1000" step="1" value={form.group_size} onChange={(event) => update('group_size', event.target.value)} required={requestType !== 'concierge-request'} style={styles.input} /></Field>}
            {(requestType === 'trip' || requestType === 'group' || requestType === 'concierge-request') && <Field fieldKey="occasion" error={attempted ? validation.errors.occasion : null} label="Occasion" optional={requestType !== 'group'}><input value={form.occasion} onChange={(event) => update('occasion', event.target.value)} required={requestType === 'group'} style={styles.input} /></Field>}
            <Field fieldKey="budget" error={attempted ? validation.errors.budget : null} label="Budget" optional><input value={form.budget} onChange={(event) => update('budget', event.target.value)} placeholder="Example: $1,500 total" style={styles.input} /></Field>
          </div>

          <Field fieldKey="interests" error={attempted ? validation.errors.interests : null} label="Interests and vibe" optional={requestType !== 'join'}><textarea rows="4" value={form.interests} onChange={(event) => update('interests', event.target.value)} required={requestType === 'join'} style={styles.textarea} placeholder="Dining, nightlife, art, sports, wellness, family, VIP…" /></Field>
          <Field fieldKey="notes" error={attempted ? validation.errors.notes : null} label={requestType === 'concierge-request' ? 'What do you need planned?' : 'Additional details'} optional={requestType !== 'concierge-request'}><textarea rows="5" value={form.notes} onChange={(event) => update('notes', event.target.value)} required={requestType === 'concierge-request'} minLength={requestType === 'concierge-request' ? 10 : undefined} style={styles.textarea} /></Field>

          <label style={styles.consent}>
            <input type="checkbox" checked={form.sms_consent} onChange={(event) => update('sms_consent', event.target.checked)} style={{ accentColor: '#D4A853' }} />
            <span>I agree to receive confirmation and follow-up messages about this request. Message and data rates may apply.</span>
          </label>

          {status === 'error' && <div role="alert" style={styles.error}>{message}</div>}
          <button type="submit" disabled={status === 'submitting'} aria-busy={status === 'submitting'} style={{ ...styles.button, opacity: status === 'submitting' ? 0.4 : 1 }}>
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

      {children}
    </main>
  );
}

function Field({ label, fieldKey, error, optional = false, children }) {
  const errorId = `request-${fieldKey}-error`;
  return <div style={styles.field}>
    <label htmlFor={`request-${fieldKey}`} style={styles.label}>{label}{optional ? ' · optional' : ''}</label>
    {React.cloneElement(children, {id: `request-${fieldKey}`, name: fieldKey, 'aria-invalid': Boolean(error), 'aria-describedby': error ? errorId : undefined,
      style: {...children.props.style, ...(error ? {borderColor: '#F16060'} : {})}})}
    {error && <span id={errorId} style={styles.fieldError}>{error}</span>}
  </div>;
}

const styles = {
  formHint: {margin: '0 0 24px', color: '#AAA8A3', fontSize: 13, lineHeight: 1.6},
  fieldError: {display: 'block', marginTop: 8, color: '#FCA5A5', fontSize: 12, lineHeight: 1.5},
  page: { minHeight: '100vh', padding: '40px 20px 90px', background: 'radial-gradient(circle at 85% 0%, rgba(212,168,83,.18), transparent 35%), #06060C', color: '#F5F0E8', fontFamily: "'DM Sans',sans-serif" },
  shell: { width: 'min(850px,100%)', margin: '0 auto' },
  back: { color: 'rgba(245,240,232,.62)', textDecoration: 'none', fontSize: 13 },
  eyebrow: { marginTop: 36, color: '#D4A853', fontSize: 11, fontWeight: 800, letterSpacing: '.24em' },
  heroTitle: { margin: '10px 0 12px', fontFamily: "'Cormorant Garamond',serif", fontSize: 'clamp(48px,9vw,82px)', lineHeight: .92, fontWeight: 500, letterSpacing: '-.045em' },
  heroCopy: { maxWidth: 680, margin: '0 0 28px', color: 'rgba(245,240,232,.66)', fontSize: 16, lineHeight: 1.65 },
  card: { padding: 'clamp(22px,5vw,40px)', border: '1px solid rgba(255,255,255,.11)', borderRadius: 22, background: 'rgba(12,12,20,.92)', boxShadow: '0 30px 90px rgba(0,0,0,.4)' },
  brand: { color: '#D4A853', fontSize: 11, fontWeight: 800, letterSpacing: '.25em', textAlign: 'center' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(230px,100%),1fr))', gap: 15 },
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
