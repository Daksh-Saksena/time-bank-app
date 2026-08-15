export const ROLES = {
  SENIOR: 'senior',
  VOLUNTEER: 'volunteer',
  ADMIN: 'admin',
};
export const KYC_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  NOT_STARTED: 'not_started',
};
export const REQUEST_STATUS = {
  OPEN: 'open',
  ACCEPTED: 'accepted',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};
export const URGENCY = {
  NORMAL: 'normal',
  HIGH: 'high',
};
export const SERVICE_TYPES = {
  MEDICINE: 'medicine',
  GROCERIES: 'groceries',
  BANK: 'bank',
  WALK: 'walk',
  OTHER: 'other',
};
export const SERVICE_LABELS = {
  medicine: 'Medicine Pickup',
  groceries: 'Grocery Shopping',
  bank: 'Bank Assistance',
  walk: 'Companionship / Walk',
  other: 'Other Help',
};
export const SERVICE_ICONS = {
  medicine: '',
  groceries: '',
  bank: '',
  walk: '',
  other: '',
};
export const MOCK_USERS = [
  {
    id: 'user-001',
    name: 'Savitri Devi',
    phone: '+91 98765 43210',
    age: 72,
    role: ROLES.SENIOR,
    pincode: '400001',
    area: 'Colaba, Mumbai',
    avatar: null,
    timeBalance: 180,
    kyc: {
      status: KYC_STATUS.VERIFIED,
      aadhaarLast4: '8421',
      verifiedOn: '2024-11-15',
    },
    pin: '4521',
    seniorMode: true,
    emergencyContact: { name: 'Ravi Devi (Son)', phone: '+91 99001 12345' },
    rating: 4.8,
    ratingCount: 12,
    memberSince: '2024-10',
  },
  {
    id: 'user-002',
    name: 'Arjun Sharma',
    phone: '+91 87654 32109',
    age: 26,
    role: ROLES.VOLUNTEER,
    pincode: '400001',
    area: 'Colaba, Mumbai',
    avatar: null,
    timeBalance: 720,
    kyc: {
      status: KYC_STATUS.VERIFIED,
      aadhaarLast4: '3317',
      verifiedOn: '2024-10-20',
    },
    volunteerStats: {
      hoursVolunteered: 18 * 60 + 45,
      tasksCompleted: 23,
      peopleHelped: 12,
      joinedDate: '2024-09-01',
    },
    rating: 4.9,
    ratingCount: 23,
    memberSince: '2024-09',
  },
  {
    id: 'user-003',
    name: 'Priya Nair',
    phone: '+91 76543 21098',
    age: 34,
    role: ROLES.ADMIN,
    pincode: '400001',
    area: 'Colaba, Mumbai',
    avatar: null,
    timeBalance: 60,
    kyc: {
      status: KYC_STATUS.VERIFIED,
      aadhaarLast4: '6690',
      verifiedOn: '2024-09-05',
    },
    adminSince: '2024-09-05',
    managedPincode: '400001',
    rating: 5.0,
    ratingCount: 5,
    memberSince: '2024-09',
  },
  {
    id: 'user-004',
    name: 'Ramesh Gupta',
    phone: '+91 91234 56789',
    age: 68,
    role: ROLES.SENIOR,
    pincode: '400001',
    area: 'Fort, Mumbai',
    avatar: null,
    timeBalance: 90,
    kyc: { status: KYC_STATUS.VERIFIED, aadhaarLast4: '2290', verifiedOn: '2024-11-20' },
    pin: '1234',
    seniorMode: false,
    emergencyContact: { name: 'Sunita Gupta (Wife)', phone: '+91 99001 99001' },
    rating: 4.5,
    ratingCount: 8,
    memberSince: '2024-11',
  },
  {
    id: 'user-005',
    name: 'Meena Iyer',
    phone: '+91 81234 56789',
    age: 21,
    role: ROLES.VOLUNTEER,
    pincode: '400001',
    area: 'Fort, Mumbai',
    avatar: null,
    timeBalance: 360,
    kyc: { status: KYC_STATUS.VERIFIED, aadhaarLast4: '4432', verifiedOn: '2024-11-10' },
    volunteerStats: {
      hoursVolunteered: 6 * 60,
      tasksCompleted: 8,
      peopleHelped: 6,
      joinedDate: '2024-11-01',
    },
    rating: 4.7,
    ratingCount: 8,
    memberSince: '2024-11',
  },
];
export const MOCK_PENDING_APPROVALS = [
  {
    id: 'pending-001',
    name: 'Krishnamurthy Venkataraman',
    phone: '+91 94455 66778',
    age: 74,
    role: ROLES.SENIOR,
    pincode: '400001',
    area: 'CST, Mumbai',
    submittedOn: '2026-08-12T09:30:00',
    kyc: {
      status: KYC_STATUS.PENDING,
      aadhaarLast4: '7732',
      documentType: 'Aadhaar Card',
    },
    notes: 'Referred by daughter Sujata Krishnan.',
  },
  {
    id: 'pending-002',
    name: 'Fatima Begum',
    phone: '+91 98776 55443',
    age: 65,
    role: ROLES.SENIOR,
    pincode: '400001',
    area: 'Colaba, Mumbai',
    submittedOn: '2026-08-11T14:20:00',
    kyc: {
      status: KYC_STATUS.PENDING,
      aadhaarLast4: '4419',
      documentType: 'Voter ID',
    },
    notes: '',
  },
  {
    id: 'pending-003',
    name: 'Rohit Malhotra',
    phone: '+91 70009 88776',
    age: 22,
    role: ROLES.VOLUNTEER,
    pincode: '400001',
    area: 'Ballard Estate, Mumbai',
    submittedOn: '2026-08-13T08:00:00',
    kyc: {
      status: KYC_STATUS.PENDING,
      aadhaarLast4: '1156',
      documentType: 'Aadhaar Card',
    },
    notes: 'College student, available weekends.',
  },
];
export const MOCK_REQUESTS = [
  {
    id: 'req-001',
    seniorId: 'user-001',
    seniorName: 'Savitri Devi',
    serviceType: SERVICE_TYPES.MEDICINE,
    description: 'Need someone to pick up my blood pressure medicines from Apollo Pharmacy, Colaba.',
    location: 'Colaba, Mumbai',
    pincode: '400001',
    urgency: URGENCY.HIGH,
    status: REQUEST_STATUS.IN_PROGRESS,
    createdAt: '2026-08-13T10:30:00',
    assignedVolunteerId: 'user-002',
    assignedVolunteerName: 'Arjun Sharma',
    sessionStartedAt: '2026-08-13T11:00:00',
    estimatedDuration: 60,
  },
  {
    id: 'req-002',
    seniorId: 'user-004',
    seniorName: 'Ramesh Gupta',
    serviceType: SERVICE_TYPES.GROCERIES,
    description: 'Weekly grocery shopping from D-Mart. List will be provided.',
    location: 'Fort, Mumbai',
    pincode: '400001',
    urgency: URGENCY.NORMAL,
    status: REQUEST_STATUS.OPEN,
    createdAt: '2026-08-13T09:00:00',
    assignedVolunteerId: null,
    assignedVolunteerName: null,
    estimatedDuration: 90,
  },
  {
    id: 'req-003',
    seniorId: 'user-001',
    seniorName: 'Savitri Devi',
    serviceType: SERVICE_TYPES.WALK,
    description: 'Would love a morning walk companion to the Gateway of India and back.',
    location: 'Colaba, Mumbai',
    pincode: '400001',
    urgency: URGENCY.NORMAL,
    status: REQUEST_STATUS.OPEN,
    createdAt: '2026-08-12T18:00:00',
    assignedVolunteerId: null,
    assignedVolunteerName: null,
    estimatedDuration: 45,
  },
  {
    id: 'req-004',
    seniorId: 'user-004',
    seniorName: 'Ramesh Gupta',
    serviceType: SERVICE_TYPES.BANK,
    description: 'Need help visiting SBI branch to update my passbook and check balance.',
    location: 'Fort, Mumbai',
    pincode: '400001',
    urgency: URGENCY.HIGH,
    status: REQUEST_STATUS.COMPLETED,
    createdAt: '2026-08-10T10:00:00',
    assignedVolunteerId: 'user-002',
    assignedVolunteerName: 'Arjun Sharma',
    completedAt: '2026-08-10T11:30:00',
    duration: 90,
    rating: { stars: 5, review: 'Arjun was very patient and helpful. Highly recommend!' },
  },
  {
    id: 'req-005',
    seniorId: 'user-001',
    seniorName: 'Savitri Devi',
    serviceType: SERVICE_TYPES.MEDICINE,
    description: 'Urgent - fever medicine needed from nearby chemist.',
    location: 'Colaba, Mumbai',
    pincode: '400001',
    urgency: URGENCY.HIGH,
    status: REQUEST_STATUS.OPEN,
    createdAt: '2026-08-13T16:00:00',
    assignedVolunteerId: null,
    assignedVolunteerName: null,
    estimatedDuration: 30,
  },
];
export const MOCK_LEDGER = {
  'user-001': [
    {
      id: 'txn-001',
      type: 'credit',
      minutes: 0,
      label: 'Welcome bonus',
      service: null,
      date: '2024-10-01T10:00:00',
      balance: 180,
    },
    {
      id: 'txn-002',
      type: 'debit',
      minutes: 90,
      label: 'Bank assistance',
      service: SERVICE_TYPES.BANK,
      volunteerId: 'user-002',
      volunteerName: 'Arjun Sharma',
      date: '2026-08-10T11:30:00',
      balance: 180,
    },
    {
      id: 'txn-003',
      type: 'debit',
      minutes: 45,
      label: 'Grocery delivery',
      service: SERVICE_TYPES.GROCERIES,
      volunteerId: 'user-005',
      volunteerName: 'Meena Iyer',
      date: '2026-08-05T14:00:00',
      balance: 270,
    },
  ],
  'user-002': [
    {
      id: 'txn-004',
      type: 'credit',
      minutes: 90,
      label: 'Bank assistance - Ramesh Gupta',
      service: SERVICE_TYPES.BANK,
      seniorId: 'user-004',
      seniorName: 'Ramesh Gupta',
      date: '2026-08-10T11:30:00',
      balance: 720,
    },
    {
      id: 'txn-005',
      type: 'credit',
      minutes: 60,
      label: 'Medicine pickup - Savitri Devi',
      service: SERVICE_TYPES.MEDICINE,
      seniorId: 'user-001',
      seniorName: 'Savitri Devi',
      date: '2026-08-08T12:00:00',
      balance: 630,
    },
    {
      id: 'txn-006',
      type: 'credit',
      minutes: 75,
      label: 'Grocery shopping - Fatima Begum',
      service: SERVICE_TYPES.GROCERIES,
      seniorId: 'user-004',
      seniorName: 'Ramesh Gupta',
      date: '2026-07-28T10:00:00',
      balance: 570,
    },
    {
      id: 'txn-007',
      type: 'credit',
      minutes: 45,
      label: 'Morning walk - Savitri Devi',
      service: SERVICE_TYPES.WALK,
      seniorId: 'user-001',
      seniorName: 'Savitri Devi',
      date: '2026-07-20T07:30:00',
      balance: 495,
    },
    {
      id: 'txn-008',
      type: 'credit',
      minutes: 120,
      label: 'Hospital visit assistance',
      service: SERVICE_TYPES.OTHER,
      seniorId: 'user-001',
      seniorName: 'Savitri Devi',
      date: '2026-07-15T09:00:00',
      balance: 450,
    },
  ],
  'user-003': [
    {
      id: 'txn-009',
      type: 'credit',
      minutes: 60,
      label: 'Admin welcome grant',
      service: null,
      date: '2024-09-05T10:00:00',
      balance: 60,
    },
  ],
};
export const MOCK_RATINGS = [
  {
    id: 'rating-001',
    requestId: 'req-004',
    reviewerId: 'user-004',
    reviewerName: 'Ramesh Gupta',
    revieweeId: 'user-002',
    revieweeName: 'Arjun Sharma',
    stars: 5,
    review: 'Arjun was very patient and helpful. Highly recommend!',
    date: '2026-08-10T12:00:00',
  },
  {
    id: 'rating-002',
    requestId: 'req-004',
    reviewerId: 'user-002',
    reviewerName: 'Arjun Sharma',
    revieweeId: 'user-004',
    revieweeName: 'Ramesh Gupta',
    stars: 5,
    review: 'Very cooperative senior, clear communication.',
    date: '2026-08-10T12:30:00',
  },
  {
    id: 'rating-003',
    requestId: 'req-002-old',
    reviewerId: 'user-001',
    reviewerName: 'Savitri Devi',
    revieweeId: 'user-002',
    revieweeName: 'Arjun Sharma',
    stars: 5,
    review: 'Got all medicines correctly. Very kind young man.',
    date: '2026-08-08T13:00:00',
  },
];
export const MOCK_MAP_MARKERS = [
  { id: 'req-001', x: 45, y: 35, urgency: URGENCY.HIGH, serviceType: SERVICE_TYPES.MEDICINE, status: REQUEST_STATUS.IN_PROGRESS },
  { id: 'req-002', x: 62, y: 55, urgency: URGENCY.NORMAL, serviceType: SERVICE_TYPES.GROCERIES, status: REQUEST_STATUS.OPEN },
  { id: 'req-003', x: 38, y: 68, urgency: URGENCY.NORMAL, serviceType: SERVICE_TYPES.WALK, status: REQUEST_STATUS.OPEN },
  { id: 'req-005', x: 55, y: 28, urgency: URGENCY.HIGH, serviceType: SERVICE_TYPES.MEDICINE, status: REQUEST_STATUS.OPEN },
];
export const MOCK_MEMBERS = MOCK_USERS;
export const DEMO_ACCOUNTS = [
  { userId: 'user-001', label: 'Savitri Devi', sublabel: 'Senior Citizen', role: ROLES.SENIOR, emoji: '' },
  { userId: 'user-002', label: 'Arjun Sharma', sublabel: 'Volunteer', role: ROLES.VOLUNTEER, emoji: '' },
  { userId: 'user-003', label: 'Priya Nair', sublabel: 'Pincode Admin', role: ROLES.ADMIN, emoji: '' },
];
export function getUserById(id) {
  return MOCK_USERS.find((u) => u.id === id) || null;
}
export function getLedgerForUser(userId) {
  return MOCK_LEDGER[userId] || [];
}
export function getRequestsForSenior(seniorId) {
  return MOCK_REQUESTS.filter((r) => r.seniorId === seniorId);
}
export function getOpenRequests() {
  return MOCK_REQUESTS.filter((r) => r.status === REQUEST_STATUS.OPEN);
}
export function getActiveRequestForVolunteer(volunteerId) {
  return MOCK_REQUESTS.find(
    (r) => r.assignedVolunteerId === volunteerId && r.status === REQUEST_STATUS.IN_PROGRESS
  ) || null;
}
export function getRatingsForUser(userId) {
  return MOCK_RATINGS.filter((r) => r.revieweeId === userId);
}
export function formatMinutes(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
export function getDistanceLabel(index) {
  const distances = ['0.3 km', '0.7 km', '1.1 km', '1.5 km', '2.0 km'];
  return distances[index % distances.length];
}
