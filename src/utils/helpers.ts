export function validatePhone(phone: string): string | null {
  if (!phone) return 'Phone number is required';
  if (!/^\d+$/.test(phone)) return 'Phone number must contain only digits';
  if (phone.length !== 11) return 'Phone number must be exactly 11 digits';
  if (!phone.startsWith('09')) return 'Phone number must start with 09';
  return null;
}

export function validateEmail(email: string): string | null {
  if (!email) return null; // optional
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) return 'Invalid email address';
  return null;
}

export function validateRequired(value: string, fieldName: string): string | null {
  if (!value || !value.trim()) return `${fieldName} is required`;
  return null;
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `₱${(num || 0).toFixed(2)}`;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(time: string): string {
  const [h, m] = time.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: '#F39C12',
    confirmed: '#3498DB',
    preparing: '#9B59B6',
    ready: '#2ECC71',
    served: '#27AE60',
    out_for_delivery: '#3498DB',
    delivered: '#2ECC71',
    completed: '#27AE60',
    cancelled: '#E74C3C',
  };
  return colors[status] || '#999';
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    preparing: 'Preparing',
    ready: 'Ready',
    served: 'Served',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return labels[status] || status;
}

export function getOrderTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    'dine-in': '🪑',
    'take-out': '🛍️',
    'delivery': '🚚',
  };
  return icons[type] || '📦';
}

/** Get current Philippine time as a Date object */
export function getCurrentPhTime(): Date {
  const now = new Date();
  // Convert to PH timezone string, then parse back
  const phStr = now.toLocaleString('en-US', { timeZone: 'Asia/Manila' });
  return new Date(phStr);
}

/** Get today's date in YYYY-MM-DD format using PH timezone */
export function getMinDate(): string {
  const ph = getCurrentPhTime();
  const y = ph.getFullYear();
  const m = String(ph.getMonth() + 1).padStart(2, '0');
  const d = String(ph.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getMinSelectableDate(): string {
  const ph = getCurrentPhTime();
  const { close } = getWorkingHours();
  
  const bufferTime = new Date(ph);
  bufferTime.setMinutes(bufferTime.getMinutes() + 30);
  const h = String(bufferTime.getHours()).padStart(2, '0');
  const m = String(bufferTime.getMinutes()).padStart(2, '0');
  
  if (`${h}:${m}` > close) {
    ph.setDate(ph.getDate() + 1);
  }
  
  const y = ph.getFullYear();
  const month = String(ph.getMonth() + 1).padStart(2, '0');
  const d = String(ph.getDate()).padStart(2, '0');
  return `${y}-${month}-${d}`;
}

export function getWorkingHours(): { open: string; close: string } {
  return { open: '08:00', close: '21:00' };
}

export function isWithinWorkingHours(time: string): boolean {
  const { open, close } = getWorkingHours();
  return time >= open && time <= close;
}

/**
 * Get the minimum selectable time for a given date.
 * If the date is today (PH time), returns current time + 30 min buffer (rounded up).
 * Otherwise returns café opening time.
 */
export function getMinTime(selectedDate: string): string {
  const { open } = getWorkingHours();
  const today = getMinDate();

  if (selectedDate === today) {
    const ph = getCurrentPhTime();
    // Add 30 minute buffer
    ph.setMinutes(ph.getMinutes() + 30);
    const h = String(ph.getHours()).padStart(2, '0');
    const m = String(ph.getMinutes()).padStart(2, '0');
    const currentMin = `${h}:${m}`;
    // Return whichever is later: opening time or current+buffer
    return currentMin > open ? currentMin : open;
  }
  return open;
}

/**
 * Check if a scheduled date+time is in the past (PH timezone).
 * Returns true if it IS a past time slot (invalid).
 */
export function isPastTimeSlot(date: string, time: string): boolean {
  if (!date || !time) return false;
  const ph = getCurrentPhTime();
  const today = getMinDate();

  if (date < today) return true;
  if (date === today) {
    const h = String(ph.getHours()).padStart(2, '0');
    const m = String(ph.getMinutes()).padStart(2, '0');
    return time <= `${h}:${m}`;
  }
  return false;
}
