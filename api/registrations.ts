import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { createRouter } from "./middleware";
import { authedQuery, adminQuery } from "./auth";
import { getDb } from "./queries/connection";
import { registrationCards, rooms } from "@db/schema";

const cardInput = z.object({
  regCardNo: z.string().optional(),
  bookingId: z.number().optional().nullable(),
  roomId: z.number().optional().nullable(),
  title: z.string().optional(),
  guestName: z.string().min(1),
  address: z.string().optional(),
  nationality: z.string().optional(),
  dateOfBirth: z.string().optional(),
  purposeOfTravel: z.string().optional(),
  durationOfStay: z.string().optional(),
  profession: z.string().optional(),
  localAgent: z.string().optional(),
  visaImmRegNo: z.string().optional(),
  placeDateOfIssue: z.string().optional(),
  passportNo: z.string().optional(),
  nidNo: z.string().optional(),
  dateOfEntryBd: z.string().optional(),
  visaIssueDate: z.string().optional(),
  visaExpiryDate: z.string().optional(),
  mobile: z.string().optional(),
  tel: z.string().optional(),
  tariff: z.number().int().optional().nullable(),
  modeOfPayment: z.enum(["individual", "company", "others"]).optional(),
  checkInDate: z.string().optional(),
  checkInTime: z.string().optional(),
  checkOutDate: z.string().optional(),
  checkOutTime: z.string().optional(),
});

function clean(
  input: Record<string, unknown>,
): Partial<typeof registrationCards.$inferInsert> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined) continue;
    out[k] = typeof v === "string" && v.trim() === "" ? null : v;
  }
  return out as Partial<typeof registrationCards.$inferInsert>;
}

export const registrationsRouter = createRouter({
  list: authedQuery.query(async () => {
    const db = getDb();
    const rows = await db
      .select({ card: registrationCards, room: rooms })
      .from(registrationCards)
      .leftJoin(rooms, eq(registrationCards.roomId, rooms.id))
      .orderBy(desc(registrationCards.createdAt));
    return rows.map((r) => ({ ...r.card, room: r.room }));
  }),

  create: authedQuery.input(cardInput).mutation(async ({ input }) => {
    const db = getDb();
    const [{ id }] = await db
      .insert(registrationCards)
      .values(clean(input) as typeof registrationCards.$inferInsert)
      .$returningId();    return { id };
  }),

  update: authedQuery
    .input(z.object({ id: z.number() }).merge(cardInput.partial()))
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...rest } = input;
      await db
        .update(registrationCards)
        .set(clean(rest) as Partial<typeof registrationCards.$inferInsert>)
        .where(eq(registrationCards.id, id));
      return { ok: true };
    }),

  remove: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .delete(registrationCards)
        .where(eq(registrationCards.id, input.id));
      return { ok: true };
    }),
});
