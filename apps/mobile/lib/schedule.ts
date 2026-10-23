// Pick-up slots for scheduled deliveries. Keep in sync with isValidSlot() in
// apps/web/src/lib/bookings.ts, which only accepts 30-minute slots up to 3 days ahead.
const SLOT_MINUTES = 30;
const FIRST_HOUR = 6;
const LAST_HOUR = 21;
// A little more than the server's 15-minute minimum, so a slot is still valid when booked.
const MIN_LEAD_MINUTES = 25;
export const DAYS_AHEAD = 3;

/** The bookable slots on the day `dayOffset` days from today, in the phone's time zone. */
export function slotsOn(dayOffset: number, now = new Date()) {
  const earliest = now.getTime() + MIN_LEAD_MINUTES * 60_000;
  const slots: Date[] = [];
  for (let minutes = FIRST_HOUR * 60; minutes <= LAST_HOUR * 60; minutes += SLOT_MINUTES) {
    const slot = new Date(now);
    slot.setDate(now.getDate() + dayOffset);
    slot.setHours(0, minutes, 0, 0);
    if (slot.getTime() >= earliest) slots.push(slot);
  }
  return slots;
}

export function dayLabel(dayOffset: number, now = new Date()) {
  if (dayOffset === 0) return 'Today';
  if (dayOffset === 1) return 'Tomorrow';
  const day = new Date(now);
  day.setDate(now.getDate() + dayOffset);
  return day.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function timeLabel(at: Date) {
  return at.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
}

/** "Today, 3:30 PM", "Tomorrow, 9:00 AM" or "Sat, Oct 25, 9:00 AM". */
export function formatSlot(at: Date | string, now = new Date()) {
  const date = new Date(at);
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayOffset = Math.round((startOfDay(date) - startOfDay(now)) / 86_400_000);
  return `${dayLabel(dayOffset, now)}, ${timeLabel(date)}`;
}
