export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge status-${status}`}>{status.replace("_", " ")}</span>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  return <span className={`badge prio-${priority}`}>{priority.toLowerCase()}</span>;
}

export function TagBadge({ name }: { name: string }) {
  return (
    <span className="badge no-dot status-CLOSED">
      {name}
    </span>
  );
}

const ROLE_TONE: Record<string, string> = {
  CUSTOMER: "role-customer",
  AGENT: "role-agent",
  TEAM_LEAD: "role-lead",
  ORG_ADMIN: "role-admin",
  PLATFORM_ADMIN: "role-platform",
};

export function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`badge no-dot ${ROLE_TONE[role] ?? "role-customer"}`}>
      {role.replace("_", " ").toLowerCase()}
    </span>
  );
}

const STATUS_TONE: Record<string, string> = {
  ACTIVE: "status-RESOLVED",
  INVITED: "status-PENDING",
  SUSPENDED: "prio-URGENT",
};

export function MemberStatusBadge({ status }: { status: string }) {
  return <span className={`badge ${STATUS_TONE[status] ?? "status-CLOSED"}`}>{status.toLowerCase()}</span>;
}

