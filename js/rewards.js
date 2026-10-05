import { REQUIRED_ACTIVE_DAYS, WORK_DAYS } from "./constants.js";

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getWeekDates(reference = new Date()) {
  const monday = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  const day = monday.getDay();
  monday.setDate(monday.getDate() + (day === 0 ? -6 : 1 - day));
  return WORK_DAYS.map((offset) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + offset - 1);
    return dateKey(date);
  });
}

export function getWeekProgress(activityDates, reference = new Date()) {
  const dates = getWeekDates(reference);
  const active = new Set(activityDates);
  return dates.map((date) => ({ date, active: active.has(date) }));
}

export function hasEarnedWeeklyBonus(activityDates, reference = new Date()) {
  return getWeekProgress(activityDates, reference).filter((day) => day.active).length >= REQUIRED_ACTIVE_DAYS;
}

export function getLocalDateKey(date = new Date()) {
  return dateKey(date);
}
