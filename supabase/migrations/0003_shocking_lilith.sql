CREATE INDEX "billings_period_idx" ON "billings" USING btree ("period");--> statement-breakpoint
CREATE INDEX "payment_allocations_billing_id_idx" ON "payment_allocations" USING btree ("billing_id");--> statement-breakpoint
CREATE INDEX "payments_resident_id_idx" ON "payments" USING btree ("resident_id");--> statement-breakpoint
CREATE INDEX "payments_date_idx" ON "payments" USING btree ("date");--> statement-breakpoint
CREATE INDEX "residents_dues_group_id_idx" ON "residents" USING btree ("dues_group_id");--> statement-breakpoint
CREATE INDEX "special_payments_resident_id_idx" ON "special_payments" USING btree ("resident_id");--> statement-breakpoint
CREATE INDEX "special_payments_levy_id_idx" ON "special_payments" USING btree ("levy_id");--> statement-breakpoint
CREATE INDEX "users_resident_id_idx" ON "users" USING btree ("resident_id");