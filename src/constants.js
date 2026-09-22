export const ROLES = {
  MEMBER: 'member',
  SENIOR: 'member', // backwards compatibility alias: internally senior is mapped to member
  VOLUNTEER: 'volunteer',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
};

export const SEVA_TERMS = {
  TOTAL_GIVEN: 'Total Seva Given',
  SERVICES_COMPLETED: 'Services Completed',
  THIS_MONTH: "This Month's Seva",
  SEVA_ACTIVITY: 'Seva Activity',
  PEOPLE_SUPPORTED: 'Community Members Supported',
};

export const KYC_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  NOT_STARTED: 'not_started',
};

export const REQUEST_STATUS = {
  OPEN: 'open',
  NOTIFIED_TRUSTED: 'notified_trusted',
  ACCEPTED: 'accepted',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  RATED: 'rated',
  CLOSED: 'closed',
  CANCELLED: 'cancelled',
};

export const URGENCY = {
  NORMAL: 'normal',
  HIGH: 'high',
};

export const VOLUNTEER_STATUS = {
  AVAILABLE: 'available',
  BUSY: 'busy',
  DND: 'dnd', // Do Not Disturb
};

export const DOCUMENT_TYPES = [
  { value: 'aadhaar', label: 'Aadhaar Card' },
  { value: 'voter_id', label: 'Voter ID' },
  { value: 'pan', label: 'PAN Card' },
  { value: 'passport', label: 'Passport' },
  { value: 'driving_licence', label: 'Driving Licence' },
  { value: 'govt_id', label: 'Govt Dept I-Card' },
  { value: 'other', label: 'Other (specify)' },
];

export const RATING_TAGS_POSITIVE = [
  { key: 'on_time', label: 'Samay par aaye 🕐' },
  { key: 'respectful', label: 'Vinamra the 🙏' },
  { key: 'very_helpful', label: 'Bahut madad ki ❤️' },
];

export const RATING_TAGS_NEGATIVE = [
  { key: 'late', label: 'Der se aaye ⏰' },
  { key: 'behavior', label: 'Vyavahar theek nahi 😞' },
];

export const NOTIFICATION_TYPES = {
  NEW_REQUEST: 'new_request',
  REQUEST_ACCEPTED: 'request_accepted',
  VOLUNTEER_ON_WAY: 'volunteer_on_way',
  REQUEST_COMPLETED: 'request_completed',
  RATING_REQUIRED: 'rating_required',
  KYC_APPROVED: 'kyc_approved',
  ADMIN_APPROVAL: 'admin_approval',
};

export const SERVICE_TYPES = {
  MEDICINE: 'medicine',
  GROCERIES: 'groceries',
  BANK: 'bank',
  WALK: 'walk',
  EMOTIONAL: 'emotional',
  OTHER: 'other',
};

export const SERVICE_LABELS = {
  medicine: 'Medicine Pickup',
  groceries: 'Grocery Shopping',
  bank: 'Bank Assistance',
  walk: 'Companionship / Walk',
  emotional: 'Emotional Support',
  other: 'Other Help',
};

export const SERVICE_ICONS = {
  medicine: '💊',
  groceries: '🛒',
  bank: '🏦',
  walk: '🚶',
  emotional: '🤗',
  other: '🤝',
};

export const DAYS_OF_WEEK = [
  { key: 'Mon', label: 'Mon' },
  { key: 'Tue', label: 'Tue' },
  { key: 'Wed', label: 'Wed' },
  { key: 'Thu', label: 'Thu' },
  { key: 'Fri', label: 'Fri' },
  { key: 'Sat', label: 'Sat' },
  { key: 'Sun', label: 'Sun' },
];

export const MAX_ACTIVE_REQUESTS = 3;
export const MAX_PREFERRED_CIRCLE = 10;
export const TRUSTED_NOTIFY_TIMEOUT_MINS = 15;
export const LOW_RATING_THRESHOLD = 3.0;
export const LOW_RATING_WINDOW = 5; // last N tasks

export function formatMinutes(minutes) {
  if (!minutes || minutes < 60) return `${minutes || 0}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function getDistanceLabel(index) {
  const distances = ['0.3 km', '0.7 km', '1.1 km', '1.5 km', '2.0 km'];
  return distances[index % distances.length];
}

export function formatDate(isoStr) {
  if (!isoStr) return '-';
  return new Date(isoStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function isDND() {
  const h = new Date().getHours();
  return h >= 22 || h < 6;
}

/**
 * Normalizes any role input (converting legacy 'senior' to 'member')
 */
export function normalizeRole(role) {
  if (!role) return ROLES.MEMBER;
  if (role === 'senior' || role === ROLES.SENIOR) return ROLES.MEMBER;
  return role;
}

/**
 * Returns human-readable label for roles
 */
export function getRoleLabel(role) {
  const norm = normalizeRole(role);
  switch (norm) {
    case ROLES.MEMBER:
      return 'Senior Citizen (Member)';
    case ROLES.VOLUNTEER:
      return 'Volunteer';
    case ROLES.ADMIN:
      return 'Pincode Admin';
    case ROLES.SUPER_ADMIN:
      return 'Super Admin';
    default:
      return 'Member';
  }
}

/**
 * Permission checker for KYC-gated actions
 */
export function canPerformSevaAction(user, action = 'accept_task') {
  if (!user) return false;
  if (user.is_super_admin) return true;
  if (user.is_blocked) return false;

  const isVerified = user.kyc_status === KYC_STATUS.VERIFIED;
  switch (action) {
    case 'accept_task':
    case 'start_task':
    case 'download_certificate':
      return isVerified;
    case 'request_help':
      // Members can request help, but unverified accounts show review status
      return true;
    default:
      return true;
  }
}
