// Vercel serverless entry — adapts the Hono app to a Vercel function.
import { handle } from "hono/vercel";
import app from "./boot";

export default handle(app);
