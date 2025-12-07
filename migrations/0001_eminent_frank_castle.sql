CREATE TABLE "prompts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"language" varchar(10) NOT NULL,
	"prompt" text NOT NULL,
	"count" integer DEFAULT 5 NOT NULL,
	"difficulty" integer DEFAULT 2 NOT NULL,
	"model" varchar(100) DEFAULT 'gemini-1.5-flash' NOT NULL,
	"system_prompt" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_prompts_language" ON "prompts" USING btree ("language");--> statement-breakpoint
CREATE INDEX "idx_prompts_active" ON "prompts" USING btree ("is_active");