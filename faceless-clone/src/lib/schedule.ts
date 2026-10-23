import { DateTime } from "luxon";

export type SlotInput = {
  now: Date;
  timezone: string;
  publishTimes: string[];
  publishDays: number[];
  leadHours: number;
};

/** Upcoming publish instants inside the lead window. Day numbers are 0 = Sunday … 6 = Saturday. */
export function upcomingPublishSlots(input: SlotInput): Date[] {
  const zone = input.timezone || "UTC";
  const start = DateTime.fromJSDate(input.now, { zone: "utc" }).setZone(zone);
  if (!start.isValid) return [];
  const horizon = start.plus({ hours: input.leadHours + 1 });
  const slots: Date[] = [];
  let day = start.startOf("day").minus({ days: 1 });
  const last = horizon.startOf("day").plus({ days: 1 });

  while (day <= last) {
    const specDow = day.weekday % 7;
    if (input.publishDays.includes(specDow)) {
      for (const time of input.publishTimes) {
        const match = /^(\d{2}):(\d{2})$/.exec(time);
        if (!match) continue;
        const hour = Number(match[1]);
        const minute = Number(match[2]);
        if (hour > 23 || minute > 59) continue;
        const slot = day.set({ hour, minute, second: 0, millisecond: 0 });
        // Spring-forward gaps are not valid wall times. Luxon rolls them forward, so compare the clock.
        if (!slot.isValid || slot.hour !== hour || slot.minute !== minute) continue;
        if (slot >= start && slot <= horizon) slots.push(slot.toUTC().toJSDate());
      }
    }
    day = day.plus({ days: 1 });
  }

  slots.sort((a, b) => a.getTime() - b.getTime());
  return slots;
}

export function nextPublishSlot(input: SlotInput): Date | null {
  return upcomingPublishSlots(input)[0] ?? null;
}

export function shouldGenerateImmediately(slot: Date, now: Date, leadHours: number) {
  return slot.getTime() - now.getTime() <= leadHours * 60 * 60 * 1000;
}

/** When the generate job should become runnable for a future publish slot. */
export function generationPlan(slot: Date, now: Date, leadHours: number) {
  const startAt = new Date(slot.getTime() - leadHours * 60 * 60 * 1000);
  return { runAfter: startAt.getTime() > now.getTime() ? startAt : now };
}

export function slotMissed(status: string, scheduledFor: Date | null, now: Date, autoApprove: boolean) {
  if (!scheduledFor) return false;
  if (scheduledFor.getTime() > now.getTime()) return false;
  if (autoApprove) return false;
  return status === "READY";
}
