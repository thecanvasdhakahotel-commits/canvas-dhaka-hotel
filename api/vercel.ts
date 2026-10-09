// Vercel serverless entry — adapts the bundled Hono app to a Vercel function.
import { handle } from "hono/vercel";
import app from "../dist/boot.js";

export default handle(app);
