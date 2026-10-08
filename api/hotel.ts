import { z } from "zod";
import { and, eq, gte, lt, lte, ne, or, sql } from "drizzle-orm";
import { createRouter, publicQuery } from "./middleware";
import { authedQuery, adminQuery } from "./auth";
import { getDb } from "./queries/connection";
import {
  rooms,
  bookings,
  menuItems,
  posOrders,
  posOrderItems,
} from "@db/schema";
import { VAT_RATE, SERVICE_CHARGE_RATE } from "@contracts/types";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function overlapCondition(ci: string, co: string) {
  // existing.checkIn < co AND existing.checkOut > ci
  return and(
    lt(bookings.checkIn, co as unknown as Date),
    sql`${bookings.checkOut} > ${ci}`,
  );
}

async function conflictingBookings(roomId: number, ci: string, co: string) {
  const db = getDb();
  return db
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      and(
        eq(bookings.roomId, roomId),
        or(
          eq(bookings.status, "confirmed"),
          eq(bookings.status, "checked_in"),
        ),
        overlapCondition(ci, co),
      ),
    );
}

export const roomsRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(rooms).orderBy(rooms.number);
  }),

  dashboard: publicQuery.query(async () => {
    const db = getDb();
    const today = todayStr();
    const allRooms = await db.select().from(rooms).orderBy(rooms.number);
    const active = await db
      .select()
      .from(bookings)
      .where(
        or(
          eq(bookings.status, "confirmed"),
          eq(bookings.status, "checked_in"),
        ),
      );

    const occupying = new Map<number, (typeof active)[number]>();
    for (const b of active) {
      const ci =
        b.checkIn instanceof Date
          ? b.checkIn.toISOString().slice(0, 10)
          : String(b.checkIn);
      const co =
        b.checkOut instanceof Date
          ? b.checkOut.toISOString().slice(0, 10)
          : String(b.checkOut);
      if (ci <= today && co > today) occupying.set(b.roomId, b);
    }

    const arrivalsToday = active.filter(
      (b) =>
        (b.checkIn instanceof Date
          ? b.checkIn.toISOString().slice(0, 10)
          : String(b.checkIn)) === today && b.status === "confirmed",
    ).length;
    const departuresToday = active.filter(
      (b) =>
        (b.checkOut instanceof Date
          ? b.checkOut.toISOString().slice(0, 10)
          : String(b.checkOut)) === today,
    ).length;

    const roomCards = allRooms.map((r) => {
      const b = occupying.get(r.id);
      return {
        ...r,
        state:
          r.housekeeping === "maintenance"
            ? ("maintenance" as const)
            : b
              ? b.status === "checked_in"
                ? ("occupied" as const)
                : ("reserved" as const)
              : r.housekeeping === "cleaning"
                ? ("cleaning" as const)
                : ("available" as const),
        booking: b ?? null,
      };
    });

    return {
      today,
      rooms: roomCards,
      stats: {
        total: allRooms.length,
        occupied: roomCards.filter((r) => r.state === "occupied").length,
        reserved: roomCards.filter((r) => r.state === "reserved").length,
        available: roomCards.filter((r) => r.state === "available").length,
        cleaning: roomCards.filter((r) => r.state === "cleaning").length,
        maintenance: roomCards.filter((r) => r.state === "maintenance").length,
        arrivalsToday,
        departuresToday,
      },
    };
  }),

  setHousekeeping: publicQuery
    .input(
      z.object({
        roomId: z.number(),
        housekeeping: z.enum(["ready", "cleaning", "maintenance"]),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(rooms)
        .set({ housekeeping: input.housekeeping })
        .where(eq(rooms.id, input.roomId));
      return { ok: true };
    }),

  // ── Admin: room & rent management ────────────────────────────
  createRoom: adminQuery
    .input(
      z.object({
        number: z.string().min(1).max(10),
        floor: z.number().int().min(0),
        type: z.enum([
          "standard_single",
          "standard_double",
          "deluxe",
          "executive_suite",
          "presidential_suite",
        ]),
        ratePerNight: z.number().int().min(0),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const existing = await db.query.rooms.findFirst({
        where: eq(rooms.number, input.number),
      });
      if (existing) throw new Error(`Room ${input.number} already exists`);
      const [{ id }] = await db.insert(rooms).values(input).$returningId();
      return { id };
    }),

  updateRoom: adminQuery
    .input(
      z.object({
        id: z.number(),
        number: z.string().min(1).max(10).optional(),
        floor: z.number().int().min(0).optional(),
        type: z
          .enum([
            "standard_single",
            "standard_double",
            "deluxe",
            "executive_suite",
            "presidential_suite",
          ])
          .optional(),
        ratePerNight: z.number().int().min(0).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...patch } = input;
      await db.update(rooms).set(patch).where(eq(rooms.id, id));
      return { ok: true };
    }),

  deleteRoom: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const linked = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(eq(bookings.roomId, input.id))
        .limit(1);
      if (linked.length > 0)
        throw new Error("Room has bookings and cannot be deleted");
      await db.delete(rooms).where(eq(rooms.id, input.id));
      return { ok: true };
    }),
});

