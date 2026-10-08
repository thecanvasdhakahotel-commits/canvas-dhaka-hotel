// Bangladesh hotel tax configuration shared between frontend and backend.
export const VAT_RATE = 0.15; // 15% VAT
export const SERVICE_CHARGE_RATE = 0.1; // 10% service charge (restaurant/POS)

export const ROOM_TYPES = [
  "standard_single",
  "standard_double",
  "deluxe",
  "executive_suite",
  "presidential_suite",
] as const;

export const ROOM_TYPE_LABELS: Record<(typeof ROOM_TYPES)[number], string> = {
  standard_single: "Standard Single",
  standard_double: "Standard Double",
  deluxe: "Deluxe",
  executive_suite: "Executive Suite",
  presidential_suite: "Presidential Suite",
};

export const HOTEL_NAME = "The Canvas Dhaka Hotel";
export const HOTEL_ADDRESS = "House # 221, Road # 13, Sector # 10, Uttara, Dhaka-1230";
export const HOTEL_PHONES = "+880 1814-006555";

export * from "./errors";
