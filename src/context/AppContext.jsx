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
  const [requests, setRequests] = useState([]);
  const [ledger, setLedger] = useState({});
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [members, setMembers] = useState([]);
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
        console.error('[fetchRequests] error:', error);
      } else if (data) {
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
        }));
        setRequests(mapped);

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
      console.error('[fetchRequests] exception:', err);
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
        console.error('Error fetching members:', error);
      } else if (data) {
        setMembers(data);
        setPendingApprovals(data.filter((m) => m.kyc_status === KYC_STATUS.PENDING));
      }
    } catch (err) {
      console.error('Error in fetchMembers:', err);
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
        initPushNotifications(session.user.id);
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
        initPushNotifications(session.user.id);
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
      initPushNotifications(user.id);
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

  // ── Create Request (one-time or recurring) ────────────────
  const createRequest = useCallback(async (requestData) => {
    // Check max active requests
    const myActive = requests.filter(
      (r) => r.seniorId === currentUser?.id && [REQUEST_STATUS.OPEN, REQUEST_STATUS.ACCEPTED, REQUEST_STATUS.IN_PROGRESS].includes(r.status)
    );
    if (myActive.length >= MAX_ACTIVE_REQUESTS) {
      throw new Error(`You can only have ${MAX_ACTIVE_REQUESTS} active requests at a time.`);
    }

    const isUuid = (id) =>
      typeof id === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const validSeniorId = isUuid(currentUser?.id) ? currentUser.id : null;

    // ── Recurring logic ──────────────────────────────────────
    if (requestData.isRecurring && requestData.recurrencePattern) {
      return await createRecurringSeries(requestData, validSeniorId);
    }

    // ── One-time request ──────────────────────────────────────
    const payload = {
      senior_id: validSeniorId,
      senior_name: currentUser?.name || 'Anonymous Senior',
      service_type: requestData.serviceType,
      description: requestData.description,
      location: requestData.location || currentUser?.area || 'Local Area',
      pincode: requestData.pincode || currentUser?.pincode || '400001',
      urgency: requestData.urgency || 'normal',
      status: REQUEST_STATUS.OPEN,
      lifecycle_status: 'created',
      created_by_admin_id: requestData.createdByAdminId || null,
      created_by_admin_name: requestData.createdByAdminName || null,
    };

    let inserted = null;
    try {
      const { data, error } = await supabase.from('requests').insert([payload]).select().single();
      if (error) console.error('[createRequest] error:', error);
      else inserted = data;
    } catch (e) {
      console.error('[createRequest] exception:', e);
    }

    const formatted = {
      id: inserted?.id || `req-${Date.now()}`,
      seniorId: validSeniorId,
      seniorName: currentUser?.name || 'Anonymous Senior',
      serviceType: requestData.serviceType,
      description: requestData.description,
      location: requestData.location || currentUser?.area || 'Local Area',
      pincode: requestData.pincode || currentUser?.pincode || '400001',
      urgency: requestData.urgency || 'normal',
      status: REQUEST_STATUS.OPEN,
      lifecycleStatus: 'created',
      createdAt: inserted?.created_at || new Date().toISOString(),
      createdByAdminId: requestData.createdByAdminId,
      createdByAdminName: requestData.createdByAdminName,
    };

    setRequests((prev) => [formatted, ...prev]);

    // Trigger notifications
    if (inserted?.id && validSeniorId) {
      notifyTrustedVolunteers({
        requestId: inserted.id,
        seniorId: validSeniorId,
        serviceType: requestData.serviceType,
        seniorName: currentUser?.name,
        location: requestData.location,
      });
    }

    return formatted;
  }, [currentUser, requests]);

  // ── Create Recurring Series ───────────────────────────────
  const createRecurringSeries = useCallback(async (requestData, seniorId) => {
    const { recurrencePattern } = requestData;
    const { days, time, fromDate, toDate } = recurrencePattern;

    // Create series record
    const { data: series } = await supabase.from('request_series').insert([{
      created_by: seniorId,
      service_type: requestData.serviceType,
      description: requestData.description,
      location: requestData.location,
      pincode: requestData.pincode || currentUser?.pincode,
      urgency: requestData.urgency,
      pattern: recurrencePattern,
    }]).select().single();

    const seriesId = series?.id || crypto.randomUUID();

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
          senior_id: seniorId,
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
          // Store scheduled time in description for now
        });
      }
      current.setDate(current.getDate() + 1);
    }

    if (instances.length > 0) {
      const { data: inserted } = await supabase.from('requests').insert(instances).select();
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

  // ── End Session ───────────────────────────────────────────
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
      const newBalance = (currentUser.time_balance || 0) + durationMinutes;

      await supabase.from('ledger_transactions').insert([{
        user_id: currentUser.id,
        type: 'credit',
        minutes: durationMinutes,
        label: `${req.serviceType} - ${req.seniorName}`,
        service: req.serviceType,
        counterparty_id: req.seniorId,
        counterparty_name: req.seniorName,
        balance: newBalance,
      }]);

      await supabase.from('profiles').update({ time_balance: newBalance }).eq('id', currentUser.id);
      setCurrentUser((prev) => prev ? { ...prev, time_balance: newBalance, timeBalance: newBalance } : prev);
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
      title: '✅ Your account is verified!',
      body: 'Welcome to Time Bank of India. You can now create and accept requests.',
    });
    setPendingApprovals((prev) => prev.filter((p) => p.id !== pendingId));
    fetchMembers();
  }, [fetchMembers]);

  const rejectUser = useCallback(async (pendingId) => {
    await supabase.from('profiles').update({ kyc_status: KYC_STATUS.REJECTED }).eq('id', pendingId);
    setPendingApprovals((prev) => prev.filter((p) => p.id !== pendingId));
    fetchMembers();
  }, [fetchMembers]);

  const blockUser = useCallback(async (userId) => {
    await supabase.from('profiles').update({ is_blocked: true }).eq('id', userId);
    fetchMembers();
  }, [fetchMembers]);

  const unblockUser = useCallback(async (userId) => {
    await supabase.from('profiles').update({ is_blocked: false }).eq('id', userId);
    fetchMembers();
  }, [fetchMembers]);

  // ── Approve Pincode Admin Role ────────────────────────────
  const approvePincodeAdmin = useCallback(async (userId) => {
    const { data: profile } = await supabase.from('profiles').select('roles').eq('id', userId).single();
    const roles = profile?.roles || ['admin'];
    await supabase.from('profiles').update({
      pincode_admin_approved: true,
      roles: [...new Set([...roles, 'admin'])],
    }).eq('id', userId);
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

  // ── Preferred Circle ──────────────────────────────────────
  const addToTrustedCircle = useCallback(async (targetUserId) => {
    if (!currentUser?.id) return;
    await supabase.from('preferences').upsert([{
      user_id: currentUser.id,
      target_user_id: targetUserId,
      relationship: 'trusted',
    }]);
  }, [currentUser]);

  const removeFromTrustedCircle = useCallback(async (targetUserId) => {
    if (!currentUser?.id) return;
    await supabase.from('preferences').delete()
      .eq('user_id', currentUser.id)
      .eq('target_user_id', targetUserId);
  }, [currentUser]);

  const getTrustedCircle = useCallback(async () => {
    if (!currentUser?.id) return [];
    const { data } = await supabase
      .from('preferences')
      .select('target_user_id, profiles!preferences_target_user_id_fkey(id, name, role, area, rating)')
      .eq('user_id', currentUser.id)
      .eq('relationship', 'trusted');
    return (data || []).map((p) => p.profiles).filter(Boolean);
  }, [currentUser]);

  // ── Volunteer Status ──────────────────────────────────────
  const updateVolunteerStatus = useCallback(async (status) => {
    if (!currentUser?.id) return;
    await supabase.from('profiles').update({ volunteer_status: status }).eq('id', currentUser.id);
    setCurrentUser((prev) => prev ? { ...prev, volunteer_status: status } : prev);
  }, [currentUser]);

  // ── Leaderboard ───────────────────────────────────────────
  const fetchLeaderboard = useCallback(async ({ pincode, period = 'all' } = {}) => {
    let query = supabase
      .from('profiles')
      .select('id, name, area, pincode, rating, time_balance, hide_from_leaderboard')
      .eq('role', 'volunteer')
      .eq('kyc_status', 'verified')
      .eq('hide_from_leaderboard', false)
      .eq('is_blocked', false)
      .order('time_balance', { ascending: false })
      .limit(100);

    if (pincode) {
      query = query.eq('pincode', pincode);
    }

    const { data } = await query;
    return data || [];
  }, []);

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
    () => requests.filter((r) => r.status === REQUEST_STATUS.OPEN),
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

  const getAdminPincodeMembers = useCallback(() => {
    if (!currentUser?.pincode) return members;
    return members.filter((m) => m.pincode === currentUser.pincode);
  }, [members, currentUser]);

  const getPincodeAdminRequests = useCallback(() => {
    if (!currentUser?.pincode) return [];
    return members.filter((m) => m.pincode === currentUser.pincode && (m.roles || []).includes('admin') && !m.pincode_admin_approved);
  }, [members, currentUser]);

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
    // Auth
    createRequest,
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