export const bookingsRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    const rows = await db
      .select({ booking: bookings, room: rooms })
      .from(bookings)
      .innerJoin(rooms, eq(bookings.roomId, rooms.id))
      .orderBy(sql`${bookings.createdAt} DESC`);
    return rows.map((r) => ({ ...r.booking, room: r.room }));
  }),

  availability: publicQuery
    .input(z.object({ checkIn: z.string(), checkOut: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const allRooms = await db.select().from(rooms).orderBy(rooms.number);
      const conflicts = await db
        .select({ roomId: bookings.roomId })
        .from(bookings)
        .where(
          and(
            or(
              eq(bookings.status, "confirmed"),
              eq(bookings.status, "checked_in"),
            ),
            overlapCondition(input.checkIn, input.checkOut),
          ),
        );
      const busy = new Set(conflicts.map((c) => c.roomId));
      return allRooms.filter(
        (r) => !busy.has(r.id) && r.housekeeping !== "maintenance",
      );
    }),

  create: publicQuery
    .input(
      z.object({
        roomId: z.number(),
        guestName: z.string().min(1),
        guestPhone: z.string().min(3),
        guestEmail: z.string().email().optional().or(z.literal("")),
        checkIn: z.string(),
        checkOut: z.string(),
        adults: z.number().int().min(1).default(1),
        children: z.number().int().min(0).default(0),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const ci = new Date(input.checkIn);
      const co = new Date(input.checkOut);
      const nights = Math.round(
        (co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (nights < 1) throw new Error("Check-out must be after check-in");

      const room = await db.query.rooms.findFirst({
        where: eq(rooms.id, input.roomId),
      });
      if (!room) throw new Error("Room not found");
      if (room.housekeeping === "maintenance")
        throw new Error("Room is under maintenance");

      const conflicts = await conflictingBookings(
        input.roomId,
        input.checkIn,
        input.checkOut,
      );
      if (conflicts.length > 0)
        throw new Error("Room is already booked for these dates");

      const roomTotal = nights * room.ratePerNight;
      const vatAmount = Math.round(roomTotal * VAT_RATE);
      const grandTotal = roomTotal + vatAmount;

      const [{ id }] = await db
        .insert(bookings)
        .values({
          roomId: input.roomId,
          guestName: input.guestName,
          guestPhone: input.guestPhone,
          guestEmail: input.guestEmail || null,
          checkIn: input.checkIn as unknown as Date,
          checkOut: input.checkOut as unknown as Date,
          adults: input.adults,
          children: input.children,
          nights,
          roomTotal,
          vatAmount,
          grandTotal,
          notes: input.notes || null,
        })
        .$returningId();
      return { id, nights, roomTotal, vatAmount, grandTotal };
    }),

  checkIn: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(bookings)
        .set({ status: "checked_in", checkedInAt: new Date() })
        .where(and(eq(bookings.id, input.id), eq(bookings.status, "confirmed")));
      return { ok: true };
    }),

  checkOut: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const b = await db.query.bookings.findFirst({
        where: eq(bookings.id, input.id),
      });
      if (!b) throw new Error("Booking not found");
      await db
        .update(bookings)
        .set({ status: "checked_out", checkedOutAt: new Date() })
        .where(eq(bookings.id, input.id));
      await db
        .update(rooms)
        .set({ housekeeping: "cleaning" })
        .where(eq(rooms.id, b.roomId));
      return { ok: true };
    }),

  cancel: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(bookings)
        .set({ status: "cancelled" })
        .where(eq(bookings.id, input.id));
      return { ok: true };
    }),
});

