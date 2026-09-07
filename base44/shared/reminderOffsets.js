// Per-category reminder timing — pure helpers, no platform deps.
//
// Backend twin of src/lib/reminderOffsets.js (the platform forbids frontend
// imports from base44/). The two copies MUST stay identical — same
// convention as visitReminders.js / shared/visitReminders.js.
//
// Timing keys are the existing offset keys ("due","1h","1d","3d","7d").
// Storage model (BusinessSettings):
//   reminder_offsets                — global default timing (legacy, kept)
//   reminder_offsets_by_category    — { "Visits": ["3d","1d"], ... }
// Backward compatibility: a category with NO stored array of its own
// resolves to the global default; a stored array (even empty = explicitly
// no timed reminders) is always the category's own selection. Switching a
// category OFF never touches its stored timing.

export const REMINDER_CATEGORIES = [
  "Tasks", "Inspections", "Maintenance", "Contractors",
  "Expenses", "Keys", "Reports", "Visits",
];

export const REMINDER_OFFSET_CHOICES = [
  { v: "due", l: "At due time" },
  { v: "1h", l: "1 hour before" },
  { v: "1d", l: "1 day before" },
  { v: "3d", l: "3 days before" },
  { v: "7d", l: "7 days before" },
];

export function hasCategoryTiming(settings, category) {
  const byCat = settings && settings.reminder_offsets_by_category;
  return !!(byCat && Array.isArray(byCat[category]));
}

export function resolveReminderOffsets(settings, category) {
  if (hasCategoryTiming(settings, category)) {
    return settings.reminder_offsets_by_category[category];
  }
  return (settings && settings.reminder_offsets) || [];
}