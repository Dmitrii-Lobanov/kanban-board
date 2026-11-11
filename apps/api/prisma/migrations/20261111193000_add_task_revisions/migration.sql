ALTER TABLE "Task"
ADD COLUMN "titleRevision" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "descriptionRevision" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "priorityRevision" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "assigneeRevision" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "moveRevision" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Task"
ADD CONSTRAINT "Task_titleRevision_positive"
CHECK ("titleRevision" > 0),
ADD CONSTRAINT "Task_descriptionRevision_positive"
CHECK ("descriptionRevision" > 0),
ADD CONSTRAINT "Task_priorityRevision_positive"
CHECK ("priorityRevision" > 0),
ADD CONSTRAINT "Task_assigneeRevision_positive"
CHECK ("assigneeRevision" > 0),
ADD CONSTRAINT "Task_moveRevision_positive"
CHECK ("moveRevision" > 0);