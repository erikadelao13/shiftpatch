import { UserIcon } from "@/shared/ui/icons";

export function AssignedNurse({ name }: { name: string | null }) {
  if (!name) {
    return (
      <span className="flex items-center gap-3 text-text-muted">
        <span
          aria-hidden="true"
          className="flex size-10 items-center justify-center rounded-full bg-surface-subtle"
        >
          <UserIcon />
        </span>
        Unassigned
      </span>
    );
  }

  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");

  return (
    <span className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="flex size-10 items-center justify-center rounded-full bg-sage text-sm font-medium text-brand-800"
      >
        {initials}
      </span>
      {name}
    </span>
  );
}
