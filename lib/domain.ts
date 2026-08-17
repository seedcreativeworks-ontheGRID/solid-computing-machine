import type {
  ExceptionSeverity,
  ExceptionStatus,
  ExceptionType,
  ShipmentStage,
  MilestoneStatus,
  TaskStatus,
  TaskUrgency,
  DocumentType,
  DocumentReviewStatus,
  CostCategory,
  CostStatus,
  RiskLevel,
  RecommendationStatus,
  PurchaseOrderStatus,
  OrgRole,
} from "@/lib/generated/prisma/client";

/** Severity → badge variant, used for exceptions, risk levels, and milestone states. */
export const severityBadgeVariant: Record<ExceptionSeverity, "critical" | "high" | "medium" | "low"> = {
  CRITICAL: "critical",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
};

export const exceptionTypeLabel: Record<ExceptionType, string> = {
  QUANTITY_MISMATCH: "Quantity mismatch",
  DOCUMENT_MISSING: "Document missing",
  DOCUMENT_MISMATCH: "Document mismatch",
  ETA_DELAY: "ETA delay",
  COST_VARIANCE: "Cost variance",
  SUPPLIER_RISK: "Supplier risk",
  CUSTOMS_HOLD: "Customs hold",
};

export const exceptionStatusLabel: Record<ExceptionStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  DISMISSED: "Dismissed",
};

export const shipmentStageLabel: Record<ShipmentStage, string> = {
  BOOKED: "Booked",
  ORIGIN_PICKUP: "Origin pickup",
  PORT_OF_LOADING: "Port of loading",
  IN_TRANSIT: "In transit",
  PORT_OF_DISCHARGE: "Port of discharge",
  CUSTOMS_CLEARANCE: "Customs clearance",
  INLAND_TRANSIT: "Inland transit",
  DELIVERED: "Delivered",
  CLOSED: "Closed",
};

export const milestoneStatusLabel: Record<MilestoneStatus, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In progress",
  COMPLETE: "Complete",
  AT_RISK: "At risk",
  DELAYED: "Delayed",
};

export const taskStatusLabel: Record<TaskStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  DONE: "Done",
  BLOCKED: "Blocked",
};

export const taskUrgencyLabel: Record<TaskUrgency, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
};

export const documentTypeLabel: Record<DocumentType, string> = {
  COMMERCIAL_INVOICE: "Commercial invoice",
  PACKING_LIST: "Packing list",
  BILL_OF_LADING: "Bill of lading",
  CERTIFICATE_OF_ORIGIN: "Certificate of origin",
  CUSTOMS_DECLARATION: "Customs declaration",
  INSPECTION_REPORT: "Inspection report",
  INSURANCE_CERTIFICATE: "Insurance certificate",
  OTHER: "Other document",
};

export const documentReviewStatusLabel: Record<DocumentReviewStatus, string> = {
  PENDING_REVIEW: "Pending review",
  VERIFIED: "Verified",
  FLAGGED: "Flagged",
};

export const costCategoryLabel: Record<CostCategory, string> = {
  FREIGHT: "Freight",
  DUTY: "Duty",
  BROKERAGE: "Brokerage",
  INLAND_TRANSPORT: "Inland transport",
  WAREHOUSING: "Warehousing",
  SURCHARGE: "Surcharge",
  INSURANCE: "Insurance",
};

export const costStatusLabel: Record<CostStatus, string> = {
  FORECAST: "Forecast",
  EXPECTED: "Expected",
  CONFIRMED: "Confirmed",
};

export const riskLevelLabel: Record<RiskLevel, string> = {
  LOW: "Low",
  MODERATE: "Moderate",
  ELEVATED: "Elevated",
  HIGH: "High",
};

export const riskLevelBadgeVariant: Record<RiskLevel, "low" | "medium" | "high" | "critical"> = {
  LOW: "low",
  MODERATE: "medium",
  ELEVATED: "high",
  HIGH: "critical",
};

export const recommendationStatusLabel: Record<RecommendationStatus, string> = {
  PENDING: "Pending review",
  APPROVED: "Approved",
  DISMISSED: "Dismissed",
  AUTO_APPLIED: "Auto-applied",
};

export const purchaseOrderStatusLabel: Record<PurchaseOrderStatus, string> = {
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  IN_PRODUCTION: "In production",
  READY_TO_SHIP: "Ready to ship",
  SHIPPED: "Shipped",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
};

export const orgRoleLabel: Record<OrgRole, string> = {
  OWNER: "Owner",
  OPS_MANAGER: "Operations Manager",
  TRADE_COORDINATOR: "Trade Coordinator",
  FINANCE: "Finance",
  WAREHOUSE: "Warehouse Lead",
  VIEWER: "Viewer",
};

const SEVERITY_WEIGHT: Record<ExceptionSeverity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export function sortBySeverity<T extends { severity: ExceptionSeverity }>(items: T[]): T[] {
  return [...items].sort((a, b) => SEVERITY_WEIGHT[a.severity] - SEVERITY_WEIGHT[b.severity]);
}
