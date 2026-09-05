import React, { useCallback, useEffect, useState } from "react";
import { UserCog, UserCheck, UserX, ShieldCheck } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/ui/PageHeader";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ROLE_META = {
  admin: { label: "Owner/Admin", rank: 2, badge: "bg-primary/10 text-primary border-primary/20" },
  staff: { label: "Staff", rank: 1, badge: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900" },
  user: { label: "Pending Approval", rank: 0, badge: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900" },
};
// Fail-safe: any missing or unexpected role is treated as NOT approved.
const FALLBACK_META = { label: "Not Approved", rank: 0, badge: "bg-muted text-muted-foreground border-border" };
const metaFor = (role) => ROLE_META[role] || FALLBACK_META;

const initialsFor = (name, email) => {
  const src = (name || email || "").trim();
  return src ? src.slice(0, 1).toUpperCase() : "?";
};

const formatDate = (iso) => {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return null;
  }
};

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null); // { user, newRole }

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const list = await base44.entities.User.list();
      const sorted = [...list].sort((a, b) => {
        const r = metaFor(a.role).rank - metaFor(b.role).rank;
        if (r !== 0) return r;
        return new Date(a.created_date || 0) - new Date(b.created_date || 0);
      });
      setUsers(sorted);
    } catch (e) {
      setUsers([]);
      toast({ title: "Could not load users", description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const performRoleChange = async () => {
    const target = confirmTarget;
    if (!target) return;
    // Fail-closed: the acting user must be a verified admin before any change.
    if (currentUser?.role !== "admin") {
      toast({ title: "Not allowed", description: "Only the Owner/Admin can manage access.", variant: "destructive" });
      setConfirmTarget(null);
      return;
    }
    setBusyId(target.user.id);
    try {
      await base44.entities.User.update(target.user.id, { role: target.newRole });
      toast({ title: target.newRole === "staff" ? "Approved as Staff" : "Access revoked" });
      await loadUsers(); // re-read from the server — no optimistic state changes
    } catch (e) {
      toast({
        title: "Update failed",
        description: e?.message || "The role was not changed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
      setConfirmTarget(null);
    }
  };

  const counts = (users || []).reduce(
    (acc, u) => {
      if (u.role === "admin") acc.admin += 1;
      else if (u.role === "staff") acc.staff += 1;
      else acc.pending += 1;
      return acc;
    },
    { pending: 0, staff: 0, admin: 0 }
  );

  const isApproving = confirmTarget?.newRole === "staff";

  return (
    <AppLayout>
      <div className="px-4 py-6 md:px-8 lg:py-8 max-w-4xl mx-auto">
        <PageHeader
          title="Users & Staff"
          subtitle="Approve and manage who can access the Property Care system."
          icon={UserCog}
        />

        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Pending", value: counts.pending },
            { label: "Staff", value: counts.staff },
            { label: "Owner/Admin", value: counts.admin },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card px-4 py-3 text-center">
              <div className="text-xl font-semibold text-foreground">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
          </div>
        ) : !users?.length ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No users found.
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((u) => {
              const m = metaFor(u.role);
              const name = u.full_name || u.email || "Unnamed user";
              return (
                <div key={u.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                    {initialsFor(u.full_name, u.email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{name}</div>
                    {u.email && u.email !== name && (
                      <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={m.badge}>{m.label}</Badge>
                      {formatDate(u.created_date) && (
                        <span className="text-[11px] text-muted-foreground">Joined {formatDate(u.created_date)}</span>
                      )}
                    </div>
                  </div>
                  {u.role === "user" ? (
                    <Button
                      size="sm"
                      disabled={busyId === u.id}
                      onClick={() => setConfirmTarget({ user: u, newRole: "staff" })}
                      className="gap-1.5 shrink-0"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span className="hidden sm:inline">Approve as Staff</span>
                      <span className="sm:hidden">Approve</span>
                    </Button>
                  ) : u.role === "staff" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === u.id}
                      onClick={() => setConfirmTarget({ user: u, newRole: "user" })}
                      className="gap-1.5 shrink-0"
                    >
                      <UserX className="w-4 h-4" />
                      Revoke Access
                    </Button>
                  ) : u.role === "admin" ? (
                    <ShieldCheck className="w-5 h-5 text-primary shrink-0" aria-label="Owner/Admin" />
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        <AlertDialog open={!!confirmTarget} onOpenChange={(open) => !open && setConfirmTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{isApproving ? "Approve as Staff?" : "Revoke Access?"}</AlertDialogTitle>
              <AlertDialogDescription>
                {isApproving
                  ? `Give ${confirmTarget?.user?.email || confirmTarget?.user?.full_name || "this user"} operational access to the Property Care system as approved staff.`
                  : `Remove operational access from ${confirmTarget?.user?.email || confirmTarget?.user?.full_name || "this user"} and return their account to Pending Approval. Their past work and records are not deleted.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={performRoleChange}>
                {isApproving ? "Approve as Staff" : "Revoke Access"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}