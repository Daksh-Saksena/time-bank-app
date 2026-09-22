/**
 * In-app + Push Notification Service
 * Handles:
 *  - Storing notifications in Supabase (for web in-app bell)
 *  - Sending browser Notification API alerts
 *  - Sending Capacitor push notifications (mobile)
 */
import { Capacitor } from '@capacitor/core';
import { supabase } from './supabase';
import { NOTIFICATION_TYPES, TRUSTED_NOTIFY_TIMEOUT_MINS } from '../constants';

// ── Capacitor Push (mobile only) ──────────────────────────
let PushNotifications = null;
async function getCapacitorPush() {
  try {
    if (typeof window === 'undefined') return null;
    const isNative = typeof Capacitor !== 'undefined' &&
      typeof Capacitor.isNativePlatform === 'function' &&
      Capacitor.isNativePlatform();
    if (!isNative) return null;
    if (typeof Capacitor.isPluginAvailable === 'function' && !Capacitor.isPluginAvailable('PushNotifications')) {
      return null;
    }
    if (PushNotifications) return PushNotifications;
    const cap = await import('@capacitor/push-notifications');
    PushNotifications = cap?.PushNotifications || null;
    return PushNotifications;
  } catch {
    return null;
  }
}

export async function initPushNotifications(userId) {
  try {
    const isNative = typeof window !== 'undefined' &&
      typeof Capacitor !== 'undefined' &&
      typeof Capacitor.isNativePlatform === 'function' &&
      Capacitor.isNativePlatform() &&
      (typeof Capacitor.isPluginAvailable !== 'function' || Capacitor.isPluginAvailable('PushNotifications'));

    if (!isNative) {
      // Web: register service worker for FCM / Web Push if available
      await registerWebPush(userId).catch(() => {});
      return;
    }
    const Push = await getCapacitorPush();
    if (!Push) return;

    const perm = await Push.requestPermissions().catch(() => ({ receive: 'denied' }));
    if (perm?.receive !== 'granted') return;
    await Push.register().catch(() => {});
    Push.addListener('registration', async ({ value: token }) => {
      if (token && userId) {
        const isUuid = (id) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        if (isUuid(userId)) {
          try {
            await supabase.from('profiles').update({ push_token: token }).eq('id', userId);
          } catch (e) {}
        }
      }
    });
    Push.addListener('pushNotificationReceived', (notification) => {
      console.log('[Push] Received:', notification);
    });
    Push.addListener('pushNotificationActionPerformed', (action) => {
      console.log('[Push] Action:', action);
    });
  } catch (err) {
    console.warn('[Push] Native push notifications not available:', err?.message || err);
  }
}

async function registerWebPush(userId) {
  try {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) return;
    if (Notification.permission !== 'granted' || !userId) return;
    const isUuid = (id) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUuid(userId)) {
      await supabase.from('profiles').update({ push_token: 'web-' + userId }).eq('id', userId);
    }
  } catch (err) {
    console.warn('[Push] Web push init note:', err?.message || err);
  }
}

// ── Store notification in DB (in-app bell) ────────────────
export async function storeNotification({ userId, type, title, body, requestId }) {
  if (!userId) return;
  const isUuid = (id) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const validUserId = isUuid(userId) ? userId : null;
  const validRequestId = isUuid(requestId) ? requestId : null;
  if (!validUserId) return;
  try {
    const { error } = await supabase.from('notifications').insert([{
      user_id: validUserId,
      type,
      title,
      body,
      request_id: validRequestId,
      read: false,
    }]);
    if (error) console.warn('[Notification] Store note:', error.message);
  } catch (e) {
    console.warn('[Notification] Store exception:', e?.message);
  }
}

// ── Browser native notification (web fallback) ────────────
function showBrowserNotification(title, body, icon = '/logo.png') {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, { body, icon });
    } catch (e) {
      console.warn('[Notification] Browser notification error:', e);
    }
  }
}

// ── Mark notifications as read ────────────────────────────
export async function markNotificationsRead(userId) {
  if (!userId) return;
  await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
}

// ── Fetch user notifications ──────────────────────────────
export async function fetchNotifications(userId) {
  if (!userId) return [];
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  return data || [];
}

