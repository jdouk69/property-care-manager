import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Bell, CheckCheck, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { badgeTone } from "@/components/resource/ResourceListPage";

const TYPES = ["Task", "Inspection", "Maintenance", "Contractor", "System"];

export default function NotificationBell() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [fUnread, setFUnread] = useState(false);
  const [fUrgent, setFUrgent] = useState(false);
  const [fType, setFType] = useState("all");
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      setItems((await base44.entities.Notification.list("-created_date", 200)) || []);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    load();
    let unsub = () => {};
    try {
      unsub = base44.entities.Notification.subscribe(() => load());
    } catch (e) {}
    return unsub;
  }, []);

  const unread = items.filter((n) => !n.read).length;

  const filtered = useMemo(() => {
    return items.filter((n) => {
      if (fUnread && n.read) return false;
      if (fUrgent && !["High", "Urgent"].includes(n.priority)) return false;
      if (fType !== "all" && n.type !== fType) return false;
      return true;
    });
  }, [items, fUnread, fUrgent, fType]);

  const markRead = async (n) => {
    try {
      await base44.entities.Notification.update(n.id, { read: true });
    } catch (e) {}
  };
  const markAll = async () => {
    const unreadItems = items.filter((n) => !n.read);
    await Promise.all(unreadItems.map((n) => base44.entities.Notification.update(n.id, { read: true })));
  };
  const remove = async (n) => {
    try {
      await base44.entities.Notification.delete(n.id);
    } catch (e) {}
  };
  const openItem = async (n) => {
    await markRead(n);
    setOpen(false);
    if (n.related_path) navigate(n.related_path);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (o && !items.length) load(); }}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full" aria-label="Notifications">
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-4 py-3 border-b border-border flex-row items-center justify-between space-y-0">
          <SheetTitle className="text-base">Notifications</SheetTitle>
          <Button variant="ghost" size="sm" onClick={markAll} disabled={!unread} className="text-xs gap-1 h-8">
            <CheckCheck className="w-3.5 h-3.5" /> Mark all read
          </Button>
        </SheetHeader>
        <div className="px-3 py-2 border-b border-border flex flex-wrap items-center gap-1.5">
          <Chip active={fUnread} onClick={() => setFUnread((v) => !v)}>Unread</Chip>
          <Chip active={fUrgent} onClick={() => setFUrgent((v) => !v)}>Urgent</Chip>
          <Select value={fType} onValueChange={setFType}>
            <SelectTrigger className="h-7 w-[130px] text-xs rounded-full"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">You're all caught up 🎉</div>
          ) : (
            filtered.map((n) => (
              <div key={n.id} onClick={() => openItem(n)} className="px-4 py-3 hover:bg-muted/50 transition flex gap-3 cursor-pointer group">
                <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.read ? "bg-transparent border border-border" : "bg-primary"}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm truncate ${n.read ? "text-muted-foreground" : "font-medium text-foreground"}`}>{n.title}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border shrink-0 ${badgeTone(n.priority)}`}>{n.priority}</span>
                  </div>
                  {n.message && <p className="text-xs text-muted-foreground truncate">{n.message}</p>}
                  <p className="text-[11px] text-muted-foreground mt-0.5">{n.date}{n.time ? ` · ${n.time}` : ""}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); remove(n); }}
                  className="self-center text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition"
                  aria-label="Delete notification"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button onClick={onClick} className={`text-xs px-2.5 py-1 rounded-full border transition ${active ? "bg-primary/10 text-primary border-primary/30" : "border-border text-muted-foreground hover:bg-muted"}`}>
      {children}
    </button>
  );
}