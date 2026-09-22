import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  ROLES,
  REQUEST_STATUS,
  KYC_STATUS,
  SERVICE_TYPES,
  formatMinutes,
  MAX_ACTIVE_REQUESTS,
  TRUSTED_NOTIFY_TIMEOUT_MINS,
  LOW_RATING_THRESHOLD,
  LOW_RATING_WINDOW,
  normalizeRole,
  canPerformSevaAction,
} from '../constants';
import { supabase } from '../lib/supabase';
import {
  storeNotification,
  notifyTrustedVolunteers,
  broadcastToNearbyVolunteers,
  notifySeniorAccepted,
  notifySeniorOnWay,
  notifySeniorRateTask,
  notifyAdminLowRating,
  fetchNotifications,
  markNotificationsRead,
  initPushNotifications,
} from '../lib/notifications';
import { SEED_MEMBERS, SEED_REQUESTS, SEED_RATINGS } from '../lib/seedData';

const AppContext = createContext(null);

const getCachedUser = () => {
  try {
    const saved = localStorage.getItem('tb_user');
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    // Check 90-day session expiry
    if (parsed?.session_expires_at && new Date(parsed.session_expires_at) < new Date()) {
      localStorage.removeItem('tb_user');
      return null;
    }
    return parsed;
  } catch (e) {
    return null;
  }
};

