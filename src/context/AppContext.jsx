import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  ROLES,
  REQUEST_STATUS,
  KYC_STATUS,
  SERVICE_TYPES,
  formatMinutes,
} from '../constants';
import { supabase } from '../lib/supabase';

const AppContext = createContext(null);

const getCachedUser = () => {
  try {
    const saved = localStorage.getItem('tb_user');
    return saved ? JSON.parse(saved) : null;
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

  // Fetch current user profile
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

  // Fetch all requests
  const fetchRequests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching requests:', error);
      } else if (data) {
        // Map database snake_case to camelCase for component compatibility
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
          assignedVolunteerId: r.assigned_volunteer_id,
          assignedVolunteerName: r.assigned_volunteer_name,
          sessionStartedAt: r.session_started_at,
          completedAt: r.completed_at,
          duration: r.duration,
          createdAt: r.created_at,
        }));
        setRequests(mapped);
      }
    } catch (err) {
      console.error('Error in fetchRequests:', err);
    }
  }, []);

  // Fetch members and pending KYC approvals (for Admin)
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

  // Fetch ledger transactions for a user
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

  // Listen to Supabase Auth State changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchUserLedger(session.user.id);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchUserLedger(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        try {
          localStorage.removeItem('tb_user');
        } catch (e) {}
        setCurrentUser(null);
        setIsLoggedIn(false);
      }
    });

    fetchRequests();
    fetchMembers();

    return () => subscription.unsubscribe();
  }, [fetchProfile, fetchRequests, fetchMembers, fetchUserLedger]);

  const login = useCallback((user) => {
    if (user) {
      setCurrentUser(user);
      setSeniorMode(user.senior_mode || user.seniorMode || false);
      setIsLoggedIn(true);
      try {
        localStorage.setItem('tb_user', JSON.stringify(user));
      } catch (e) {}
      fetchUserLedger(user.id);
    }
  }, [fetchUserLedger]);

  const logout = useCallback(async () => {
    try {
      localStorage.removeItem('tb_user');
      await supabase.auth.signOut();
    } catch (e) {}
    setCurrentUser(null);
    setIsLoggedIn(false);
    setSeniorMode(false);
    setActiveSession(null);
  }, []);

  const toggleSeniorMode = useCallback(async () => {
    const nextMode = !seniorMode;
    setSeniorMode(nextMode);
    if (currentUser?.id) {
      await supabase
        .from('profiles')
        .update({ senior_mode: nextMode })
        .eq('id', currentUser.id);
      setCurrentUser((prev) => (prev ? { ...prev, senior_mode: nextMode } : prev));
    }
  }, [seniorMode, currentUser]);

  const createRequest = useCallback(async (requestData) => {
    const isUuid = (id) =>
      typeof id === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const validSeniorId = isUuid(currentUser?.id) ? currentUser.id : null;

    const newReqPayload = {
      senior_id: validSeniorId,
      senior_name: currentUser?.name || 'Anonymous Senior',
      service_type: requestData.serviceType,
      description: requestData.description,
      location: requestData.location || currentUser?.area || 'Local Area',
      pincode: requestData.pincode || currentUser?.pincode || '400001',
      urgency: requestData.urgency || 'normal',
      status: REQUEST_STATUS.OPEN,
    };

    let inserted = null;
    try {
      const { data, error } = await supabase
        .from('requests')
        .insert([newReqPayload])
        .select()
        .single();

      if (error) {
        console.warn('Supabase insert notice:', error);
      } else {
        inserted = data;
      }
    } catch (e) {
      console.warn('Supabase request network notice:', e);
    }

    const formatted = {
      id: inserted?.id || `req-${Date.now()}`,
      seniorId: inserted?.senior_id || currentUser?.id,
      seniorName: inserted?.senior_name || currentUser?.name || 'Anonymous Senior',
      serviceType: requestData.serviceType,
      description: requestData.description,
      location: requestData.location || currentUser?.area || 'Local Area',
      pincode: requestData.pincode || currentUser?.pincode || '400001',
      urgency: requestData.urgency || 'normal',
      status: REQUEST_STATUS.OPEN,
      createdAt: inserted?.created_at || new Date().toISOString(),
    };

    setRequests((prev) => [formatted, ...prev]);
    return formatted;
  }, [currentUser]);

  const acceptRequest = useCallback(async (requestId) => {
    await supabase
      .from('requests')
      .update({
        status: REQUEST_STATUS.ACCEPTED,
        assigned_volunteer_id: currentUser?.id,
        assigned_volunteer_name: currentUser?.name,
      })
      .eq('id', requestId);

    setRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: REQUEST_STATUS.ACCEPTED,
              assignedVolunteerId: currentUser?.id,
              assignedVolunteerName: currentUser?.name,
            }
          : r
      )
    );
  }, [currentUser]);

  const startSession = useCallback(async (requestId) => {
    const startTime = new Date();
    setActiveSession({ requestId, startTime, elapsed: 0 });

    await supabase
      .from('requests')
      .update({
        status: REQUEST_STATUS.IN_PROGRESS,
        session_started_at: startTime.toISOString(),
      })
      .eq('id', requestId);

    setRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? { ...r, status: REQUEST_STATUS.IN_PROGRESS, sessionStartedAt: startTime.toISOString() }
          : r
      )
    );
  }, []);

  const endSession = useCallback(async (requestId) => {
    if (!activeSession) return;
    const endTime = new Date();
    const durationMinutes = Math.max(
      1,
      Math.round((endTime - new Date(activeSession.startTime)) / 60000)
    );

    await supabase
      .from('requests')
      .update({
        status: REQUEST_STATUS.COMPLETED,
        completed_at: endTime.toISOString(),
        duration: durationMinutes,
      })
      .eq('id', requestId);

    setRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: REQUEST_STATUS.COMPLETED,
              completedAt: endTime.toISOString(),
              duration: durationMinutes,
            }
          : r
      )
    );

    const req = requests.find((r) => r.id === requestId);
    if (req && currentUser) {
      const newVolunteerBalance = (currentUser.time_balance || currentUser.timeBalance || 0) + durationMinutes;

      // Log volunteer credit in Supabase
      await supabase.from('ledger_transactions').insert([
        {
          user_id: currentUser.id,
          type: 'credit',
          minutes: durationMinutes,
          label: `${SERVICE_TYPES[req.serviceType] || req.serviceType} - ${req.seniorName}`,
          service: req.serviceType,
          counterparty_id: req.seniorId,
          counterparty_name: req.seniorName,
          balance: newVolunteerBalance,
        },
      ]);

      // Update volunteer profile balance
      await supabase
        .from('profiles')
        .update({ time_balance: newVolunteerBalance })
        .eq('id', currentUser.id);

      setCurrentUser((prev) =>
        prev ? { ...prev, time_balance: newVolunteerBalance, timeBalance: newVolunteerBalance } : prev
      );

      fetchUserLedger(currentUser.id);
    }

    setActiveSession(null);
    setPendingRating({ requestId, role: currentUser?.role });
  }, [activeSession, currentUser, requests, fetchUserLedger]);

  const approveUser = useCallback(async (pendingId) => {
    await supabase
      .from('profiles')
      .update({ kyc_status: KYC_STATUS.VERIFIED })
      .eq('id', pendingId);

    setPendingApprovals((prev) => prev.filter((p) => p.id !== pendingId));
    fetchMembers();
  }, [fetchMembers]);

  const rejectUser = useCallback(async (pendingId) => {
    await supabase
      .from('profiles')
      .update({ kyc_status: KYC_STATUS.REJECTED })
      .eq('id', pendingId);

    setPendingApprovals((prev) => prev.filter((p) => p.id !== pendingId));
    fetchMembers();
  }, [fetchMembers]);

  const submitRating = useCallback(async ({ requestId, stars, review, revieweeId, revieweeName }) => {
    const { data } = await supabase.from('ratings').insert([
      {
        request_id: requestId,
        reviewer_id: currentUser?.id,
        reviewer_name: currentUser?.name,
        reviewee_id: revieweeId,
        reviewee_name: revieweeName,
        stars,
        review,
      },
    ]).select().single();

    if (data) {
      setRatings((prev) => [...prev, data]);
    }
    setPendingRating(null);
  }, [currentUser]);

  const dismissRating = useCallback(() => {
    setPendingRating(null);
  }, []);

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
    (userId) => ratings.filter((r) => r.revieweeId === (userId || currentUser?.id)),
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
    createRequest,
    acceptRequest,
    startSession,
    endSession,
    approveUser,
    rejectUser,
    submitRating,
    dismissRating,
    getUserLedger,
    getActiveRequest,
    getUserRequests,
    getOpenRequests,
    getUserRatings,
    getVolunteerActiveRequest,
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
