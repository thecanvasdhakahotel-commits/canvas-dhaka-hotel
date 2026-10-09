import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/providers/auth";
import { ROOM_TYPES, ROOM_TYPE_LABELS } from "@contracts/types";
import { bdt } from "@/lib/format";
import { THEMES, applyTheme, getStoredTheme, type ThemeId } from "@/lib/themes";
import { exportToExcel, todayFileTag } from "@/lib/excel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, FileSpreadsheet, Check } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["starter", "main", "dessert", "beverage"] as const;

// ── Rooms tab ───────────────────────────────────────────────────
function RoomsTab() {
  const utils = trpc.useUtils();
  const { data: rooms, isLoading } = trpc.rooms.list.useQuery();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState({
    number: "",
    floor: "1",
    type: "standard_single" as (typeof ROOM_TYPES)[number],
    ratePerNight: "",
  });

  const invalidate = () => {
    utils.rooms.list.invalidate();
    utils.rooms.dashboard.invalidate();
  };
  const save = trpc.rooms.createRoom.useMutation({
    onSuccess: () => {
      toast.success("Room added");
      invalidate();
      setOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });
  const update = trpc.rooms.updateRoom.useMutation({
    onSuccess: () => {
      toast.success("Room updated");
      invalidate();
      setOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });
  const del = trpc.rooms.deleteRoom.useMutation({
    onSuccess: () => {
      toast.success("Room deleted");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const openNew = () => {
    setEditing(null);
    setForm({ number: "", floor: "1", type: "standard_single", ratePerNight: "" });
    setOpen(true);
  };
  const openEdit = (r: NonNullable<typeof rooms>[number]) => {
    setEditing(r.id);
    setForm({
      number: r.number,
      floor: String(r.floor),
      type: r.type,
      ratePerNight: String(r.ratePerNight),
    });
    setOpen(true);
  };
  const submit = () => {
    const payload = {
      number: form.number.trim(),
      floor: Number(form.floor),
      type: form.type,
      ratePerNight: Number(form.ratePerNight),
    };
    if (!payload.number || isNaN(payload.ratePerNight))
      return toast.error("Room number and rent are required");
    if (editing) update.mutate({ id: editing, ...payload });
    else save.mutate(payload);
  };

  return (
    <div>
      <div className="flex justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          Add, edit or remove rooms and set room rent (per night, BDT)
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (!rooms?.length) return;
              exportToExcel(
                rooms.map((r) => ({
                  "Room #": r.number,
                  Floor: r.floor,
                  Type: ROOM_TYPE_LABELS[r.type],
                  "Rent/Night (BDT)": r.ratePerNight,
                  Housekeeping: r.housekeeping,
                })),
                "Rooms",
                `rooms-${todayFileTag()}`,
              );
              toast.success("Excel file downloaded");
            }}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
          </Button>
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" /> Add Room
          </Button>
        </div>
      </div>
      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Room #</TableHead>
              <TableHead>Floor</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Rent / Night</TableHead>
              <TableHead>Housekeeping</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">Loading…</TableCell>
              </TableRow>
            )}
            {rooms?.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.number}</TableCell>
                <TableCell>{r.floor}</TableCell>
                <TableCell>{ROOM_TYPE_LABELS[r.type]}</TableCell>
                <TableCell className="text-right font-medium">{bdt(r.ratePerNight)}</TableCell>
                <TableCell>
                  <Badge variant="outline">{r.housekeeping}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => {
                        if (confirm(`Delete room ${r.number}?`)) del.mutate({ id: r.id });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Room" : "Add Room"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Room #</Label>
              <Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Floor</Label>
              <Input type="number" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v as typeof form.type })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROOM_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{ROOM_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Rent per Night (BDT)</Label>
              <Input type="number" value={form.ratePerNight} onChange={(e) => setForm({ ...form, ratePerNight: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={save.isPending || update.isPending}>
              {editing ? "Save" : "Add Room"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Menu tab ────────────────────────────────────────────────────
function MenuTab() {
  const utils = trpc.useUtils();
  const { data: menu, isLoading } = trpc.pos.fullMenu.useQuery();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    category: "main" as (typeof CATEGORIES)[number],
    price: "",
  });

  const invalidate = () => {
    utils.pos.fullMenu.invalidate();
    utils.pos.menu.invalidate();
  };
  const save = trpc.pos.createMenuItem.useMutation({
    onSuccess: () => {
      toast.success("Menu item added");
      invalidate();
      setOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });
  const update = trpc.pos.updateMenuItem.useMutation({
    onSuccess: () => {
      toast.success("Menu updated");
      invalidate();
      setOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });
  const del = trpc.pos.deleteMenuItem.useMutation({
    onSuccess: () => {
      toast.success("Item deleted");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", category: "main", price: "" });
    setOpen(true);
  };
  const openEdit = (m: NonNullable<typeof menu>[number]) => {
    setEditing(m.id);
    setForm({ name: m.name, category: m.category, price: String(m.price) });
    setOpen(true);
  };
  const submit = () => {
    const payload = { name: form.name.trim(), category: form.category, price: Number(form.price) };
    if (!payload.name || isNaN(payload.price)) return toast.error("Name and price required");
    if (editing) update.mutate({ id: editing, ...payload });
    else save.mutate(payload);
  };

  return (
    <div>
      <div className="flex justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          Manage restaurant menu items and prices (BDT)
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (!menu?.length) return;
              exportToExcel(
                menu.map((m) => ({
                  Item: m.name,
                  Category: m.category,
                  "Price (BDT)": m.price,
                  Available: m.available ? "Yes" : "No",
                })),
                "Menu",
                `restaurant-menu-${todayFileTag()}`,
              );
              toast.success("Excel file downloaded");
            }}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
          </Button>
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" /> Add Item
          </Button>
        </div>
      </div>
      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Available</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">Loading…</TableCell>
              </TableRow>
            )}
            {menu?.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.name}</TableCell>
                <TableCell className="capitalize">{m.category}</TableCell>
                <TableCell className="text-right font-medium">{bdt(m.price)}</TableCell>
                <TableCell>
                  <Switch
                    checked={m.available}
                    onCheckedChange={(v) => update.mutate({ id: m.id, available: v })}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(m)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => {
                        if (confirm(`Delete "${m.name}"?`)) del.mutate({ id: m.id });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Menu Item" : "Add Menu Item"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <Label>Item Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v as typeof form.category })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Price (BDT)</Label>
              <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={save.isPending || update.isPending}>
              {editing ? "Save" : "Add Item"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Users tab (admin only) ──────────────────────────────────────
function UsersTab() {
  const { user: me } = useAuth();
  const utils = trpc.useUtils();
  const { data: users, isLoading } = trpc.auth.listUsers.useQuery();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState({
    username: "",
    name: "",
    password: "",
    role: "staff" as "admin" | "staff",
  });

  const invalidate = () => utils.auth.listUsers.invalidate();
  const create = trpc.auth.createUser.useMutation({
    onSuccess: () => {
      toast.success("User created");
      invalidate();
      setOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });
  const update = trpc.auth.updateUser.useMutation({
    onSuccess: () => {
      toast.success("User updated");
      invalidate();
      setOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const openNew = () => {
    setEditing(null);
    setForm({ username: "", name: "", password: "", role: "staff" });
    setOpen(true);
  };
  const openEdit = (u: NonNullable<typeof users>[number]) => {
    setEditing(u.id);
    setForm({ username: u.username, name: u.name, password: "", role: u.role });
    setOpen(true);
  };
  const submit = () => {
    if (editing) {
      update.mutate({
        id: editing,
        name: form.name,
        role: form.role,
        ...(form.password ? { password: form.password } : {}),
      });
    } else {
      if (!form.username || !form.password) return toast.error("Username and password required");
      create.mutate(form);
    }
  };

  return (
    <div>
      <div className="flex justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          Admin has full access; staff can use front desk, bookings, registration &amp; POS
        </p>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" /> Add User
        </Button>
      </div>
      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">Loading…</TableCell>
              </TableRow>
            )}
            {users?.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.username}</TableCell>
                <TableCell>{u.name}</TableCell>
                <TableCell>
                  <Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role}</Badge>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={u.active}
                    disabled={u.id === me?.id}
                    onCheckedChange={(v) => update.mutate({ id: u.id, active: v })}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(u)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit User" : "Add User"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Username</Label>
              <Input
                value={form.username}
                disabled={!!editing}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Full Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>{editing ? "New Password (leave blank to keep)" : "Password"}</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v as "admin" | "staff" })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff (User)</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={create.isPending || update.isPending}>
              {editing ? "Save" : "Create User"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Theme tab ───────────────────────────────────────────────────
function ThemeTab() {
  const [current, setCurrent] = useState<ThemeId>(getStoredTheme());
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        Choose a color theme for the whole application
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              applyTheme(t.id);
              setCurrent(t.id);
            }}
            className={`rounded-lg border-2 p-4 text-left transition-all hover:shadow-md ${
              current === t.id ? "border-accent shadow-md" : "border-border"
            }`}
          >
            <div
              className="h-16 rounded-md mb-3"
              style={{ background: `linear-gradient(135deg, ${t.swatch} 60%, ${t.swatch}cc)` }}
            />
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{t.label}</span>
              {current === t.id && <Check className="h-4 w-4 text-accent" />}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Rooms &amp; rent, restaurant menu, users and appearance
        </p>
      </div>
      <Tabs defaultValue={isAdmin ? "rooms" : "theme"}>
        <TabsList>
          {isAdmin && <TabsTrigger value="rooms">Rooms &amp; Rent</TabsTrigger>}
          {isAdmin && <TabsTrigger value="menu">Restaurant Menu</TabsTrigger>}
          {isAdmin && <TabsTrigger value="users">Users</TabsTrigger>}
          <TabsTrigger value="theme">Themes</TabsTrigger>
        </TabsList>
        {isAdmin && (
          <TabsContent value="rooms" className="mt-6">
            <RoomsTab />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="menu" className="mt-6">
            <MenuTab />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="users" className="mt-6">
            <UsersTab />
          </TabsContent>
        )}
        <TabsContent value="theme" className="mt-6">
          <ThemeTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
