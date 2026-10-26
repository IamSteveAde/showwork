import { Temporal } from "@js-temporal/polyfill";
const DAYS: Record<number, number[]> = { 1: [3], 2: [2, 5], 3: [1, 3, 5], 4: [1, 3, 5, 7], 5: [1, 2, 3, 4, 5], 6: [1, 2, 3, 4, 5, 6], 7: [1, 2, 3, 4, 5, 6, 7] };
/** Preserve established Monday-based publishing days; partial weeks contain only selected days. */
export function contentSlots(start: string, end: string, frequency: number): string[] {
    let first, last;
    try {
        first = Temporal.PlainDate.from(start);
        last = Temporal.PlainDate.from(end);
    }
    catch {
        throw Error("Choose valid calendar dates.");
    }
    if (Temporal.PlainDate.compare(first, last) > 0 || !Number.isInteger(frequency) || frequency < 1 || frequency > 14)
        throw Error("Choose a valid range and an integer frequency from 1 to 14.");
    if (first.until(last).days > 366)
        throw Error("Choose a range of at most one year.");
    const dates: string[] = [];
    for (let day = first; Temporal.PlainDate.compare(day, last) <= 0; day = day.add({ days: 1 })) {
        if ((DAYS[Math.min(frequency, 7)] || []).includes(day.dayOfWeek))
            dates.push(day.toString());
        // Second daily slots occur only when 8–14 posts/week is explicitly selected.
        if (frequency > 7 && day.dayOfWeek <= frequency - 7)
            dates.push(day.toString());
    }
    return dates;
}
export function contentStreams(platforms: string[], strategy = "SAME_CONTENT", groups: string[][] = []) {
    if (!platforms.length || new Set(platforms).size !== platforms.length)
        throw Error("Select each platform only once.");
    if (strategy === "SAME_CONTENT")
        return [{ id: "ALL", platforms }];
    if (strategy === "DIFFERENT_CONTENT")
        return platforms.map(platform => ({ id: platform, platforms: [platform] }));
    if (strategy !== "CUSTOM_GROUPS")
        throw Error("Choose a valid sharing strategy.");
    const flat = groups.flat();
    if (!groups.length || groups.some(g => !g.length) || flat.length !== platforms.length || new Set(flat).size !== flat.length || flat.some(p => !platforms.includes(p)))
        throw Error("Every selected platform must belong to exactly one content group.");
    return groups.map((platforms, i) => ({ id: `GROUP_${i + 1}`, platforms }));
}
export function generationCount(start: string, end: string, frequency: number, platforms: string[], strategy?: string, groups?: string[][]) {
    const slots = contentSlots(start, end, frequency), streams = contentStreams(platforms, strategy, groups);
    return { slots, streams, ideas: slots.length * streams.length, drafts: slots.length * platforms.length };
}
export function scheduledContentDate(day: string, time = "09:00", timeZone = "UTC", ordinal = 0) {
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time) || !Number.isInteger(ordinal) || ordinal < 0 || ordinal > 1)
        throw Error("Choose a valid publishing time.");
    const plain = Temporal.PlainDate.from(day).toPlainDateTime(Temporal.PlainTime.from(time));
    // A second explicitly requested daily slot is separated by one hour without leaving the day.
    const shifted = ordinal ? plain.add({ minutes: plain.hour === 23 ? -60 : 60 }) : plain;
    return new Date(shifted.toZonedDateTime(timeZone, { disambiguation: "compatible" }).epochMilliseconds);
}
