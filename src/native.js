/**
 * GOOD TIMES — Native Bridge
 * Capacitor plugin integration for iOS and Android features
 */

import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Share } from '@capacitor/share';
import { Browser } from '@capacitor/browser';
import { PushNotifications } from '@capacitor/push-notifications';
import { GT_SUPABASE_ANON_KEY, GT_SUPABASE_URL } from './lib/supabase.js';
import { readSession } from './features/auth/client.js';

export const isNative = Capacitor.isNativePlatform();
export const isIOS = Capacitor.getPlatform() === 'ios';
let pushListenersInstalled = false;

/** Initialize native features on app load */
export async function initNative() {
  if (!isNative) return;

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#06060C' });
  } catch (e) {
    console.log('StatusBar not available:', e);
  }

  try {
    await SplashScreen.hide();
  } catch (e) {
    console.log('SplashScreen not available:', e);
  }
}

/** Haptic feedback for taps */
export async function tapHaptic() {
  if (!isNative) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (e) {}
}

/** Haptic feedback for heavy actions */
export async function heavyHaptic() {
  if (!isNative) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch (e) {}
}

/** Native share sheet */
export async function shareEvent(event) {
  return shareContent({
    title: event.title,
    text: `${event.title} — ${event.venue || 'TBA'}\n${event.date || ''}\nFound on Good Times™`,
    url: 'https://thegoodtimesworldwide.com',
    dialogTitle: 'Share this event',
  });
}

/** Reusable native/web share sheet for plans, places, tickets, and events */
export async function shareContent({ title='GOOD TIMES', text='', url='https://thegoodtimesworldwide.com', dialogTitle='Share from GOOD TIMES' } = {}) {
  if (!isNative) {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return true;
      } catch (error) {
        if (error?.name === 'AbortError') return false;
      }
    }
    try {
      await navigator.clipboard?.writeText([text, url].filter(Boolean).join('\n'));
      return true;
    } catch (error) {
      return false;
    }
  }
  try {
    await Share.share({ title, text, url, dialogTitle });
    return true;
  } catch (e) {
    return false;
  }
}

/** Open external links in native browser */
export async function openLink(url) {
  if (!isNative) {
    window.open(url, '_blank');
    return;
  }
  try {
    await Browser.open({ url });
  } catch (e) {
    window.open(url, '_blank');
  }
}

async function persistPushToken(deviceToken) {
  const token=String(deviceToken||'').trim();
  const session=readSession();
  if(!token||!session?.access_token||!session?.user?.id)return false;
  try{
    const response=await fetch(`${GT_SUPABASE_URL}/rest/v1/gt_push_tokens?on_conflict=user_id,device_token`,{
      method:'POST',
      headers:{
        apikey:GT_SUPABASE_ANON_KEY,
        Authorization:`Bearer ${session.access_token}`,
        'Content-Type':'application/json',
        Prefer:'resolution=merge-duplicates,return=minimal',
      },
      body:JSON.stringify({
        user_id:session.user.id,
        device_token:token,
        platform:Capacitor.getPlatform(),
        updated_at:new Date().toISOString(),
      }),
    });
    return response.ok;
  }catch{return false;}
}

function installPushListeners(){
  if(pushListenersInstalled)return;
  pushListenersInstalled=true;
  PushNotifications.addListener('registration', token => { void persistPushToken(token.value); });
  PushNotifications.addListener('registrationError', err => { console.error('Push registration error:', err.error); });
  PushNotifications.addListener('pushNotificationReceived', notification => {
    try{window.dispatchEvent(new CustomEvent('gt:push-received',{detail:{title:notification?.title||'',body:notification?.body||'',data:notification?.data||{}}}));}catch{}
  });
  PushNotifications.addListener('pushNotificationActionPerformed', action => {
    try{window.dispatchEvent(new CustomEvent('gt:push-action',{detail:action?.notification?.data||{}}));}catch{}
  });
}

/** Register for push notifications. New permission prompts only occur after a user action. */
export async function registerPush({requestPermission=true} = {}) {
  if (!isNative) return 'unsupported';

  try {
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt' && requestPermission) {
      permStatus = await PushNotifications.requestPermissions();
    }
    if (permStatus.receive === 'prompt') return 'prompt';
    if (permStatus.receive !== 'granted') return 'denied';

    installPushListeners();
    await PushNotifications.register();
    return 'granted';
  } catch (e) {
    console.error('Push setup error:', e);
    return 'error';
  }
}