import {
  mysqlTable,
  mysqlEnum,
  varchar,
  text,
  timestamp,
  date,
  int,
  bigint,
  boolean,
} from "drizzle-orm/mysql-core";

export const rooms = mysqlTable("rooms", {
  id: bigint("id", { mode: "number", unsigned: true })
    .autoincrement()
    .primaryKey(),
  number: varchar("number", { length: 10 }).notNull().unique(),
  floor: int("floor").notNull(),
  type: mysqlEnum("type", [
    "standard_single",
    "standard_double",
    "deluxe",
    "executive_suite",
    "presidential_suite",
  ]).notNull(),
  ratePerNight: int("rate_per_night").notNull(), // BDT
  housekeeping: mysqlEnum("housekeeping", ["ready", "cleaning", "maintenance"])
    .notNull()
    .default("ready"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const bookings = mysqlTable("bookings", {
  id: bigint("id", { mode: "number", unsigned: true })
    .autoincrement()
    .primaryKey(),
  roomId: bigint("room_id", { mode: "number", unsigned: true }).notNull(),
  guestName: varchar("guest_name", { length: 120 }).notNull(),
  guestPhone: varchar("guest_phone", { length: 40 }).notNull(),
  guestEmail: varchar("guest_email", { length: 160 }),
  checkIn: date("check_in").notNull(),
  checkOut: date("check_out").notNull(),
  adults: int("adults").notNull().default(1),
  children: int("children").notNull().default(0),
  status: mysqlEnum("status", [
    "confirmed",
    "checked_in",
    "checked_out",
    "cancelled",
  ])
    .notNull()
    .default("confirmed"),
  nights: int("nights").notNull(),
  roomTotal: int("room_total").notNull(), // BDT, net (before VAT)
  vatAmount: int("vat_amount").notNull(), // BDT
  grandTotal: int("grand_total").notNull(), // BDT incl. VAT
  notes: text("notes"),
  checkedInAt: timestamp("checked_in_at"),
  checkedOutAt: timestamp("checked_out_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const menuItems = mysqlTable("menu_items", {
  id: bigint("id", { mode: "number", unsigned: true })
    .autoincrement()
    .primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  category: mysqlEnum("category", [
    "starter",
    "main",
    "dessert",
    "beverage",
  ]).notNull(),
  price: int("price").notNull(), // BDT
  available: boolean("available").notNull().default(true),
});

export const posOrders = mysqlTable("pos_orders", {
  id: bigint("id", { mode: "number", unsigned: true })
    .autoincrement()
    .primaryKey(),
  label: varchar("label", { length: 80 }).notNull(), // e.g. "Table 5" or "Room 302"
  bookingId: bigint("booking_id", { mode: "number", unsigned: true }),
  status: mysqlEnum("status", ["open", "paid", "cancelled"])
    .notNull()
    .default("open"),
  subtotal: int("subtotal").notNull().default(0), // BDT
  serviceCharge: int("service_charge").notNull().default(0), // BDT
  vatAmount: int("vat_amount").notNull().default(0), // BDT
  total: int("total").notNull().default(0), // BDT
  createdAt: timestamp("created_at").notNull().defaultNow(),
  paidAt: timestamp("paid_at"),
});

export const posOrderItems = mysqlTable("pos_order_items", {
  id: bigint("id", { mode: "number", unsigned: true })
    .autoincrement()
    .primaryKey(),
  orderId: bigint("order_id", { mode: "number", unsigned: true }).notNull(),
  menuItemId: bigint("menu_item_id", {
    mode: "number",
    unsigned: true,
  }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  unitPrice: int("unit_price").notNull(), // BDT snapshot
  qty: int("qty").notNull(),
});

export const users = mysqlTable("users", {
  id: bigint("id", { mode: "number", unsigned: true })
    .autoincrement()
    .primaryKey(),
  username: varchar("username", { length: 60 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  passwordHash: varchar("password_hash", { length: 200 }).notNull(),
  salt: varchar("salt", { length: 64 }).notNull(),
  role: mysqlEnum("role", ["admin", "staff"]).notNull().default("staff"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Guest Registration Card — mirrors the hotel's printed registration card
export const registrationCards = mysqlTable("registration_cards", {
  id: bigint("id", { mode: "number", unsigned: true })
    .autoincrement()
    .primaryKey(),
  regCardNo: varchar("reg_card_no", { length: 30 }),
  bookingId: bigint("booking_id", { mode: "number", unsigned: true }),
  roomId: bigint("room_id", { mode: "number", unsigned: true }),
  title: varchar("title", { length: 10 }), // Mr / Mrs / Miss
  guestName: varchar("guest_name", { length: 120 }).notNull(),
  address: text("address"),
  nationality: varchar("nationality", { length: 60 }),
  dateOfBirth: varchar("date_of_birth", { length: 20 }),
  purposeOfTravel: varchar("purpose_of_travel", { length: 120 }),
  durationOfStay: varchar("duration_of_stay", { length: 60 }),
  profession: varchar("profession", { length: 120 }),
  localAgent: varchar("local_agent", { length: 160 }), // Local Agent / Company
  visaImmRegNo: varchar("visa_imm_reg_no", { length: 80 }), // Visa / Imm / Reg. #
  placeDateOfIssue: varchar("place_date_of_issue", { length: 160 }),
  passportNo: varchar("passport_no", { length: 60 }),
  nidNo: varchar("nid_no", { length: 60 }),
  dateOfEntryBd: varchar("date_of_entry_bd", { length: 20 }), // Date of Entry in Bangladesh
  visaIssueDate: varchar("visa_issue_date", { length: 20 }),
  visaExpiryDate: varchar("visa_expiry_date", { length: 20 }),
  mobile: varchar("mobile", { length: 40 }),
  tel: varchar("tel", { length: 40 }),
  tariff: int("tariff"), // BDT room tariff
  modeOfPayment: mysqlEnum("mode_of_payment", [
    "individual",
    "company",
    "others",
  ]).default("individual"),
  checkInDate: varchar("check_in_date", { length: 20 }),
  checkInTime: varchar("check_in_time", { length: 10 }),
  checkOutDate: varchar("check_out_date", { length: 20 }),
  checkOutTime: varchar("check_out_time", { length: 10 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export type User = typeof users.$inferSelect;
export type RegistrationCard = typeof registrationCards.$inferSelect;
export type Room = typeof rooms.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type MenuItem = typeof menuItems.$inferSelect;
export type PosOrder = typeof posOrders.$inferSelect;
export type PosOrderItem = typeof posOrderItems.$inferSelect;
