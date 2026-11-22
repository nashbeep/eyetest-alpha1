import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export type GazePoint = {
  timeMs: number;
  targetX: number;
  targetY: number;
  gazeX: number | null;
  gazeY: number | null;
};

export const assessmentsTable = pgTable(
  "clarity_assessments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    trackingScore: integer("tracking_score"),
    colorStatus: varchar("color_status", { length: 48 }).notNull(),
    colorCorrect: integer("color_correct").notNull(),
    colorTotal: integer("color_total").notNull(),
    leftEyeColorCorrect: integer("left_eye_color_correct"),
    rightEyeColorCorrect: integer("right_eye_color_correct"),
    colorProtocol: varchar("color_protocol", { length: 48 })
      .notNull()
      .default("unrecorded"),
    displaySettingsReviewed: boolean("display_settings_reviewed")
      .notNull()
      .default(false),
    eyeMode: varchar("eye_mode", { length: 16 }).notNull(),
    smoothPursuitGain: doublePrecision("smooth_pursuit_gain"),
    meanTrackingError: doublePrecision("mean_tracking_error"),
    jitter: doublePrecision("jitter"),
    bilateralDifference: doublePrecision("bilateral_difference"),
    gazePath: jsonb("gaze_path")
      .$type<GazePoint[]>()
      .notNull()
      .default([]),
  },
  (table) => [index("clarity_assessments_user_created_idx").on(table.userId, table.createdAt)],
);

export const insertAssessmentSchema = createInsertSchema(assessmentsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertAssessment = z.infer<typeof insertAssessmentSchema>;
export type AssessmentRecord = typeof assessmentsTable.$inferSelect;
