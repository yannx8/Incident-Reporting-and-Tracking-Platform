-- CreateIndex: Partial unique index for active assignments (one active assignment per incident)
CREATE UNIQUE INDEX "Assignment_active_per_incident_idx"
ON "Assignment" ("incidentId")
WHERE "isActive" = true;
