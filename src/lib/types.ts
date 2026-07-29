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
