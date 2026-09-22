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
  if (!Capacitor.isNativePlatform()) return null;
  if (PushNotifications) return PushNotifications;
  try {
    const cap = await import('@capacitor/push-notifications');
    PushNotifications = cap.PushNotifications;
    return PushNotifications;
  } catch {
    return null;
  }
}

export async function initPushNotifications(userId) {
  if (!Capacitor.isNativePlatform()) {
    // Web: register service worker for FCM / Web Push if available
    await registerWebPush(userId);
    return;
  }
  const Push = await getCapacitorPush();
  if (!Push) return;
  try {
    const perm = await Push.requestPermissions();
    if (perm.receive !== 'granted') return;
    await Push.register();
    Push.addListener('registration', async ({ value: token }) => {
      if (token && userId) {
        await supabase.from('profiles').update({ push_token: token }).eq('id', userId);
      }
    });
    Push.addListener('pushNotificationReceived', (notification) => {
      console.log('[Push] Received:', notification);
    });
    Push.addListener('pushNotificationActionPerformed', (action) => {
      console.log('[Push] Action:', action);
    });
  } catch (err) {
    console.warn('[Push] Capacitor push init failed:', err);
  }
}

async function registerWebPush(userId) {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted' || !userId) return;
    // Store web permission granted in profile
    await supabase.from('profiles').update({ push_token: 'web-' + userId }).eq('id', userId);
  } catch (err) {
    console.warn('[Push] Web push init:', err);
  }
}

// ── Store notification in DB (in-app bell) ────────────────
export async function storeNotification({ userId, type, title, body, requestId }) {
  if (!userId) return;
  const { error } = await supabase.from('notifications').insert([{
    user_id: userId,
    type,
    title,
    body,
    request_id: requestId || null,
    read: false,
  }]);
  if (error) console.warn('[Notification] Store error:', error);
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
export async function notifyTrustedVolunteers({ requestId, seniorId, serviceType, seniorName, location }) {
  // Fetch senior's preferred volunteers
  const { data: prefs } = await supabase
    .from('preferences')
    .select('target_user_id')
    .eq('user_id', seniorId)
    .eq('relationship', 'trusted');

  if (!prefs || prefs.length === 0) {
    // No trusted circle — broadcast immediately
    await broadcastToNearbyVolunteers({ requestId, serviceType, seniorName, location });
    return;
  }

  const volunteerIds = prefs.map(p => p.target_user_id);

  // Fetch volunteer profiles (check availability)
  const { data: volunteers } = await supabase
    .from('profiles')
    .select('id, name, volunteer_status')
    .in('id', volunteerIds)
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

  // Update request lifecycle
  await supabase.from('requests').update({
    lifecycle_status: 'notified_trusted',
    notified_at: new Date().toISOString(),
  }).eq('id', requestId);

  // Schedule broadcast after TRUSTED_NOTIFY_TIMEOUT_MINS (stored as a flag; polling handled by client)
  // We store the notified_at timestamp; the volunteer home polls and triggers broadcast if needed
}

// ── Broadcast to ALL available volunteers in pincode ─────
export async function broadcastToNearbyVolunteers({ requestId, serviceType, seniorName, location, pincode }) {
  const { data: volunteers } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('role', 'volunteer')
    .eq('pincode', pincode)
    .neq('volunteer_status', 'dnd')
    .eq('kyc_status', 'verified');

  for (const v of (volunteers || [])) {
    await storeNotification({
      userId: v.id,
      type: NOTIFICATION_TYPES.NEW_REQUEST,
      title: `🆘 Help Needed: ${seniorName}`,
      body: `${serviceType} request at ${location}. Be the first to accept!`,
      requestId,
    });
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
