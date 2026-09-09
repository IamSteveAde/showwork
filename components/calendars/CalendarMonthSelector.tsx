"use client";

import { useRouter, useSearchParams } from "next/navigation";

type CalendarMonthSelectorProps = {
  value: string;
  options: string[];
};

export default function CalendarMonthSelector({
  value,
  options,
}: CalendarMonthSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(month: string) {
    const params = new URLSearchParams(searchParams.toString());

    params.set("month", month);

    router.push(`?${params.toString()}`);
  }

  return (
    <select
      value={value}
      onChange={(event) => handleChange(event.target.value)}
      aria-label="Select calendar month"
      className="appearance-none rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 pr-10 text-sm font-medium text-white outline-none transition hover:bg-white/[0.09] focus:border-[#2478FF]/50"
    >
      {options.map((month) => {
        const date = new Date(`${month}-01T00:00:00`);

        const label = date.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });

        return (
          <option
            key={month}
            value={month}
            className="bg-[#111] text-white"
          >
            {label}
          </option>
        );
      })}
    </select>
  );
}