export const posRouter = createRouter({
  menu: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(menuItems).where(eq(menuItems.available, true));
  }),

  orders: publicQuery.query(async () => {
    const db = getDb();
    const orders = await db
      .select()
      .from(posOrders)
      .orderBy(sql`${posOrders.createdAt} DESC`)
      .limit(100);
    const items = await db.select().from(posOrderItems);
    const byOrder = new Map<number, typeof items>();
    for (const it of items) {
      const arr = byOrder.get(it.orderId) ?? [];
      arr.push(it);
      byOrder.set(it.orderId, arr);
    }
    return orders.map((o) => ({ ...o, items: byOrder.get(o.id) ?? [] }));
  }),

  createOrder: publicQuery
    .input(
      z.object({
        label: z.string().min(1),
        bookingId: z.number().optional(),
        items: z
          .array(z.object({ menuItemId: z.number(), qty: z.number().int().min(1) }))
          .min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const menu = await db.select().from(menuItems);
      const menuMap = new Map(menu.map((m) => [m.id, m]));

      let subtotal = 0;
      const lines: Array<{
        menuItemId: number;
        name: string;
        unitPrice: number;
        qty: number;
      }> = [];
      for (const it of input.items) {
        const m = menuMap.get(it.menuItemId);
        if (!m) throw new Error(`Menu item ${it.menuItemId} not found`);
        subtotal += m.price * it.qty;
        lines.push({
          menuItemId: m.id,
          name: m.name,
          unitPrice: m.price,
          qty: it.qty,
        });
      }
      const serviceCharge = Math.round(subtotal * SERVICE_CHARGE_RATE);
      const vatAmount = Math.round((subtotal + serviceCharge) * VAT_RATE);
      const total = subtotal + serviceCharge + vatAmount;

      const [{ id }] = await db
        .insert(posOrders)
        .values({
          label: input.label,
          bookingId: input.bookingId ?? null,
          subtotal,
          serviceCharge,
          vatAmount,
          total,
        })
        .$returningId();
      await db.insert(posOrderItems).values(
        lines.map((l) => ({
          orderId: id,
          menuItemId: l.menuItemId,
          name: l.name,
          unitPrice: l.unitPrice,
          qty: l.qty,
        })),
      );
      return { id, subtotal, serviceCharge, vatAmount, total };
    }),

  pay: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(posOrders)
        .set({ status: "paid", paidAt: new Date() })
        .where(and(eq(posOrders.id, input.id), eq(posOrders.status, "open")));
      return { ok: true };
    }),

  cancelOrder: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(posOrders)
        .set({ status: "cancelled" })
        .where(eq(posOrders.id, input.id));
      return { ok: true };
    }),

  // ── Admin: restaurant menu management ────────────────────────
  fullMenu: authedQuery.query(async () => {
    const db = getDb();
    return db.select().from(menuItems).orderBy(menuItems.category, menuItems.name);
  }),

  createMenuItem: adminQuery
    .input(
      z.object({
        name: z.string().min(1).max(120),
        category: z.enum(["starter", "main", "dessert", "beverage"]),
        price: z.number().int().min(0),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [{ id }] = await db.insert(menuItems).values(input).$returningId();
      return { id };
    }),

  updateMenuItem: adminQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(120).optional(),
        category: z.enum(["starter", "main", "dessert", "beverage"]).optional(),
        price: z.number().int().min(0).optional(),
        available: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...patch } = input;
      await db.update(menuItems).set(patch).where(eq(menuItems.id, id));
      return { ok: true };
    }),

  deleteMenuItem: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(menuItems).where(eq(menuItems.id, input.id));
      return { ok: true };
    }),
});

