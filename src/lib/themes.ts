export const THEMES = [
  { id: "classic", label: "Emerald Gold", swatch: "#1d5c46" },
  { id: "ocean", label: "Ocean Blue", swatch: "#1e5a8f" },
  { id: "maroon", label: "Royal Maroon", swatch: "#7c2440" },
  { id: "slate", label: "Slate Modern", swatch: "#39445e" },
  { id: "midnight", label: "Midnight Dark", swatch: "#14141f" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

const KEY = "hotel-theme";

export function getStoredTheme(): ThemeId {
  const t = localStorage.getItem(KEY);
  return (THEMES.some((x) => x.id === t) ? t : "classic") as ThemeId;
}

export function applyTheme(id: ThemeId) {
  if (id === "classic") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", id);
  localStorage.setItem(KEY, id);
}
