"use client";

import ClientCalendarView from "@/components/calendars/ClientCalendarView";

type Props = {
  slug: string;
  planStatus: string;
  clientName: string;
  posts: React.ComponentProps<typeof ClientCalendarView>["posts"];
};

/**
 * ClientCalendarExperience
 *
 * Thin compatibility wrapper.
 *
 * The actual client calendar experience now lives entirely inside
 * ClientCalendarView. Keeping this wrapper intentionally simple prevents
 * duplicate month/filter state and avoids Post[] / CalendarPostData[]
 * mismatches.
 */
export default function ClientCalendarExperience({
  slug,
  planStatus,
  clientName,
  posts,
}: Props) {
  return (
    <ClientCalendarView
      slug={slug}
      planStatus={planStatus}
      clientName={clientName}
      posts={posts}
    />
  );
}