export const reportsRouter = createRouter({
  summary: publicQuery
    .input(z.object({ from: z.string(), to: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();

      const rangeBookings = await db
        .select()
        .from(bookings)
        .where(
          and(
            ne(bookings.status, "cancelled"),
            gte(bookings.checkIn, input.from as unknown as Date),
            lte(bookings.checkIn, input.to as unknown as Date),
          ),
        );

      const rangePos = await db
        .select()
        .from(posOrders)
        .where(
          and(
            eq(posOrders.status, "paid"),
            gte(posOrders.paidAt, new Date(`${input.from}T00:00:00`)),
            lt(posOrders.paidAt, new Date(`${input.to}T23:59:59.999`)),
          ),
        );

      const roomRevenue = rangeBookings.reduce((s, b) => s + b.grandTotal, 0);
      const roomVat = rangeBookings.reduce((s, b) => s + b.vatAmount, 0);
      const posRevenue = rangePos.reduce((s, o) => s + o.total, 0);
      const posVat = rangePos.reduce((s, o) => s + o.vatAmount, 0);
      const posService = rangePos.reduce((s, o) => s + o.serviceCharge, 0);

      // Daily breakdown
      const daily = new Map<
        string,
        { date: string; room: number; pos: number; vat: number }
      >();
      const bump = (date: string, key: "room" | "pos" | "vat", amt: number) => {
        const row = daily.get(date) ?? { date, room: 0, pos: 0, vat: 0 };
        row[key] += amt;
        daily.set(date, row);
      };
      for (const b of rangeBookings) {
        const d =
          b.checkIn instanceof Date
            ? b.checkIn.toISOString().slice(0, 10)
            : String(b.checkIn);
        bump(d, "room", b.grandTotal);
        bump(d, "vat", b.vatAmount);
      }
      for (const o of rangePos) {
        const d = o.paidAt
          ? new Date(o.paidAt).toISOString().slice(0, 10)
          : input.from;
        bump(d, "pos", o.total);
        bump(d, "vat", o.vatAmount);
      }

      // Monthly breakdown
      const monthly = new Map<
        string,
        { month: string; room: number; pos: number; vat: number }
      >();
      for (const row of daily.values()) {
        const m = row.date.slice(0, 7);
        const agg = monthly.get(m) ?? { month: m, room: 0, pos: 0, vat: 0 };
        agg.room += row.room;
        agg.pos += row.pos;
        agg.vat += row.vat;
        monthly.set(m, agg);
      }

      return {
        from: input.from,
        to: input.to,
        roomRevenue,
        roomVat,
        posRevenue,
        posVat,
        posService,
        totalRevenue: roomRevenue + posRevenue,
        totalVat: roomVat + posVat,
        bookingCount: rangeBookings.length,
        posOrderCount: rangePos.length,
        roomNights: rangeBookings.reduce((s, b) => s + b.nights, 0),
        daily: Array.from(daily.values()).sort((a, b) =>
          a.date.localeCompare(b.date),
        ),
        monthly: Array.from(monthly.values()).sort((a, b) =>
          a.month.localeCompare(b.month),
        ),
      };
    }),
});
