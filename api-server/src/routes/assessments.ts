import { getAuth } from "@clerk/express";
import { and, count, desc, eq } from "drizzle-orm";
import { Router, type IRouter, type RequestHandler } from "express";
import {
  CreateAssessmentBody,
  CreateAssessmentResponse,
  DeleteAssessmentsResponse,
  GetAssessmentParams,
  GetAssessmentResponse,
  GetDashboardSummaryResponse,
  ListAssessmentsResponse,
} from "@workspace/api-zod";
import { assessmentsTable, db, type AssessmentRecord } from "@workspace/db";

const router: IRouter = Router();

const requireUser: RequestHandler = (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Sign in to access saved assessments." });
    return;
  }

  res.locals.userId = userId;
  next();
};

function currentUserId(res: Parameters<RequestHandler>[1]): string {
  return String(res.locals.userId);
}

function toApiAssessment(record: AssessmentRecord) {
  return {
    ...record,
    createdAt: record.createdAt.toISOString(),
  };
}

router.get(
  "/dashboard/summary",
  requireUser,
  async (_req, res): Promise<void> => {
    const userId = currentUserId(res);
    const [{ totalAssessments = 0 } = {}] = await db
      .select({ totalAssessments: count() })
      .from(assessmentsTable)
      .where(eq(assessmentsTable.userId, userId));

    const recent = await db
      .select()
      .from(assessmentsTable)
      .where(eq(assessmentsTable.userId, userId))
      .orderBy(desc(assessmentsTable.createdAt))
      .limit(6);

    const latest = recent[0] ? toApiAssessment(recent[0]) : null;
    const trend = recent
      .filter(
        (assessment): assessment is typeof assessment & { trackingScore: number } =>
          assessment.trackingScore !== null,
      )
      .reverse()
      .map((assessment) => ({
        date: assessment.createdAt.toISOString(),
        trackingScore: assessment.trackingScore,
      }));

    res.json(
      GetDashboardSummaryResponse.parse({
        totalAssessments: Number(totalAssessments),
        latest,
        trend,
      }),
    );
  },
);

router.get("/assessments", requireUser, async (_req, res): Promise<void> => {
  const records = await db
    .select()
    .from(assessmentsTable)
    .where(eq(assessmentsTable.userId, currentUserId(res)))
    .orderBy(desc(assessmentsTable.createdAt))
    .limit(100);

  res.json(ListAssessmentsResponse.parse(records.map(toApiAssessment)));
});

router.post("/assessments", requireUser, async (req, res): Promise<void> => {
  const parsed = CreateAssessmentBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid assessment payload");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [record] = await db
    .insert(assessmentsTable)
    .values({
      ...parsed.data,
      userId: currentUserId(res),
    })
    .returning();

  res
    .status(201)
    .json(CreateAssessmentResponse.parse(toApiAssessment(record)));
});

router.get(
  "/assessments/:assessmentId",
  requireUser,
  async (req, res): Promise<void> => {
    const params = GetAssessmentParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [record] = await db
      .select()
      .from(assessmentsTable)
      .where(
        and(
          eq(assessmentsTable.id, params.data.assessmentId),
          eq(assessmentsTable.userId, currentUserId(res)),
        ),
      )
      .limit(1);

    if (!record) {
      res.status(404).json({ error: "Assessment not found." });
      return;
    }

    res.json(GetAssessmentResponse.parse(toApiAssessment(record)));
  },
);

router.delete("/assessments", requireUser, async (_req, res): Promise<void> => {
  const deleted = await db
    .delete(assessmentsTable)
    .where(eq(assessmentsTable.userId, currentUserId(res)))
    .returning({ id: assessmentsTable.id });

  res.json(DeleteAssessmentsResponse.parse({ deletedCount: deleted.length }));
});

export default router;
