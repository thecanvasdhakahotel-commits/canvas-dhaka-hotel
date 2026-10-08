import { createRouter, publicQuery } from "./middleware";
import {
  roomsRouter,
  bookingsRouter,
  posRouter,
  reportsRouter,
} from "./hotel";
import { authRouter } from "./auth";
import { registrationsRouter } from "./registrations";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  rooms: roomsRouter,
  bookings: bookingsRouter,
  pos: posRouter,
  reports: reportsRouter,
  registrations: registrationsRouter,
});

export type AppRouter = typeof appRouter;