export function AppProvider({ children }) {
  const cachedUser = getCachedUser();
  const [currentUser, setCurrentUser] = useState(cachedUser);
  const [isLoggedIn, setIsLoggedIn] = useState(!!cachedUser);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [seniorMode, setSeniorMode] = useState(cachedUser?.senior_mode || false);
  const [requests, setRequests] = useState(SEED_REQUESTS);
  const [ledger, setLedger] = useState({});
  const [pendingApprovals, setPendingApprovals] = useState(
    SEED_MEMBERS.filter((m) => m.kyc_status === KYC_STATUS.PENDING)
  );
  const [ratings, setRatings] = useState(SEED_RATINGS);
  const [members, setMembers] = useState(SEED_MEMBERS);
  const [activeSession, setActiveSession] = useState(null);
  const [sosVisible, setSosVisible] = useState(false);
  const [pendingRating, setPendingRating] = useState(null);
  const [loading, setLoading] = useState(!cachedUser);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Broadcast timer ref: after 15 mins if trusted notified, broadcast all
  const broadcastTimerRef = useRef({});

  // ── Fetch user profile ────────────────────────────────────
  const fetchProfile = useCallback(async (userId) => {
    if (!userId) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
      }
      if (data) {
        setCurrentUser(data);
        setSeniorMode(data.senior_mode || false);
        setIsLoggedIn(true);
        try {
          localStorage.setItem('tb_user', JSON.stringify(data));
        } catch (e) {}
        return data;
      }
    } catch (err) {
      console.error('Error in fetchProfile:', err);
    }
    return null;
  }, []);

  // ── Fetch all requests ────────────────────────────────────
  const fetchRequests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.warn('[fetchRequests] using cached/seed state:', error.message);
      } else if (data && data.length > 0) {
        const mapped = data.map((r) => ({
          id: r.id,
          seniorId: r.senior_id,
          seniorName: r.senior_name,
          serviceType: r.service_type,
          description: r.description,
          location: r.location,
          pincode: r.pincode,
          urgency: r.urgency,
          status: r.status,
          lifecycleStatus: r.lifecycle_status,
          assignedVolunteerId: r.assigned_volunteer_id,
          assignedVolunteerName: r.assigned_volunteer_name,
          sessionStartedAt: r.session_started_at,
          completedAt: r.completed_at,
          duration: r.duration,
          createdAt: r.created_at,
          isRecurring: r.is_recurring,
          recurrencePattern: r.recurrence_pattern,
          seriesId: r.series_id,
          createdByAdminId: r.created_by_admin_id,
          createdByAdminName: r.created_by_admin_name,
          notifiedAt: r.notified_at,
          scheduledDate: r.scheduled_date,
          scheduledTime: r.scheduled_time,
          estimatedDuration: r.estimated_duration,
        }));
        setRequests((prev) => {
          const remoteIds = new Set(mapped.map((m) => m.id));
          const nonDupes = prev.filter((p) => !remoteIds.has(p.id));
          return [...mapped, ...nonDupes];
        });

        // Check for any requests in 'notified_trusted' status that have passed timeout
        mapped.forEach((r) => {
          if (r.lifecycleStatus === 'notified_trusted' && r.notifiedAt) {
            const elapsed = (Date.now() - new Date(r.notifiedAt).getTime()) / 60000;
            if (elapsed >= TRUSTED_NOTIFY_TIMEOUT_MINS && !broadcastTimerRef.current[r.id]) {
              broadcastTimerRef.current[r.id] = true;
              broadcastToNearbyVolunteers({
                requestId: r.id,
                serviceType: r.serviceType,
                seniorName: r.seniorName,
                location: r.location,
                pincode: r.pincode,
              });
            }
          }
        });
      }
    } catch (err) {
      console.warn('[fetchRequests] note:', err.message);
    }
  }, []);

  // ── Fetch members ─────────────────────────────────────────
  const fetchMembers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.warn('Note fetching members:', error.message);
      } else if (data && data.length > 0) {
        setMembers((prev) => {
          const remoteIds = new Set(data.map((d) => d.id));
          const nonDupes = prev.filter((p) => !remoteIds.has(p.id));
          const merged = [...data, ...nonDupes];
          setPendingApprovals(merged.filter((m) => m.kyc_status === KYC_STATUS.PENDING));
          return merged;
        });
      }
    } catch (err) {
      console.warn('fetchMembers note:', err.message);
    }
  }, []);

  // ── Fetch ledger ──────────────────────────────────────────
  const fetchUserLedger = useCallback(async (userId) => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('ledger_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching ledger:', error);
      } else if (data) {
        setLedger((prev) => ({
          ...prev,
          [userId]: data.map((t) => ({
            id: t.id,
            type: t.type,
            minutes: t.minutes,
            label: t.label,
            service: t.service,
            counterpartyId: t.counterparty_id,
            counterpartyName: t.counterparty_name,
            date: t.created_at,
            balance: t.balance,
          })),
        }));
      }
    } catch (err) {
      console.error('Error in fetchUserLedger:', err);
    }
  }, []);

  // ── Fetch notifications ───────────────────────────────────
  const fetchUserNotifications = useCallback(async (userId) => {
    if (!userId) return;
    const notifs = await fetchNotifications(userId);
    setNotifications(notifs);
    setUnreadCount(notifs.filter((n) => !n.read).length);
  }, []);

  const markNotificationsAsRead = useCallback(async () => {
    if (!currentUser?.id) return;
    await markNotificationsRead(currentUser.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, [currentUser]);

  // ── Auth state listeners ──────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchUserLedger(session.user.id);
        fetchUserNotifications(session.user.id);
        initPushNotifications(session.user.id).catch(() => {});
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchUserLedger(session.user.id);
        fetchUserNotifications(session.user.id);
        initPushNotifications(session.user.id).catch(() => {});
      } else if (event === 'SIGNED_OUT') {
        try { localStorage.removeItem('tb_user'); } catch (e) {}
        setCurrentUser(null);
        setIsLoggedIn(false);
        setNotifications([]);
        setUnreadCount(0);
      }
    });

    fetchRequests();
    fetchMembers();

    // Realtime subscriptions
    const realtimeChannel = supabase
      .channel('public:all_tables')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => {
        fetchRequests();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchMembers();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        // Add to notifications if it's for current user
        setNotifications((prev) => [payload.new, ...prev]);
        setUnreadCount((c) => c + 1);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(realtimeChannel);
    };
  }, [fetchProfile, fetchRequests, fetchMembers, fetchUserLedger, fetchUserNotifications]);

  // ── Login ─────────────────────────────────────────────────
  const login = useCallback((user) => {
    if (user) {
      // Set 90-day expiry
      const expires = new Date();
      expires.setDate(expires.getDate() + 90);
      const userWithExpiry = { ...user, session_expires_at: expires.toISOString() };
      setCurrentUser(userWithExpiry);
      setSeniorMode(user.senior_mode || user.seniorMode || false);
      setIsLoggedIn(true);
      try {
        localStorage.setItem('tb_user', JSON.stringify(userWithExpiry));
      } catch (e) {}
      fetchUserLedger(user.id);
      fetchUserNotifications(user.id);
      initPushNotifications(user.id).catch(() => {});
    }
  }, [fetchUserLedger, fetchUserNotifications]);

  // ── Logout ────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      localStorage.removeItem('tb_user');
      await supabase.auth.signOut();
    } catch (e) {}
    setCurrentUser(null);
    setIsLoggedIn(false);
    setSeniorMode(false);
    setActiveSession(null);
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // ── Switch Role ───────────────────────────────────────────
  const switchRole = useCallback(async (newRole) => {
    if (!currentUser?.id) return;
    const roles = currentUser.roles || [currentUser.role || 'senior'];
    if (!roles.includes(newRole)) return;

    await supabase.from('profiles').update({ active_role: newRole, role: newRole }).eq('id', currentUser.id);
    const updated = { ...currentUser, role: newRole, active_role: newRole };
    setCurrentUser(updated);
    try { localStorage.setItem('tb_user', JSON.stringify(updated)); } catch (e) {}
  }, [currentUser]);

  // ── Add Role ──────────────────────────────────────────────
  const addRole = useCallback(async (newRole) => {
    if (!currentUser?.id) return;
    const existingRoles = currentUser.roles || [currentUser.role];
    if (existingRoles.includes(newRole)) return;
    const updatedRoles = [...existingRoles, newRole];
    await supabase.from('profiles').update({ roles: updatedRoles }).eq('id', currentUser.id);
    const updated = { ...currentUser, roles: updatedRoles };
    setCurrentUser(updated);
    try { localStorage.setItem('tb_user', JSON.stringify(updated)); } catch (e) {}
  }, [currentUser]);

  // ── Senior Mode Toggle ────────────────────────────────────
  const toggleSeniorMode = useCallback(async () => {
    const nextMode = !seniorMode;
    setSeniorMode(nextMode);
    if (currentUser?.id) {
      await supabase.from('profiles').update({ senior_mode: nextMode }).eq('id', currentUser.id);
      setCurrentUser((prev) => prev ? { ...prev, senior_mode: nextMode } : prev);
    }
  }, [seniorMode, currentUser]);

  // ── Set / Update User 4-Digit Quick PIN ────────────────────
  const setUserPin = useCallback(async (pin) => {
    if (!currentUser?.id) return;
    const cleanPin = String(pin).replace(/\D/g, '').slice(0, 4);
    if (cleanPin.length !== 4) throw new Error('PIN must be exactly 4 digits');

    await supabase.from('profiles').update({ pin: cleanPin }).eq('id', currentUser.id);
    setCurrentUser((prev) => prev ? { ...prev, pin: cleanPin } : prev);
    try {
      const stored = JSON.parse(localStorage.getItem('tb_user') || '{}');
      localStorage.setItem('tb_user', JSON.stringify({ ...stored, pin: cleanPin }));
    } catch (e) {}
  }, [currentUser]);

  // ── Login with Quick PIN for Returning Users ──────────────
  const loginWithPin = useCallback(async (phone, pin) => {
    const cleanDigits = String(phone).replace(/\D/g, '');
    const clean10 = cleanDigits.length === 12 && cleanDigits.startsWith('91') ? cleanDigits.slice(2) : cleanDigits;
    const fullPhone = `+91${clean10}`;
    const cleanPin = String(pin).replace(/\D/g, '').slice(0, 4);

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone', fullPhone)
      .eq('pin', cleanPin)
      .maybeSingle();

    if (error || !profile) {
      throw new Error('Incorrect 4-digit PIN or phone number not found.');
    }

    login(profile);
    return profile;
  }, [login]);

  // ── Create Request (one-time or recurring) ────────────────
  const createRequest = useCallback(async (requestData) => {
    const seniorId = requestData.seniorId || currentUser?.id;
    const seniorName = requestData.seniorName || currentUser?.name || 'Anonymous Senior';
    const isAdminCreation = Boolean(requestData.createdByAdminId);

    // Only enforce active request limit for non-admin creation
    if (!isAdminCreation) {
      const myActive = requests.filter(
        (r) => r.seniorId === seniorId && [REQUEST_STATUS.OPEN, REQUEST_STATUS.ACCEPTED, REQUEST_STATUS.IN_PROGRESS].includes(r.status)
      );
      if (myActive.length >= MAX_ACTIVE_REQUESTS) {
        throw new Error(`You can only have ${MAX_ACTIVE_REQUESTS} active requests at a time.`);
      }
    }

    const isUuid = (id) =>
      typeof id === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const validSeniorId = isUuid(seniorId) ? seniorId : null;
    const validAdminId = isUuid(requestData.createdByAdminId) ? requestData.createdByAdminId : null;

    // ── Recurring logic ──────────────────────────────────────
    if (requestData.isRecurring && requestData.recurrencePattern) {
      return await createRecurringSeries(requestData, validSeniorId);
    }

    const initialStatus = requestData.sendToTrustedFirst ? REQUEST_STATUS.NOTIFIED_TRUSTED : REQUEST_STATUS.OPEN;
    const initialLifecycle = requestData.sendToTrustedFirst ? 'notified_trusted' : 'created';

    // ── One-time request ──────────────────────────────────────
    const payload = {
      senior_id: validSeniorId,
      senior_name: seniorName,
      service_type: requestData.serviceType,
      description: requestData.description,
      location: requestData.location || currentUser?.area || 'Local Area',
      pincode: requestData.pincode || currentUser?.pincode || '400001',
      urgency: requestData.urgency || 'normal',
      status: initialStatus,
      lifecycle_status: initialLifecycle,
      created_by_admin_id: validAdminId,
      created_by_admin_name: requestData.createdByAdminName || null,
    };

    let inserted = null;
    try {
      const { data, error } = await supabase.from('requests').insert([payload]).select().single();
      if (error) {
        // If foreign key constraint failed (status 409 or code 23503), retry without foreign key references
        if (error.code === '23503' || error.status === 409 || error.message?.includes('foreign key') || error.message?.includes('violates')) {
          console.warn('[createRequest] Foreign key conflict in profiles, inserting with decoupled references');
          const fallbackPayload = { ...payload, senior_id: null, created_by_admin_id: null };
          const { data: fbData, error: fbErr } = await supabase.from('requests').insert([fallbackPayload]).select().single();
          if (!fbErr && fbData) {
            inserted = fbData;
          }
        } else {
          console.warn('[createRequest] note:', error.message);
        }
      } else {
        inserted = data;
      }
    } catch (e) {
      console.warn('[createRequest] exception:', e?.message);
    }

    const formatted = {
      id: inserted?.id || `req-${Date.now()}`,
      seniorId: seniorId,
      seniorName: seniorName,
      serviceType: requestData.serviceType,
      description: requestData.description,
      location: requestData.location || currentUser?.area || 'Local Area',
      pincode: requestData.pincode || currentUser?.pincode || '400001',
      urgency: requestData.urgency || 'normal',
      status: initialStatus,
      lifecycleStatus: initialLifecycle,
      scheduledDate: requestData.scheduledDate || 'Today',
      scheduledTime: requestData.scheduledTime || '',
      estimatedDuration: requestData.estimatedDuration || 30,
      createdAt: inserted?.created_at || new Date().toISOString(),
      createdByAdminId: requestData.createdByAdminId,
      createdByAdminName: requestData.createdByAdminName,
    };

    setRequests((prev) => [formatted, ...prev]);

    // Trigger notifications
    if (initialStatus === REQUEST_STATUS.NOTIFIED_TRUSTED) {
      await notifyTrustedVolunteers({
        requestId: formatted.id,
        seniorId: seniorId,
        serviceType: requestData.serviceType,
        seniorName: seniorName,
        location: formatted.location,
        pincode: formatted.pincode,
      });

      // 15-minute fallback broadcast if still in notified_trusted
      setTimeout(() => {
        setRequests((current) => {
          const existing = current.find((r) => r.id === formatted.id);
          if (existing && existing.status === REQUEST_STATUS.NOTIFIED_TRUSTED) {
            broadcastToNearbyVolunteers({
              requestId: formatted.id,
              serviceType: formatted.serviceType,
              seniorName: formatted.seniorName,
              location: formatted.location,
              pincode: formatted.pincode,
            });
            return current.map((r) =>
              r.id === formatted.id ? { ...r, status: REQUEST_STATUS.OPEN, lifecycleStatus: 'created' } : r
            );
          }
          return current;
        });
      }, TRUSTED_NOTIFY_TIMEOUT_MINS * 60 * 1000);
    } else {
      await broadcastToNearbyVolunteers({
        requestId: formatted.id,
        serviceType: requestData.serviceType,
        seniorName: seniorName,
        location: formatted.location,
        pincode: formatted.pincode,
      });
    }

    return formatted;
  }, [currentUser, requests]);

  // ── Create Recurring Series ───────────────────────────────
  const createRecurringSeries = useCallback(async (requestData, seniorId) => {
    const isUuid = (id) =>
      typeof id === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const validSeniorId = isUuid(seniorId) ? seniorId : null;
    const { recurrencePattern } = requestData;
    const { days, time, fromDate, toDate } = recurrencePattern;

    let seriesId = crypto.randomUUID();
    try {
      // Create series record
      const { data: series, error } = await supabase.from('request_series').insert([{
        created_by: validSeniorId,
        service_type: requestData.serviceType,
        description: requestData.description,
        location: requestData.location,
        pincode: requestData.pincode || currentUser?.pincode,
        urgency: requestData.urgency,
        pattern: recurrencePattern,
      }]).select().single();

      if (!error && series?.id) {
        seriesId = series.id;
      }
    } catch (e) {
      console.warn('[createRecurringSeries] Series note:', e?.message);
    }

    // Generate all dates in the range matching the selected days
    const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const [hours, minutes] = (time || '09:00').split(':').map(Number);

    const instances = [];
    const current = new Date(from);
    while (current <= to) {
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][current.getDay()];
      if (days.includes(dayName)) {
        const scheduledTime = new Date(current);
        scheduledTime.setHours(hours, minutes, 0, 0);
        instances.push({
          senior_id: validSeniorId,
          senior_name: currentUser?.name || 'Anonymous Senior',
          service_type: requestData.serviceType,
          description: `${requestData.description} (Recurring - ${dayName})`,
          location: requestData.location || currentUser?.area || 'Local Area',
          pincode: requestData.pincode || currentUser?.pincode || '400001',
          urgency: requestData.urgency || 'normal',
          status: REQUEST_STATUS.OPEN,
          lifecycle_status: 'created',
          is_recurring: true,
          recurrence_pattern: recurrencePattern,
          series_id: seriesId,
        });
      }
      current.setDate(current.getDate() + 1);
    }

    if (instances.length > 0) {
      let inserted = null;
      try {
        const { data, error } = await supabase.from('requests').insert(instances).select();
        if (error && (error.code === '23503' || error.status === 409)) {
          const fallbackInstances = instances.map((inst) => ({ ...inst, senior_id: null, series_id: null }));
          const { data: fbData } = await supabase.from('requests').insert(fallbackInstances).select();
          inserted = fbData;
        } else {
          inserted = data;
        }
      } catch (e) {
        console.warn('[createRecurringSeries] insert note:', e?.message);
      }
      if (inserted) {
        const formatted = inserted.map((r) => ({
          id: r.id,
          seniorId: r.senior_id,
          seniorName: r.senior_name,
          serviceType: r.service_type,
          description: r.description,
          location: r.location,
          pincode: r.pincode,
          urgency: r.urgency,
          status: r.status,
          lifecycleStatus: r.lifecycle_status,
          createdAt: r.created_at,
          isRecurring: true,
          seriesId,
        }));
        setRequests((prev) => [...formatted, ...prev]);
        return { series: formatted, seriesId, count: formatted.length };
      }
    }
    return { seriesId, count: 0 };
  }, [currentUser]);

  // ── Accept Request ────────────────────────────────────────
  const acceptRequest = useCallback(async (requestId) => {
    if (!canPerformSevaAction(currentUser, 'accept_task')) {
      alert('Identity Verification Pending: Your KYC is currently under review by your Pincode Admin. You will be able to accept requests once verified.');
      return;
    }

    const req = requests.find((r) => r.id === requestId);
    await supabase.from('requests').update({
      status: REQUEST_STATUS.ACCEPTED,
      assigned_volunteer_id: currentUser?.id,
      assigned_volunteer_name: currentUser?.name,
      lifecycle_status: 'accepted',
    }).eq('id', requestId);

    setRequests((prev) =>
      prev.map((r) => r.id === requestId
        ? { ...r, status: REQUEST_STATUS.ACCEPTED, assignedVolunteerId: currentUser?.id, assignedVolunteerName: currentUser?.name, lifecycleStatus: 'accepted' }
        : r
      )
    );

    // Notify senior
    if (req?.seniorId) {
      await notifySeniorAccepted({
        seniorId: req.seniorId,
        volunteerName: currentUser?.name,
        requestId,
      });
    }
  }, [currentUser, requests]);

  // ── Start Session ─────────────────────────────────────────
  const startSession = useCallback(async (requestId) => {
    if (!canPerformSevaAction(currentUser, 'start_task')) {
      alert('Identity verification required before starting a task session.');
      return;
    }

    const startTime = new Date();
    setActiveSession({ requestId, startTime, elapsed: 0 });

    const req = requests.find((r) => r.id === requestId);
    await supabase.from('requests').update({
      status: REQUEST_STATUS.IN_PROGRESS,
      session_started_at: startTime.toISOString(),
      lifecycle_status: 'in_progress',
    }).eq('id', requestId);

    setRequests((prev) =>
      prev.map((r) => r.id === requestId
        ? { ...r, status: REQUEST_STATUS.IN_PROGRESS, sessionStartedAt: startTime.toISOString(), lifecycleStatus: 'in_progress' }
        : r
      )
    );

    // Notify senior: volunteer on the way
    if (req?.seniorId) {
      await notifySeniorOnWay({ seniorId: req.seniorId, volunteerName: currentUser?.name, requestId });
    }
  }, [requests, currentUser]);

  // ── End Session (Pure Seva Model: logs seva contribution) ──
  const endSession = useCallback(async (requestId) => {
    if (!activeSession) return;
    const endTime = new Date();
    const durationMinutes = Math.max(1, Math.round((endTime - new Date(activeSession.startTime)) / 60000));

    await supabase.from('requests').update({
      status: REQUEST_STATUS.COMPLETED,
      completed_at: endTime.toISOString(),
      duration: durationMinutes,
      lifecycle_status: 'completed',
    }).eq('id', requestId);

    setRequests((prev) =>
      prev.map((r) => r.id === requestId
        ? { ...r, status: REQUEST_STATUS.COMPLETED, completedAt: endTime.toISOString(), duration: durationMinutes, lifecycleStatus: 'completed' }
        : r
      )
    );

    const req = requests.find((r) => r.id === requestId);

    if (req && currentUser) {
      // Pure Seva: record volunteer's seva contribution without deducting anything from senior
      const currentSeva = (currentUser.total_seva_minutes ?? currentUser.time_balance ?? currentUser.timeBalance ?? 0);
      const newTotalSevaMinutes = currentSeva + durationMinutes;

      await supabase.from('ledger_transactions').insert([{
        user_id: currentUser.id,
        type: 'seva_completed',
        minutes: durationMinutes,
        label: `Seva: ${req.serviceType} for ${req.seniorName}`,
        service: req.serviceType,
        counterparty_id: req.seniorId,
        counterparty_name: req.seniorName,
        balance: newTotalSevaMinutes,
      }]);

      await supabase.from('profiles').update({ time_balance: newTotalSevaMinutes }).eq('id', currentUser.id);
      setCurrentUser((prev) => prev ? {
        ...prev,
        time_balance: newTotalSevaMinutes,
        timeBalance: newTotalSevaMinutes,
        total_seva_minutes: newTotalSevaMinutes,
        totalSevaMinutes: newTotalSevaMinutes,
      } : prev);
      fetchUserLedger(currentUser.id);

      // Notify senior to rate
      if (req.seniorId) {
        await notifySeniorRateTask({ seniorId: req.seniorId, volunteerName: currentUser.name, requestId });
      }
    }

    setActiveSession(null);
    setPendingRating({ requestId, role: currentUser?.role });
  }, [activeSession, currentUser, requests, fetchUserLedger]);

  // ── Cancel Request (Admin or Senior) ───────────────────────
  const cancelRequest = useCallback(async (requestId) => {
    await supabase.from('requests').update({
      status: REQUEST_STATUS.CANCELLED,
      lifecycle_status: 'cancelled',
    }).eq('id', requestId);

    setRequests((prev) =>
      prev.map((r) => r.id === requestId
        ? { ...r, status: REQUEST_STATUS.CANCELLED, lifecycleStatus: 'cancelled' }
        : r
      )
    );
  }, []);

  // ── Reassign Request (Admin) ──────────────────────────────
  const reassignRequest = useCallback(async (requestId, volunteerId, volunteerName) => {
    await supabase.from('requests').update({
      assigned_volunteer_id: volunteerId || null,
      assigned_volunteer_name: volunteerName || null,
      status: volunteerId ? REQUEST_STATUS.ACCEPTED : REQUEST_STATUS.OPEN,
      lifecycle_status: volunteerId ? 'accepted' : 'created',
    }).eq('id', requestId);

    setRequests((prev) =>
      prev.map((r) => r.id === requestId
        ? {
            ...r,
            assignedVolunteerId: volunteerId || null,
            assignedVolunteerName: volunteerName || null,
            status: volunteerId ? REQUEST_STATUS.ACCEPTED : REQUEST_STATUS.OPEN,
            lifecycleStatus: volunteerId ? 'accepted' : 'created',
          }
        : r
      )
    );
  }, []);

  // ── Edit Request (Admin) ──────────────────────────────────
  const editRequest = useCallback(async (requestId, updates) => {
    try {
      const payload = {};
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.serviceType !== undefined) payload.service_type = updates.serviceType;
      if (updates.urgency !== undefined) payload.urgency = updates.urgency;
      if (updates.location !== undefined) payload.location = updates.location;
      if (updates.scheduledDate !== undefined) payload.scheduled_date = updates.scheduledDate;
      if (updates.scheduledTime !== undefined) payload.scheduled_time = updates.scheduledTime;
      if (updates.estimatedDuration !== undefined) payload.estimated_duration = updates.estimatedDuration;
      await supabase.from('requests').update(payload).eq('id', requestId);
    } catch (e) {
      console.warn('[editRequest] notice:', e.message);
    }

    setRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, ...updates } : r))
    );
  }, []);

  // ── Cancel Recurring Series ───────────────────────────────
  const cancelSeries = useCallback(async (seriesId) => {
    await supabase.from('requests')
      .update({ status: REQUEST_STATUS.CANCELLED })
      .eq('series_id', seriesId)
      .eq('status', REQUEST_STATUS.OPEN);
    await fetchRequests();
  }, [fetchRequests]);

  // ── Approve / Reject User ─────────────────────────────────
  const approveUser = useCallback(async (pendingId) => {
    await supabase.from('profiles').update({ kyc_status: KYC_STATUS.VERIFIED }).eq('id', pendingId);
    await storeNotification({
      userId: pendingId,
      type: 'kyc_approved',
      title: 'Your account is verified!',
      body: 'Welcome to Time Bank of India. You can now create and accept requests.',
    });
    setPendingApprovals((prev) => prev.filter((p) => p.id !== pendingId));
    setMembers((prev) => prev.map((m) => m.id === pendingId ? { ...m, kyc_status: KYC_STATUS.VERIFIED } : m));
    fetchMembers();
  }, [fetchMembers]);

  const rejectUser = useCallback(async (pendingId) => {
    await supabase.from('profiles').update({ kyc_status: KYC_STATUS.REJECTED }).eq('id', pendingId);
    setPendingApprovals((prev) => prev.filter((p) => p.id !== pendingId));
    setMembers((prev) => prev.map((m) => m.id === pendingId ? { ...m, kyc_status: KYC_STATUS.REJECTED } : m));
    fetchMembers();
  }, [fetchMembers]);

  const blockUser = useCallback(async (userId) => {
    await supabase.from('profiles').update({ is_blocked: true }).eq('id', userId);
    setMembers((prev) => prev.map((m) => m.id === userId ? { ...m, is_blocked: true } : m));
    fetchMembers();
  }, [fetchMembers]);

  const unblockUser = useCallback(async (userId) => {
    await supabase.from('profiles').update({ is_blocked: false }).eq('id', userId);
    setMembers((prev) => prev.map((m) => m.id === userId ? { ...m, is_blocked: false } : m));
    fetchMembers();
  }, [fetchMembers]);

  // ── Approve Pincode Admin Role ────────────────────────────
  const approvePincodeAdmin = useCallback(async (userId) => {
    try {
      const { data: profile } = await supabase.from('profiles').select('roles').eq('id', userId).single();
      const roles = profile?.roles || ['admin'];
      await supabase.from('profiles').update({
        pincode_admin_approved: true,
        roles: [...new Set([...roles, 'admin'])],
      }).eq('id', userId);
    } catch (e) {
      console.warn('[approvePincodeAdmin] notice:', e.message);
    }
    setMembers((prev) =>
      prev.map((m) => m.id === userId
        ? { ...m, pincode_admin_approved: true, roles: [...new Set([...(m.roles || []), 'admin'])] }
        : m
      )
    );
    fetchMembers();
  }, [fetchMembers]);

  // ── Submit Rating ─────────────────────────────────────────
  const submitRating = useCallback(async ({ requestId, stars, review, revieweeId, revieweeName, tags, voiceFeedbackUrl, photoUrl }) => {
    const { data } = await supabase.from('ratings').insert([{
      request_id: requestId,
      reviewer_id: currentUser?.id,
      reviewer_name: currentUser?.name,
      reviewee_id: revieweeId,
      reviewee_name: revieweeName,
      stars,
      review,
      tags: tags || [],
      voice_feedback_url: voiceFeedbackUrl || null,
      photo_url: photoUrl || null,
    }]).select().single();

    // Update request status to RATED
    await supabase.from('requests').update({
      status: REQUEST_STATUS.RATED,
      lifecycle_status: 'rated',
      rated_at: new Date().toISOString(),
    }).eq('id', requestId);

    setRequests((prev) =>
      prev.map((r) => r.id === requestId ? { ...r, status: REQUEST_STATUS.RATED, lifecycleStatus: 'rated' } : r)
    );

    if (data) {
      setRatings((prev) => [...prev, data]);

      // Check if volunteer's last 5 avg rating < LOW_RATING_THRESHOLD
      if (revieweeId && currentUser?.role !== 'volunteer') {
        const { data: recentRatings } = await supabase
          .from('ratings')
          .select('stars')
          .eq('reviewee_id', revieweeId)
          .order('created_at', { ascending: false })
          .limit(LOW_RATING_WINDOW);

        if (recentRatings && recentRatings.length >= LOW_RATING_WINDOW) {
          const avg = recentRatings.reduce((s, r) => s + r.stars, 0) / recentRatings.length;
          if (avg < LOW_RATING_THRESHOLD) {
            // Find admin for this pincode
            const req = requests.find((r) => r.id === requestId);
            if (req?.pincode) {
              const { data: admins } = await supabase
                .from('profiles')
                .select('id')
                .eq('role', 'admin')
                .eq('pincode', req.pincode);
              for (const admin of (admins || [])) {
                await notifyAdminLowRating({ adminId: admin.id, volunteerName: revieweeName, avgRating: avg });
              }
            }
          }
        }
      }
    }

    setPendingRating(null);
  }, [currentUser, requests]);

  const dismissRating = useCallback(() => {
    setPendingRating(null);
  }, []);

  // ── Close Request (RATED -> CLOSED) ───────────────────────
  const closeRequest = useCallback(async (requestId) => {
    try {
      await supabase.from('requests').update({
        status: REQUEST_STATUS.CLOSED,
        lifecycle_status: 'closed',
      }).eq('id', requestId);
    } catch (e) {
      console.error('[closeRequest] error:', e);
    }

    setRequests((prev) =>
      prev.map((r) => r.id === requestId
        ? { ...r, status: REQUEST_STATUS.CLOSED, lifecycleStatus: 'closed' }
        : r
      )
    );
  }, []);

  // ── Preferred Circle ──────────────────────────────────────
  const addToTrustedCircle = useCallback(async (targetMemberOrId) => {
    if (!currentUser?.id) return;
    const targetId = typeof targetMemberOrId === 'object' && targetMemberOrId ? targetMemberOrId.id : targetMemberOrId;
    const targetObj = typeof targetMemberOrId === 'object' && targetMemberOrId
      ? targetMemberOrId
      : members.find((m) => m.id === targetId) || { id: targetId, name: 'Member', role: 'volunteer' };

    // 1. Immediately persist to localStorage for zero-latency UI
    try {
      const key = `tb_trusted_${currentUser.id}`;
      const stored = JSON.parse(localStorage.getItem(key) || '[]');
      const exists = stored.some((item) => (typeof item === 'object' ? item.id === targetId : item === targetId));
      if (!exists) {
        const updated = [...stored, targetObj];
        localStorage.setItem(key, JSON.stringify(updated));
      }
    } catch (e) {}

    // 2. Safely sync to Supabase if valid UUID
    const isUuid = (id) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUuid(currentUser.id) && isUuid(targetId)) {
      try {
        await supabase.from('preferences').upsert([{
          user_id: currentUser.id,
          target_user_id: targetId,
          relationship: 'trusted',
        }]);
      } catch (e) {
        console.warn('[addToTrustedCircle] Supabase sync skipped:', e?.message);
      }
    }
  }, [currentUser?.id, members]);

  const removeFromTrustedCircle = useCallback(async (targetUserId) => {
    if (!currentUser?.id) return;
    // 1. Immediately update localStorage
    try {
      const key = `tb_trusted_${currentUser.id}`;
      const stored = JSON.parse(localStorage.getItem(key) || '[]');
      const filtered = stored.filter((item) => (typeof item === 'object' ? item.id !== targetUserId : item !== targetUserId));
      localStorage.setItem(key, JSON.stringify(filtered));
    } catch (e) {}

    // 2. Safely delete from Supabase if valid UUID
    const isUuid = (id) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUuid(currentUser.id) && isUuid(targetUserId)) {
      try {
        await supabase.from('preferences').delete()
          .eq('user_id', currentUser.id)
          .eq('target_user_id', targetUserId);
      } catch (e) {
        console.warn('[removeFromTrustedCircle] Supabase delete note:', e?.message);
      }
    }
  }, [currentUser?.id]);

  const getTrustedCircle = useCallback(async () => {
    if (!currentUser?.id) return [];
    const isUuid = (id) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    // Read local cache first
    let localCircle = [];
    try {
      const stored = localStorage.getItem(`tb_trusted_${currentUser.id}`);
      if (stored) {
        localCircle = JSON.parse(stored);
      }
    } catch (e) {}

    // If currentUser.id is a valid UUID, attempt to sync with Supabase preferences
    if (isUuid(currentUser.id)) {
      try {
        const { data, error } = await supabase
          .from('preferences')
          .select('target_user_id')
          .eq('user_id', currentUser.id)
          .eq('relationship', 'trusted');

        if (!error && data && data.length > 0) {
          const targetIds = new Set(data.map((p) => p.target_user_id));
          const resolved = members.filter((m) => targetIds.has(m.id));
          if (resolved.length > 0) {
            try {
              localStorage.setItem(`tb_trusted_${currentUser.id}`, JSON.stringify(resolved));
            } catch (e) {}
            return resolved;
          }
        }
      } catch (err) {
        // Fall back gracefully to localCircle
      }
    }

    // Return locally stored circle or find matching members
    if (Array.isArray(localCircle) && localCircle.length > 0) {
      const resolvedLocal = localCircle.map((item) => {
        if (typeof item === 'object' && item?.id) return item;
        return members.find((m) => m.id === item);
      }).filter(Boolean);
      return resolvedLocal;
    }

    return [];
  }, [currentUser?.id, members]);

  // ── Volunteer Status ──────────────────────────────────────
  const updateVolunteerStatus = useCallback(async (status) => {
    if (!currentUser?.id) return;
    await supabase.from('profiles').update({ volunteer_status: status }).eq('id', currentUser.id);
    setCurrentUser((prev) => prev ? { ...prev, volunteer_status: status } : prev);
  }, [currentUser]);

  // ── Leaderboard ───────────────────────────────────────────
  const fetchLeaderboard = useCallback(async ({ pincode, period = 'all' } = {}) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const volunteerMap = new Map();
    members.forEach((m) => {
      const isVol = m.role === ROLES.VOLUNTEER || (m.roles || []).includes(ROLES.VOLUNTEER);
      if (isVol && !m.is_blocked && !m.hide_from_leaderboard) {
        volunteerMap.set(m.id, {
          id: m.id,
          name: m.name,
          area: m.area || 'Local Area',
          pincode: m.pincode || '400001',
          total_seva_minutes: 0,
          tasks_completed: 0,
        });
      }
    });

    if (currentUser && (currentUser.role === ROLES.VOLUNTEER || (currentUser.roles || []).includes(ROLES.VOLUNTEER))) {
      if (!volunteerMap.has(currentUser.id)) {
        volunteerMap.set(currentUser.id, {
          id: currentUser.id,
          name: currentUser.name,
          area: currentUser.area || 'Local Area',
          pincode: currentUser.pincode || '400001',
          total_seva_minutes: 0,
          tasks_completed: 0,
        });
      }
    }

    const completedReqs = requests.filter((r) => {
      const isCompleted = [REQUEST_STATUS.COMPLETED, REQUEST_STATUS.RATED, REQUEST_STATUS.CLOSED].includes(r.status);
      if (!isCompleted) return false;

      const dateStr = r.completedAt || r.completed_at || r.createdAt || r.created_at;
      if (!dateStr) return true;
      const d = new Date(dateStr);

      if (period === 'month') {
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }
      if (period === 'year') {
        return d.getFullYear() === currentYear;
      }
      return true;
    });

    completedReqs.forEach((r) => {
      const volId = r.assignedVolunteerId || r.assigned_volunteer_id;
      if (volId && volunteerMap.has(volId)) {
        const entry = volunteerMap.get(volId);
        entry.total_seva_minutes += (r.duration || 60);
        entry.tasks_completed += 1;
      }
    });

    const results = Array.from(volunteerMap.values()).map((v) => {
      const volRatings = ratings.filter((rat) => rat.reviewee_id === v.id || rat.revieweeId === v.id);
      const avg = volRatings.length > 0
        ? (volRatings.reduce((s, rat) => s + rat.stars, 0) / volRatings.length)
        : null;
      return {
        ...v,
        time_balance: v.total_seva_minutes,
        totalSevaMinutes: v.total_seva_minutes,
        tasksCompleted: v.tasks_completed,
        rating: avg,
        reviewCount: volRatings.length,
      };
    });

    let filtered = results;
    if (pincode) {
      filtered = filtered.filter((v) => v.pincode === pincode);
    }

    filtered.sort((a, b) => b.totalSevaMinutes - a.totalSevaMinutes || b.tasksCompleted - a.tasksCompleted);
    return filtered;
  }, [members, currentUser, requests, ratings]);

  // ── Selectors ─────────────────────────────────────────────
  const getUserLedger = useCallback(
    (userId) => ledger[userId || currentUser?.id] || [],
    [ledger, currentUser]
  );

  const getActiveRequest = useCallback(() => {
    if (!activeSession) return null;
    return requests.find((r) => r.id === activeSession.requestId) || null;
  }, [activeSession, requests]);

  const getUserRequests = useCallback(
    (userId) => requests.filter((r) => r.seniorId === (userId || currentUser?.id)),
    [requests, currentUser]
  );

  const getOpenRequests = useCallback(
    () => requests.filter((r) => r.status === REQUEST_STATUS.OPEN || r.status === REQUEST_STATUS.NOTIFIED_TRUSTED),
    [requests]
  );

  const getUserRatings = useCallback(
    (userId) => ratings.filter((r) => r.reviewee_id === (userId || currentUser?.id)),
    [ratings, currentUser]
  );

  const getVolunteerActiveRequest = useCallback(() => {
    if (!currentUser) return null;
    return (
      requests.find(
        (r) => r.assignedVolunteerId === currentUser.id && r.status === REQUEST_STATUS.IN_PROGRESS
      ) || null
    );
  }, [requests, currentUser]);

  // ── Unified Volunteer Metrics (Single coherent source of truth) ──
  const getVolunteerMetrics = useCallback((volunteerId) => {
    const volId = volunteerId || currentUser?.id;
    if (!volId) {
      return {
        totalSevaMinutes: 0,
        tasksCompleted: 0,
        peopleHelped: 0,
        thisMonthTasks: 0,
        thisMonthMinutes: 0,
        avgRating: null,
        reviewCount: 0,
        completedTasks: [],
      };
    }

    const completedTasks = requests.filter(
      (r) => (r.assignedVolunteerId === volId || r.assigned_volunteer_id === volId) &&
        [REQUEST_STATUS.COMPLETED, REQUEST_STATUS.RATED, REQUEST_STATUS.CLOSED].includes(r.status)
    );

    const tasksCompleted = completedTasks.length;
    const totalSevaMinutes = completedTasks.reduce((sum, r) => sum + (r.duration || 60), 0);

    const uniquePeople = new Set(
      completedTasks.map((r) => r.seniorId || r.senior_id || r.seniorName).filter(Boolean)
    );
    const peopleHelped = uniquePeople.size;

    const now = new Date();
    const thisMonthCompleted = completedTasks.filter((r) => {
      const d = new Date(r.completedAt || r.completed_at || r.createdAt || r.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const thisMonthTasks = thisMonthCompleted.length;
    const thisMonthMinutes = thisMonthCompleted.reduce((sum, r) => sum + (r.duration || 60), 0);

    const volRatings = ratings.filter((r) => r.reviewee_id === volId || r.revieweeId === volId);
    const reviewCount = volRatings.length;
    const avgRating = reviewCount > 0
      ? (volRatings.reduce((sum, r) => sum + r.stars, 0) / reviewCount).toFixed(1)
      : null;

    return {
      totalSevaMinutes,
      tasksCompleted,
      peopleHelped,
      thisMonthTasks,
      thisMonthMinutes,
      avgRating,
      reviewCount,
      completedTasks,
    };
  }, [currentUser, requests, ratings]);

  const isSuperAdmin = Boolean(
    currentUser?.is_super_admin === true ||
    currentUser?.role === 'super_admin' ||
    (currentUser?.roles || []).includes('super_admin')
  );

  const getAdminPincodeMembers = useCallback(() => {
    if (isSuperAdmin || !currentUser?.pincode) return members;
    return members.filter((m) => m.pincode === currentUser.pincode);
  }, [members, currentUser, isSuperAdmin]);

  const getPincodeAdminRequests = useCallback(() => {
    if (!isSuperAdmin && currentUser?.role !== ROLES.ADMIN) return [];
    return members.filter((m) =>
      (m.roles || []).includes('admin') &&
      !m.pincode_admin_approved &&
      (isSuperAdmin || !currentUser?.pincode || m.pincode === currentUser.pincode)
    );
  }, [members, currentUser, isSuperAdmin]);

  const value = {
    currentUser,
    isLoggedIn,
    loading,
    login,
    logout,
    onboardingStep,
    setOnboardingStep,
    seniorMode,
    toggleSeniorMode,
    sosVisible,
    setSosVisible,
    requests,
    pendingApprovals,
    members,
    ledger,
    ratings,
    activeSession,
    pendingRating,
    notifications,
    unreadCount,
    isSuperAdmin,
    // Auth
    loginWithPin,
    setUserPin,
    createRequest,
    editRequest,
    acceptRequest,
    cancelRequest,
    reassignRequest,
    startSession,
    endSession,
    cancelSeries,
    approveUser,
    rejectUser,
    blockUser,
    unblockUser,
    approvePincodeAdmin,
    submitRating,
    dismissRating,
    closeRequest,
    // Roles
    switchRole,
    addRole,
    // Notifications
    markNotificationsAsRead,
    fetchUserNotifications,
    // Circle
    addToTrustedCircle,
    removeFromTrustedCircle,
    getTrustedCircle,
    // Volunteer
    updateVolunteerStatus,
    // Leaderboard
    fetchLeaderboard,
    // Selectors
    getUserLedger,
    getActiveRequest,
    getUserRequests,
    getOpenRequests,
    getUserRatings,
    getVolunteerActiveRequest,
    getVolunteerMetrics,
    getAdminPincodeMembers,
    getPincodeAdminRequests,
    fetchRequests,
    fetchMembers,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
