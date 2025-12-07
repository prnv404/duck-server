ALTER TABLE "prompts" ADD COLUMN "topic_id" uuid;--> statement-breakpoint
ALTER TABLE "prompts" ADD CONSTRAINT "prompts_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_prompts_topic" ON "prompts" USING btree ("topic_id");