CREATE TABLE "benefit_ceiling_proposals" (
    "id" SERIAL NOT NULL,
    "request_type" TEXT NOT NULL,
    "category_id" INTEGER,
    "category_name" TEXT NOT NULL,
    "employee_role" TEXT NOT NULL DEFAULT 'colaborador',
    "current_monthly_cap" DOUBLE PRECISION,
    "proposed_monthly_cap" DOUBLE PRECISION NOT NULL,
    "proposed_max_per_tx" DOUBLE PRECISION,
    "status" TEXT NOT NULL,
    "justification" TEXT,
    "requester_email" TEXT NOT NULL,
    "requester_role" TEXT NOT NULL,
    "created_at" TEXT NOT NULL,

    CONSTRAINT "benefit_ceiling_proposals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ceiling_proposal_events" (
    "id" SERIAL NOT NULL,
    "proposal_id" INTEGER NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT NOT NULL,
    "actor_email" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TEXT NOT NULL,

    CONSTRAINT "ceiling_proposal_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ceiling_proposal_events_proposal_id_idx" ON "ceiling_proposal_events"("proposal_id");

ALTER TABLE "ceiling_proposal_events" ADD CONSTRAINT "ceiling_proposal_events_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "benefit_ceiling_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
