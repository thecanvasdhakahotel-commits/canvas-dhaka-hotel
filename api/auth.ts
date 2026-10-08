import crypto from "node:crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { users } from "@db/schema";
import { env } from "./lib/env";

// ── Password hashing (scrypt) ──────────────────────────────────
export function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 32).toString("hex");
}
export function newSalt(): string {
  return crypto.randomBytes(16).toString("hex");
}

// ── Signed session tokens (HMAC-SHA256, 12h expiry) ───────────
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

type TokenPayload = { uid: number; role: "admin" | "staff"; exp: number };

function secretKey(): string {
  return env.appSecret || "canvas-dhaka-dev-secret";
}

export function signToken(payload: Omit<TokenPayload, "exp">): string {
  const body: TokenPayload = { ...payload, exp: Date.now() + TOKEN_TTL_MS };
  const data = Buffer.from(JSON.stringify(body)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", secretKey())
    .update(data)
    .digest("base64url");
  return `${data}.${sig}`;
}

export function verifyToken(token: string): TokenPayload | null {
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const expected = crypto
    .createHmac("sha256", secretKey())
    .update(data)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(data, "base64url").toString(),
    ) as TokenPayload;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// ── Authenticated procedures ──────────────────────────────────
async function resolveUser(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const payload = token ? verifyToken(token) : null;
  if (!payload) return null;
  const db = getDb();
  const user = await db.query.users.findFirst({
    where: eq(users.id, payload.uid),
  });
  if (!user || !user.active) return null;
  return user;
}

export const authedQuery = publicQuery.use(async ({ ctx, next }) => {
  const user = await resolveUser(ctx.req);
  if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, user } });
});

export const adminQuery = authedQuery.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});

// ── Auth router ────────────────────────────────────────────────
export const authRouter = createRouter({
  login: publicQuery
    .input(z.object({ username: z.string().min(1), password: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const user = await db.query.users.findFirst({
        where: eq(users.username, input.username.trim().toLowerCase()),
      });
      if (!user || !user.active) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid username or password" });
      const hash = hashPassword(input.password, user.salt);
      const a = Buffer.from(hash);
      const b = Buffer.from(user.passwordHash);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b))
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid username or password" });
      return {
        token: signToken({ uid: user.id, role: user.role }),
        user: { id: user.id, username: user.username, name: user.name, role: user.role },
      };
    }),

  me: authedQuery.query(({ ctx }) => ({
    id: ctx.user.id,
    username: ctx.user.username,
    name: ctx.user.name,
    role: ctx.user.role,
  })),

  changePassword: authedQuery
    .input(z.object({ current: z.string().min(1), next: z.string().min(4) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const hash = hashPassword(input.current, ctx.user.salt);
      if (hash !== ctx.user.passwordHash)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Current password is wrong" });
      const salt = newSalt();
      await db
        .update(users)
        .set({ salt, passwordHash: hashPassword(input.next, salt) })
        .where(eq(users.id, ctx.user.id));
      return { ok: true };
    }),

  listUsers: adminQuery.query(async () => {
    const db = getDb();
    const rows = await db.select().from(users);
    return rows.map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      role: u.role,
      active: u.active,
      createdAt: u.createdAt,
    }));
  }),

  createUser: adminQuery
    .input(
      z.object({
        username: z.string().min(3).max(60),
        name: z.string().min(1).max(120),
        password: z.string().min(4),
        role: z.enum(["admin", "staff"]),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const username = input.username.trim().toLowerCase();
      const existing = await db.query.users.findFirst({
        where: eq(users.username, username),
      });
      if (existing)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Username already taken" });
      const salt = newSalt();
      const [{ id }] = await db
        .insert(users)
        .values({
          username,
          name: input.name,
          salt,
          passwordHash: hashPassword(input.password, salt),
          role: input.role,
        })
        .$returningId();
      return { id };
    }),

  updateUser: adminQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(120).optional(),
        role: z.enum(["admin", "staff"]).optional(),
        active: z.boolean().optional(),
        password: z.string().min(4).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      if (input.id === ctx.user.id && input.active === false)
        throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot deactivate your own account" });
      const patch: Partial<typeof users.$inferInsert> = {};
      if (input.name) patch.name = input.name;
      if (input.role) patch.role = input.role;
      if (input.active !== undefined) patch.active = input.active;
      if (input.password) {
        const salt = newSalt();
        patch.salt = salt;
        patch.passwordHash = hashPassword(input.password, salt);
      }
      await db.update(users).set(patch).where(eq(users.id, input.id));
      return { ok: true };
    }),
});
