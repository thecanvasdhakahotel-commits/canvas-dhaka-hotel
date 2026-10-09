// Vercel serverless entry — adapts the Hono app to a Vercel function.
import { handle } from "hono/vercel";
import app from "./boot.ts"; // এখানে শেষে .ts যুক্ত করা হয়েছে

export default handle(app);