// ── Notify trusted circle volunteers for a new request ───
export async function notifyTrustedVolunteers({ requestId, seniorId, serviceType, seniorName, location, pincode }) {
  let volunteerIds = [];
  const isUuid = (id) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  // Check localStorage for trusted circle first
  try {
    const local = localStorage.getItem('tb_trusted_' + seniorId);
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) {
        volunteerIds = parsed.map((v) => (typeof v === 'object' && v ? v.id : v)).filter(Boolean);
      }
    }
  } catch (e) {}

  // If none found locally, try fetching from Supabase preferences
  if (volunteerIds.length === 0 && isUuid(seniorId)) {
    try {
      const { data: prefs, error } = await supabase
        .from('preferences')
        .select('target_user_id')
        .eq('user_id', seniorId)
        .eq('relationship', 'trusted');
      if (!error && prefs && prefs.length > 0) {
        volunteerIds = prefs.map((p) => p.target_user_id).filter(Boolean);
      }
    } catch (e) {
      console.warn('[notifyTrustedVolunteers] preferences lookup note:', e?.message);
    }
  }

  if (!volunteerIds || volunteerIds.length === 0) {
    // No trusted circle — broadcast immediately
    await broadcastToNearbyVolunteers({ requestId, serviceType, seniorName, location, pincode });
    return;
  }

  // Fetch volunteer profiles (check availability)
  try {
    const validVolIds = volunteerIds.filter(isUuid);
    if (validVolIds.length > 0) {
      const { data: volunteers } = await supabase
        .from('profiles')
        .select('id, name, volunteer_status')
        .in('id', validVolIds)
        .eq('role', 'volunteer')
        .neq('volunteer_status', 'dnd');

      for (const v of (volunteers || [])) {
        await storeNotification({
          userId: v.id,
          type: NOTIFICATION_TYPES.NEW_REQUEST,
          title: `🙏 New Request from ${seniorName}`,
          body: `${serviceType} help needed at ${location}. Please accept or decline.`,
          requestId,
        });
        showBrowserNotification(`New Request — ${seniorName}`, `${serviceType} help needed. Tap to view.`);
      }
    }
  } catch (e) {
    console.warn('[notifyTrustedVolunteers] notify volunteers error:', e?.message);
  }

  // Update request lifecycle
  if (isUuid(requestId)) {
    try {
      await supabase.from('requests').update({
        lifecycle_status: 'notified_trusted',
        notified_at: new Date().toISOString(),
      }).eq('id', requestId);
    } catch (e) {}
  }
}

// ── Broadcast to ALL available volunteers in pincode ─────
export async function broadcastToNearbyVolunteers({ requestId, serviceType, seniorName, location, pincode }) {
  try {
    let query = supabase
      .from('profiles')
      .select('id, name')
      .eq('role', 'volunteer')
      .neq('volunteer_status', 'dnd')
      .eq('kyc_status', 'verified');

    if (pincode) {
      query = query.eq('pincode', pincode);
    }

    const { data: volunteers, error } = await query;
    if (error) {
      console.warn('[broadcastToNearbyVolunteers] Query note:', error.message);
      return;
    }

    for (const v of (volunteers || [])) {
      await storeNotification({
        userId: v.id,
        type: NOTIFICATION_TYPES.NEW_REQUEST,
        title: `🆘 Help Needed: ${seniorName}`,
        body: `${serviceType} request at ${location}. Be the first to accept!`,
        requestId,
      });
    }
  } catch (e) {
    console.warn('[broadcastToNearbyVolunteers] Exception:', e?.message);
  }
}

// ── Notify senior: request accepted ──────────────────────
export async function notifySeniorAccepted({ seniorId, volunteerName, requestId }) {
  await storeNotification({
    userId: seniorId,
    type: NOTIFICATION_TYPES.REQUEST_ACCEPTED,
    title: `✅ ${volunteerName} accepted your request!`,
    body: 'They are on their way to help you.',
    requestId,
  });
  showBrowserNotification(`${volunteerName} is coming!`, 'Your help request has been accepted.');
}

// ── Notify senior: volunteer on the way ──────────────────
export async function notifySeniorOnWay({ seniorId, volunteerName, requestId }) {
  await storeNotification({
    userId: seniorId,
    type: NOTIFICATION_TYPES.VOLUNTEER_ON_WAY,
    title: `🏃 ${volunteerName} is on the way!`,
    body: 'Please be ready with your 4-digit PIN.',
    requestId,
  });
}

// ── Notify senior: task completed, please rate ───────────
export async function notifySeniorRateTask({ seniorId, volunteerName, requestId }) {
  await storeNotification({
    userId: seniorId,
    type: NOTIFICATION_TYPES.RATING_REQUIRED,
    title: `⭐ How was ${volunteerName}?`,
    body: 'Please rate your experience to close this request.',
    requestId,
  });
}

// ── Notify admin about low-rated volunteer ───────────────
export async function notifyAdminLowRating({ adminId, volunteerName, avgRating }) {
  await storeNotification({
    userId: adminId,
    type: 'low_rating_alert',
    title: `⚠️ Low Rating Alert: ${volunteerName}`,
    body: `Average rating ${avgRating.toFixed(1)} in last 5 tasks. Please review.`,
  });
}
