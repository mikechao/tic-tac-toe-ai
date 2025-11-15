CREATE TABLE "json_repair_telemetry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_id" integer NOT NULL,
	"round_id" uuid,
	"repair_attempt_at" timestamp with time zone NOT NULL,
	"original_json" text NOT NULL,
	"repaired_json" text NOT NULL,
	"repair_successful" boolean NOT NULL,
	"repair_duration_ms" integer NOT NULL,
	"repair_steps" text[] NOT NULL,
	"error_type" varchar(50),
	"error_details" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "json_repair_telemetry" ADD CONSTRAINT "json_repair_telemetry_round_id_matches_round_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."matches"("round_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "json_repair_telemetry_model_id_idx" ON "json_repair_telemetry" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX "json_repair_telemetry_round_id_idx" ON "json_repair_telemetry" USING btree ("round_id");--> statement-breakpoint
CREATE INDEX "json_repair_telemetry_created_at_idx" ON "json_repair_telemetry" USING btree ("created_at");