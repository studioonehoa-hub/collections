CREATE TYPE "public"."app_role" AS ENUM('super_admin', 'admin', 'encoder', 'report_generator', 'resident');--> statement-breakpoint
CREATE TYPE "public"."levy_status" AS ENUM('active', 'closed');--> statement-breakpoint
CREATE TYPE "public"."payment_mode" AS ENUM('cash', 'cheque', 'bank_transfer', 'online');--> statement-breakpoint
CREATE TYPE "public"."received_by" AS ENUM('bank', 'admin_office');--> statement-breakpoint
CREATE TYPE "public"."received_status" AS ENUM('pending', 'received', 'acknowledged');--> statement-breakpoint
CREATE TYPE "public"."resident_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."sent_via" AS ENUM('email', 'sms', 'printed', 'hand_delivered');--> statement-breakpoint
CREATE TABLE "billings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resident_id" uuid NOT NULL,
	"period" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"sent_via" "sent_via",
	"sent_at" date,
	"received_status" "received_status" DEFAULT 'pending' NOT NULL,
	"received_at" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dues_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"monthly_amount" numeric(10, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "levies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"amount_per_unit" numeric(10, 2) NOT NULL,
	"status" "levy_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resident_id" uuid NOT NULL,
	"date" date NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"mode" "payment_mode" NOT NULL,
	"received_by" "received_by" NOT NULL,
	"period" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "residents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"unit_no" text NOT NULL,
	"dues_group_id" uuid NOT NULL,
	"dues_override" numeric(10, 2),
	"billing_contact_1" text,
	"billing_contact_2" text,
	"status" "resident_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "residents_unit_no_unique" UNIQUE("unit_no")
);
--> statement-breakpoint
CREATE TABLE "special_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resident_id" uuid NOT NULL,
	"levy_id" uuid NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"date" date NOT NULL,
	"mode" "payment_mode" NOT NULL,
	"received_by" "received_by" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"role" "app_role",
	"resident_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "billings" ADD CONSTRAINT "billings_resident_id_residents_id_fk" FOREIGN KEY ("resident_id") REFERENCES "public"."residents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_resident_id_residents_id_fk" FOREIGN KEY ("resident_id") REFERENCES "public"."residents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "residents" ADD CONSTRAINT "residents_dues_group_id_dues_groups_id_fk" FOREIGN KEY ("dues_group_id") REFERENCES "public"."dues_groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "special_payments" ADD CONSTRAINT "special_payments_resident_id_residents_id_fk" FOREIGN KEY ("resident_id") REFERENCES "public"."residents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "special_payments" ADD CONSTRAINT "special_payments_levy_id_levies_id_fk" FOREIGN KEY ("levy_id") REFERENCES "public"."levies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_resident_id_residents_id_fk" FOREIGN KEY ("resident_id") REFERENCES "public"."residents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "billings_resident_period_idx" ON "billings" USING btree ("resident_id","period");--> statement-breakpoint
CREATE UNIQUE INDEX "levies_single_active_idx" ON "levies" USING btree ("status") WHERE "levies"."status" = 'active';