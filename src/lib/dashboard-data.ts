import type { LucideIcon } from "lucide-react"
import {
  GitPullRequest,
  ShieldCheck,
  RefreshCw,
  FileSearch,
  AlertTriangle,
  KeyRound,
} from "lucide-react"

export type ComplianceStatus = "compliant" | "partial" | "missing"

export const statusMeta: Record<
  ComplianceStatus,
  { label: string; dot: string; badge: string; text: string }
> = {
  compliant: {
    label: "Compliant",
    dot: "bg-success",
    badge: "border-success/30 bg-success/10 text-success",
    text: "text-success",
  },
  partial: {
    label: "Partial Coverage",
    dot: "bg-warning",
    badge: "border-warning/30 bg-warning/10 text-warning",
    text: "text-warning",
  },
  missing: {
    label: "Missing Evidence",
    dot: "bg-danger",
    badge: "border-danger/30 bg-danger/10 text-danger",
    text: "text-danger",
  },
}

export type Criteria = {
  id: string
  title: string
  description: string
  controls: string[]
  covered: number
  total: number
  status: ComplianceStatus
}

export const trustServiceCriteria: Criteria[] = [
  {
    id: "security",
    title: "Security",
    description: "Logical & physical access, system operations, change management.",
    controls: ["CC6.1", "CC6.2", "CC6.3", "CC7.1", "CC7.2"],
    covered: 28,
    total: 30,
    status: "compliant",
  },
  {
    id: "confidentiality",
    title: "Confidentiality",
    description: "Identification and protection of confidential information.",
    controls: ["C1.1", "C1.2"],
    covered: 6,
    total: 9,
    status: "partial",
  },
  {
    id: "availability",
    title: "Availability",
    description: "System uptime, monitoring, and disaster recovery readiness.",
    controls: ["A1.1", "A1.2", "A1.3"],
    covered: 2,
    total: 7,
    status: "missing",
  },
  {
    id: "processing-integrity",
    title: "Processing Integrity",
    description: "Complete, accurate, and authorized system processing.",
    controls: ["PI1.1", "PI1.2"],
    covered: 5,
    total: 6,
    status: "partial",
  },
  {
    id: "privacy",
    title: "Privacy",
    description: "Collection, use, retention, and disposal of personal data.",
    controls: ["P1.1", "P2.1", "P3.1"],
    covered: 9,
    total: 9,
    status: "compliant",
  },
]

export type Activity = {
  id: string
  icon: LucideIcon
  iconClass: string
  title: string
  meta: string
  time: string
  tag?: string
}

export const recentActivity: Activity[] = [
  {
    id: "1",
    icon: GitPullRequest,
    iconClass: "text-success bg-success/10",
    title: "AI Agent classified 12 GitHub Pull Requests for CC7.2",
    meta: "Change management evidence linked automatically",
    time: "2 mins ago",
    tag: "CC7.2",
  },
  {
    id: "2",
    icon: RefreshCw,
    iconClass: "text-primary bg-primary/10",
    title: "Jira Access Logs synced",
    meta: "342 records ingested from Atlassian Cloud",
    time: "1 hour ago",
    tag: "CC6.1",
  },
  {
    id: "3",
    icon: AlertTriangle,
    iconClass: "text-warning bg-warning/10",
    title: "New gap detected in Availability monitoring",
    meta: "No uptime evidence found for control A1.2",
    time: "3 hours ago",
    tag: "A1.2",
  },
  {
    id: "4",
    icon: KeyRound,
    iconClass: "text-primary bg-primary/10",
    title: "Okta MFA enforcement verified across 48 users",
    meta: "Identity provider policy snapshot captured",
    time: "5 hours ago",
    tag: "CC6.2",
  },
  {
    id: "5",
    icon: FileSearch,
    iconClass: "text-success bg-success/10",
    title: "AI Agent drafted CC6.3 access review narrative",
    meta: "Awaiting reviewer approval before audit packet",
    time: "Yesterday",
    tag: "CC6.3",
  },
  {
    id: "6",
    icon: ShieldCheck,
    iconClass: "text-success bg-success/10",
    title: "AWS CloudTrail encryption controls passed",
    meta: "All S3 buckets enforce SSE-KMS encryption",
    time: "Yesterday",
    tag: "CC6.7",
  },
]

export const organizations = [
  { id: "1", name: "Acme Security", plan: "Enterprise", initials: "AS" },
  { id: "2", name: "Northwind Labs", plan: "Growth", initials: "NL" },
  { id: "3", name: "Globex Corp", plan: "Startup", initials: "GC" },
]
