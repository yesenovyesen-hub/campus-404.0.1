import test from "node:test";
import assert from "node:assert/strict";
import { getLocalDateKey, getWeekDates, getWeekProgress, hasEarnedWeeklyBonus } from "../js/rewards.js";

test("returns Monday through Friday for a Wednesday", () => {
  assert.deepEqual(getWeekDates(new Date(2026, 9, 7)), ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09"]);
});
test("week calculation crosses month boundary", () => {
  assert.deepEqual(getWeekDates(new Date(2026, 1, 1)), ["2026-01-26", "2026-01-27", "2026-01-28", "2026-01-29", "2026-01-30"]);
});
test("week calculation crosses year boundary", () => {
  assert.equal(getWeekDates(new Date(2026, 0, 1))[0], "2025-12-29");
});
test("Sunday belongs to the preceding Monday-Friday week", () => {
  assert.deepEqual(getWeekDates(new Date(2026, 9, 11)), getWeekDates(new Date(2026, 9, 5)));
});
test("progress reports each weekday", () => {
  assert.equal(getWeekProgress([] , new Date(2026, 9, 5)).length, 5);
});
test("progress marks active days", () => {
  assert.equal(getWeekProgress(["2026-10-05"], new Date(2026, 9, 5))[0].active, true);
});
test("duplicate activity dates do not overcount", () => {
  assert.equal(hasEarnedWeeklyBonus(Array(5).fill("2026-10-05"), new Date(2026, 9, 5)), false);
});
test("four weekdays do not earn the bonus", () => {
  assert.equal(hasEarnedWeeklyBonus(["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08"], new Date(2026, 9, 5)), false);
});
test("all five weekdays earn the bonus", () => {
  assert.equal(hasEarnedWeeklyBonus(getWeekDates(new Date(2026, 9, 5)), new Date(2026, 9, 5)), true);
});
test("weekend activity is not counted", () => {
  assert.equal(hasEarnedWeeklyBonus(["2026-10-10", "2026-10-11"], new Date(2026, 9, 5)), false);
});
test("ignores dates outside current week", () => {
  assert.equal(hasEarnedWeeklyBonus(["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"], new Date(2026, 9, 5)), false);
});
test("local date key uses local calendar components", () => {
  assert.equal(getLocalDateKey(new Date(2026, 0, 2, 23, 59)), "2026-01-02");
});
