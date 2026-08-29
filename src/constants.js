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
  medicine: '💊',
  groceries: '🛒',
  bank: '🏦',
  walk: '🚶',
  other: '🤝',
};

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
