"use client";

export default function AgencyTimesheetsError({ retry }: { error: Error; retry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3">
      <p className="text-lg font-medium">We couldn&apos;t load the timesheets.</p>
      <button
        type="button"
        onClick={() => retry()}
        className="h-11 rounded-control bg-brand-800 px-5 font-medium text-on-brand hover:bg-brand-900"
      >
        Try again
      </button>
    </div>
  );
}
