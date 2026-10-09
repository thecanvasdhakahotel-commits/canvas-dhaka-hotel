import { useMemo, useState } from "react";
import { trpc } from "@/providers/trpc";
import { bdt } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Minus, Plus, ReceiptText, Trash2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { exportToExcel, todayFileTag } from "@/lib/excel";

type CartItem = { menuItemId: number; name: string; price: number; qty: number };

const CATEGORIES = ["starter", "main", "dessert", "beverage"] as const;

export default function Pos() {
  const { data: menu } = trpc.pos.menu.useQuery();
  const { data: orders, refetch } = trpc.pos.orders.useQuery();
  const utils = trpc.useUtils();

  const [label, setLabel] = useState("");
  const [tab, setTab] = useState<string>("main");
  const [cart, setCart] = useState<CartItem[]>([]);

  const add = (id: number, name: string, price: number) => {
    setCart((c) => {
      const ex = c.find((i) => i.menuItemId === id);
      if (ex)
        return c.map((i) =>
          i.menuItemId === id ? { ...i, qty: i.qty + 1 } : i,
        );
      return [...c, { menuItemId: id, name, price, qty: 1 }];
    });
  };
  const dec = (id: number) =>
    setCart((c) =>
      c
        .map((i) => (i.menuItemId === id ? { ...i, qty: i.qty - 1 } : i))
        .filter((i) => i.qty > 0),
    );

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const service = Math.round(subtotal * 0.1);
  const vat = Math.round((subtotal + service) * 0.15);
  const total = subtotal + service + vat;

  const createOrder = trpc.pos.createOrder.useMutation({
    onSuccess: (r) => {
      toast.success(`Order #${r.id} created — ${bdt(r.total)}`);
      setCart([]);
      setLabel("");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  const pay = trpc.pos.pay.useMutation({
    onSuccess: () => {
      toast.success("Order marked as paid");
      refetch();
      utils.reports.summary.invalidate();
    },
  });
  const cancelOrder = trpc.pos.cancelOrder.useMutation({
    onSuccess: () => refetch(),
  });

  const filtered = useMemo(
    () => menu?.filter((m) => m.category === tab) ?? [],
    [menu, tab],
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Restaurant POS</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Restaurant billing — 10% service charge + 15% VAT
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            if (!orders?.length) return toast.error("No orders to export");
            exportToExcel(
              orders.map((o) => ({
                "Order #": o.id,
                "Table/Room": o.label,
                Items: o.items.map((i) => `${i.name} x${i.qty}`).join(", "),
                "Subtotal (BDT)": o.subtotal,
                "Service Charge (BDT)": o.serviceCharge,
                "VAT (BDT)": o.vatAmount,
                "Total (BDT)": o.total,
                Status: o.status,
                "Created At": o.createdAt ? new Date(o.createdAt).toLocaleString() : "",
              })),
              "POS Orders",
              `pos-orders-${todayFileTag()}`,
            );
            toast.success("Excel file downloaded");
          }}
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" /> Export Excel
        </Button>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Menu */}
        <div className="lg:col-span-3">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              {CATEGORIES.map((c) => (
                <TabsTrigger key={c} value={c} className="capitalize">
                  {c}s
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 mt-4">
            {filtered.map((m) => (
              <button
                key={m.id}
                onClick={() => add(m.id, m.name, m.price)}
                className="text-left bg-card rounded-lg border p-3 hover:border-primary transition-colors"
              >
                <div className="text-sm font-medium leading-snug">{m.name}</div>
                <div className="text-sm text-[#af915f] font-semibold mt-1">
                  {bdt(m.price)}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Bill */}
        <div className="lg:col-span-2">
          <div className="bg-card rounded-lg border p-4 sticky top-6">
            <div className="flex items-center gap-2 mb-3">
              <ReceiptText className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Table 5 / Room 302…"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            {cart.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Tap menu items to build the bill
              </p>
            )}
            <div className="space-y-2">
              {cart.map((i) => (
                <div key={i.menuItemId} className="flex items-center gap-2 text-sm">
                  <div className="flex-1 leading-snug">{i.name}</div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => dec(i.menuItemId)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center">{i.qty}</span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-6 w-6"
                      onClick={() => add(i.menuItemId, i.name, i.price)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="w-20 text-right font-medium">
                    {bdt(i.price * i.qty)}
                  </div>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div className="mt-4 pt-3 border-t text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{bdt(subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Service charge (10%)</span>
                  <span>{bdt(service)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>VAT (15%)</span>
                  <span>{bdt(vat)}</span>
                </div>
                <div className="flex justify-between font-semibold text-base pt-1 border-t">
                  <span>Total</span>
                  <span>{bdt(total)}</span>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1"
                    disabled={!label || createOrder.isPending}
                    onClick={() =>
                      createOrder.mutate({
                        label,
                        items: cart.map((i) => ({ menuItemId: i.menuItemId, qty: i.qty })),
                      })
                    }
                  >
                    Create Order
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setCart([])}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <h2 className="font-display text-xl font-semibold mt-10 mb-3">
        Recent Orders
      </h2>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {orders?.map((o) => (
          <div key={o.id} className="bg-card rounded-lg border p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium">
                #{o.id} · {o.label}
              </div>
              <Badge
                variant={
                  o.status === "paid"
                    ? "default"
                    : o.status === "cancelled"
                      ? "destructive"
                      : "secondary"
                }
              >
                {o.status}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              {o.items.map((i) => (
                <div key={i.id} className="flex justify-between">
                  <span>
                    {i.qty}× {i.name}
                  </span>
                  <span>{bdt(i.unitPrice * i.qty)}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-3 pt-2 border-t text-sm">
              <span className="text-muted-foreground">
                incl. service {bdt(o.serviceCharge)} + VAT {bdt(o.vatAmount)}
              </span>
              <span className="font-semibold">{bdt(o.total)}</span>
            </div>
            {o.status === "open" && (
              <div className="flex gap-2 mt-3">
                <Button size="sm" className="flex-1" onClick={() => pay.mutate({ id: o.id })}>
                  Mark Paid
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => cancelOrder.mutate({ id: o.id })}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        ))}
        {orders?.length === 0 && (
          <p className="text-sm text-muted-foreground">No orders yet.</p>
        )}
      </div>
    </div>
  );
}
