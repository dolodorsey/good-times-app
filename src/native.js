/**
 * GOOD TIMES — Native Bridge
 * Capacitor plugin integration for iOS native features
 */

import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Share } from '@capacitor/share';
import { Browser } from '@capacitor/browser';
import { PushNotifications } from '@capacitor/push-notifications';

export const isNative = Capacitor.isNativePlatform();
export const isIOS = Capacitor.getPlatform() === 'ios';

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

/** Register for push notifications */
export async function registerPush() {
  if (!isNative) return null;

  try {
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.log('Push permission not granted');
      return null;
    }

    await PushNotifications.register();

    // Listen for registration token
    PushNotifications.addListener('registration', (token) => {
      console.log('Push registration token:', token.value);
      // TODO: Send token to Supabase push_tokens table
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.error('Push registration error:', err.error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received:', notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push action:', notification);
    });

    return true;
  } catch (e) {
    console.error('Push setup error:', e);
    return null;
  }
}