import { Badge } from "./ui";

const TONES = {
  ACTIVE: "success",
  SCHEDULED: "info",
  DRAFT: "neutral",
  PAUSED: "warning",
  ENDED: "neutral",
  CANCELLED: "neutral",
  NEEDS_ATTENTION: "critical",
  ERROR: "critical",
};

const LABELS = { NEEDS_ATTENTION: "Needs attention" };

export function StatusBadge({ status }) {
  const label = LABELS[status] ?? status.charAt(0) + status.slice(1).toLowerCase();
  return <Badge tone={TONES[status] ?? "neutral"}>{label}</Badge>;
}

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");
export const toDateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

export function describeValue(d) {
  return d.valueType === "PERCENTAGE" ? `${d.value}% off MRP` : `${d.value} off MRP`;
}
