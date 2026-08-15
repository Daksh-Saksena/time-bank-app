import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  MOCK_USERS,
  MOCK_REQUESTS,
  MOCK_LEDGER,
  MOCK_PENDING_APPROVALS,
  MOCK_RATINGS,
  ROLES,
  REQUEST_STATUS,
  KYC_STATUS,
  URGENCY,
  SERVICE_TYPES,
  formatMinutes,
  getUserById,
} from '../data/mockData';
const AppContext = createContext(null);
export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [seniorMode, setSeniorMode] = useState(false);
  const [requests, setRequests] = useState([...MOCK_REQUESTS]);
  const [ledger, setLedger] = useState({ ...MOCK_LEDGER });
  const [pendingApprovals, setPendingApprovals] = useState([...MOCK_PENDING_APPROVALS]);
  const [ratings, setRatings] = useState([...MOCK_RATINGS]);
  const [members, setMembers] = useState([...MOCK_USERS]);
  const [activeSession, setActiveSession] = useState(null);
  const [sessionTimer, setSessionTimer] = useState(null);
  const [sosVisible, setSosVisible] = useState(false);
  const [pendingRating, setPendingRating] = useState(null);
  const login = useCallback((userId) => {
    const user = MOCK_USERS.find((u) => u.id === userId);
    if (user) {
      setCurrentUser({ ...user });
      setSeniorMode(user.seniorMode || false);
      setIsLoggedIn(true);
    }
  }, []);
  const logout = useCallback(() => {
    setCurrentUser(null);
    setIsLoggedIn(false);
    setSeniorMode(false);
    setActiveSession(null);
  }, []);
  const toggleSeniorMode = useCallback(() => {
    setSeniorMode((prev) => !prev);
  }, []);
  const createRequest = useCallback((requestData) => {
    const newRequest = {
      id: `req-${Date.now()}`,
      seniorId: currentUser?.id,
      seniorName: currentUser?.name,
      ...requestData,
      status: REQUEST_STATUS.OPEN,
      createdAt: new Date().toISOString(),
      assignedVolunteerId: null,
      assignedVolunteerName: null,
    };
    setRequests((prev) => [newRequest, ...prev]);
    return newRequest;
  }, [currentUser]);
  const acceptRequest = useCallback((requestId) => {
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
  const startSession = useCallback((requestId) => {
    const startTime = new Date();
    setActiveSession({ requestId, startTime, elapsed: 0 });
    setRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? { ...r, status: REQUEST_STATUS.IN_PROGRESS, sessionStartedAt: startTime.toISOString() }
          : r
      )
    );
  }, []);
  const endSession = useCallback((requestId) => {
    if (!activeSession) return;
    const endTime = new Date();
    const durationMinutes = Math.max(
      1,
      Math.round((endTime - new Date(activeSession.startTime)) / 60000)
    );
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
      const volunteerLedgerEntry = {
        id: `txn-${Date.now()}-v`,
        type: 'credit',
        minutes: durationMinutes,
        label: `${SERVICE_TYPES[req.serviceType] || req.serviceType} — ${req.seniorName}`,
        service: req.serviceType,
        seniorId: req.seniorId,
        seniorName: req.seniorName,
        date: endTime.toISOString(),
        balance: (currentUser?.timeBalance || 0) + durationMinutes,
      };
      setLedger((prev) => ({
        ...prev,
        [currentUser.id]: [volunteerLedgerEntry, ...(prev[currentUser.id] || [])],
      }));
      const seniorLedgerEntry = {
        id: `txn-${Date.now()}-s`,
        type: 'debit',
        minutes: durationMinutes,
        label: `${req.serviceType} — ${currentUser.name}`,
        service: req.serviceType,
        volunteerId: currentUser.id,
        volunteerName: currentUser.name,
        date: endTime.toISOString(),
        balance: 0,
      };
      setLedger((prev) => ({
        ...prev,
        [req.seniorId]: [seniorLedgerEntry, ...(prev[req.seniorId] || [])],
      }));
      setMembers((prev) =>
        prev.map((u) =>
          u.id === currentUser.id && u.volunteerStats
            ? {
              ...u,
              timeBalance: u.timeBalance + durationMinutes,
              volunteerStats: {
                ...u.volunteerStats,
                hoursVolunteered: u.volunteerStats.hoursVolunteered + durationMinutes,
                tasksCompleted: u.volunteerStats.tasksCompleted + 1,
              },
            }
            : u
        )
      );
    }
    setActiveSession(null);
    setPendingRating({ requestId, role: currentUser?.role });
  }, [activeSession, currentUser, requests]);
  const approveUser = useCallback((pendingId) => {
    const pending = pendingApprovals.find((p) => p.id === pendingId);
    if (pending) {
      const newMember = {
        ...pending,
        id: `user-${Date.now()}`,
        timeBalance: 0,
        kyc: { ...pending.kyc, status: KYC_STATUS.VERIFIED, verifiedOn: new Date().toISOString().split('T')[0] },
        rating: 0,
        ratingCount: 0,
        memberSince: new Date().toISOString().substring(0, 7),
      };
      setMembers((prev) => [...prev, newMember]);
    }
    setPendingApprovals((prev) => prev.filter((p) => p.id !== pendingId));
  }, [pendingApprovals]);
  const rejectUser = useCallback((pendingId) => {
    setPendingApprovals((prev) =>
      prev.map((p) =>
        p.id === pendingId
          ? { ...p, kyc: { ...p.kyc, status: KYC_STATUS.REJECTED } }
          : p
      )
    );
    setTimeout(() => {
      setPendingApprovals((prev) => prev.filter((p) => p.id !== pendingId));
    }, 1500);
  }, []);
  const submitRating = useCallback(({ requestId, stars, review, revieweeId, revieweeName }) => {
    const newRating = {
      id: `rating-${Date.now()}`,
      requestId,
      reviewerId: currentUser?.id,
      reviewerName: currentUser?.name,
      revieweeId,
      revieweeName,
      stars,
      review,
      date: new Date().toISOString(),
    };
    setRatings((prev) => [...prev, newRating]);
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
  const getOpenRequests = useCallback(() => requests.filter((r) => r.status === REQUEST_STATUS.OPEN), [requests]);
  const getUserRatings = useCallback(
    (userId) => ratings.filter((r) => r.revieweeId === (userId || currentUser?.id)),
    [ratings, currentUser]
  );
  const getVolunteerActiveRequest = useCallback(() => {
    if (!currentUser) return null;
    return requests.find(
      (r) => r.assignedVolunteerId === currentUser.id && r.status === REQUEST_STATUS.IN_PROGRESS
    ) || null;
  }, [requests, currentUser]);
  const value = {
    currentUser,
    isLoggedIn,
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
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
