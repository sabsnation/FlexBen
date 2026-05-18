-- CreateTable
CREATE TABLE "policy_rules" (
    "id" SERIAL NOT NULL,
    "role" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "cost_center" TEXT NOT NULL,
    "max_per_transaction" DOUBLE PRECISION NOT NULL,
    "monthly_cap" DOUBLE PRECISION NOT NULL,
    "requires_approval" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "policy_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_events" (
    "id" SERIAL NOT NULL,
    "transaction_id" INTEGER NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT NOT NULL,
    "actor_email" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TEXT NOT NULL,

    CONSTRAINT "workflow_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workflow_events_transaction_id_idx" ON "workflow_events"("transaction_id");

-- AddForeignKey
ALTER TABLE "workflow_events" ADD CONSTRAINT "workflow_events_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
