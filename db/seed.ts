import "dotenv/config";
import { getDb } from "../api/queries/connection";
import { rooms, menuItems, users } from "./schema";
import { hashPassword, newSalt } from "../api/auth";

const ROOM_SEED: Array<{
  number: string;
  floor: number;
  type:
    | "standard_single"
    | "standard_double"
    | "deluxe"
    | "executive_suite"
    | "presidential_suite";
  rate: number;
}> = [
  // Floor 1–2: standards
  ...[1, 2].flatMap((f) => [
    { number: `${f}01`, floor: f, type: "standard_single" as const, rate: 4500 },
    { number: `${f}02`, floor: f, type: "standard_single" as const, rate: 4500 },
    { number: `${f}03`, floor: f, type: "standard_double" as const, rate: 6500 },
    { number: `${f}04`, floor: f, type: "standard_double" as const, rate: 6500 },
    { number: `${f}05`, floor: f, type: "standard_double" as const, rate: 6800 },
  ]),
  // Floor 3–4: deluxe
  ...[3, 4].flatMap((f) => [
    { number: `${f}01`, floor: f, type: "deluxe" as const, rate: 9500 },
    { number: `${f}02`, floor: f, type: "deluxe" as const, rate: 9500 },
    { number: `${f}03`, floor: f, type: "deluxe" as const, rate: 9800 },
    { number: `${f}04`, floor: f, type: "deluxe" as const, rate: 9800 },
  ]),
  // Floor 5: executive suites
  ...[1, 2, 3].map((i) => ({
    number: `50${i}`,
    floor: 5,
    type: "executive_suite" as const,
    rate: 16000,
  })),
  // Floor 6: presidential
  { number: "601", floor: 6, type: "presidential_suite", rate: 35000 },
];

const MENU_SEED: Array<{
  name: string;
  category: "starter" | "main" | "dessert" | "beverage";
  price: number;
}> = [
  { name: "Chicken Samosa (2pc)", category: "starter", price: 180 },
  { name: "Fuchka Platter", category: "starter", price: 220 },
  { name: "Tom Yum Soup", category: "starter", price: 350 },
  { name: "Garden Salad", category: "starter", price: 300 },
  { name: "Kacchi Biryani (Mutton)", category: "main", price: 550 },
  { name: "Bhuna Khichuri with Beef", category: "main", price: 480 },
  { name: "Grilled Chicken Steak", category: "main", price: 720 },
  { name: "Pad Thai (Prawn)", category: "main", price: 640 },
  { name: "Beef Tehari", category: "main", price: 450 },
  { name: "Margherita Pizza", category: "main", price: 850 },
  { name: "Club Sandwich & Fries", category: "main", price: 520 },
  { name: "Firni", category: "dessert", price: 180 },
  { name: "Gulab Jamun (4pc)", category: "dessert", price: 160 },
  { name: "Chocolate Lava Cake", category: "dessert", price: 320 },
  { name: "Ice Cream (2 scoops)", category: "dessert", price: 240 },
  { name: "Borhani", category: "beverage", price: 120 },
  { name: "Fresh Lime Soda", category: "beverage", price: 140 },
  { name: "Mango Lassi", category: "beverage", price: 180 },
  { name: "Cappuccino", category: "beverage", price: 220 },
  { name: "Mineral Water (500ml)", category: "beverage", price: 60 },
];

async function seed() {
  const db = getDb();

  const existingRooms = await db.query.rooms.findMany({ limit: 1 });
  if (existingRooms.length === 0) {
    await db.insert(rooms).values(
      ROOM_SEED.map((r) => ({
        number: r.number,
        floor: r.floor,
        type: r.type,
        ratePerNight: r.rate,
      })),
    );
    console.log(`Seeded ${ROOM_SEED.length} rooms`);
  } else {
    console.log("Rooms already seeded, skipping");
  }

  const existingMenu = await db.query.menuItems.findMany({ limit: 1 });
  if (existingMenu.length === 0) {
    await db.insert(menuItems).values(MENU_SEED);
    console.log(`Seeded ${MENU_SEED.length} menu items`);
  } else {
    console.log("Menu already seeded, skipping");
  }

  const existingUsers = await db.query.users.findMany({ limit: 1 });
  if (existingUsers.length === 0) {
    const mk = (password: string) => {
      const salt = newSalt();
      return { salt, passwordHash: hashPassword(password, salt) };
    };
    await db.insert(users).values([
      { username: "admin", name: "Hotel Admin", role: "admin", ...mk("admin123") },
      { username: "staff", name: "Front Desk Staff", role: "staff", ...mk("staff123") },
    ]);
    console.log("Seeded users: admin/admin123 (admin), staff/staff123 (staff)");
  } else {
    console.log("Users already seeded, skipping");
  }

  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
