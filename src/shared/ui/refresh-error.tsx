export function RefreshError({ error }: { error: Error | null }) {
  if (!error) return null;

  return (
    <p role="alert" className="rounded-control bg-danger-bg px-4 py-3 text-sm font-medium text-danger-text">
      {error.message}
    </p>
  );
}
