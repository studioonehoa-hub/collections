export type ResidentRow = {
  id: string;
  name: string;
  unit_no: string;
  dues_group_id: string;
  dues_override: string | null;
  billing_contact_1: string | null;
  billing_contact_2: string | null;
  status: "active" | "inactive";
};

export type DuesGroupRow = {
  id: string;
  name: string;
  monthly_amount: string;
};

export type DuesGroupSummaryRow = DuesGroupRow & {
  member_count: number;
};

export type SentVia = "email" | "sms" | "printed" | "hand_delivered";
export type ReceivedStatus = "pending" | "received" | "acknowledged";

export type BillingRow = {
  id: string;
  resident_id: string;
  period: string;
  amount: string;
  sent_via: SentVia | null;
  sent_at: string | null;
  received_status: ReceivedStatus;
  received_at: string | null;
};

export type PaymentMode = "cash" | "cheque" | "bank_transfer" | "online";
export type ReceivedBy = "bank" | "admin_office";
export type PaymentStatus = "active" | "voided";

export type PaymentRow = {
  id: string;
  resident_id: string;
  date: string;
  amount: string;
  mode: PaymentMode;
  received_by: ReceivedBy;
  period: string | null;
  notes: string | null;
  status: PaymentStatus;
  voided_by: string | null;
  voided_at: string | null;
  void_reason: string | null;
};

export type LevyRow = {
  id: string;
  name: string;
  amount_per_unit: string;
  status: "active" | "closed";
};

export type SpecialPaymentRow = {
  id: string;
  resident_id: string;
  levy_id: string;
  amount: string;
  date: string;
  mode: PaymentMode;
  received_by: ReceivedBy;
  status: PaymentStatus;
  voided_by: string | null;
  voided_at: string | null;
  void_reason: string | null;
};

/** Minimal projection from resident_report_directory / resident_directory. */
export type ResidentDirectoryEntry = {
  id: string;
  unit_no: string;
  name?: string;
  status: "active" | "inactive";
};
