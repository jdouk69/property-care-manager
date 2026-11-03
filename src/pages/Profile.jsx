import React, { useState } from "react";
import { Loader2, ShieldCheck, Trash2, UserRound } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/ui/PageHeader";
import PageBackButton from "@/components/ui/PageBackButton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { base44 } from "@/api/base44Client";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Profile() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const isStaff = user?.role === "staff";
  const roleLabel = isStaff ? t("Staff") : t("Owner/Admin");

  const deleteAccount = async () => {
    setDeleting(true);
    setError("");
    try {
      await base44.auth.deleteAccount();
      setConfirmOpen(false);
      logout();
    } catch (e) {
      setError(e?.message || t("Unable to delete your account. Please try again."));
      setDeleting(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-3xl mx-auto pb-24 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-8">
        <PageBackButton className="mb-3" />
        <PageHeader title={t("Profile")} subtitle={t("Your Property Care account details")} icon={UserRound} />

        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="font-semibold text-base mb-5">{t("Account information")}</h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground mb-1">{t("Name")}</dt>
              <dd className="text-sm font-medium break-words">{user?.full_name || t("Not provided")}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground mb-1">{t("Email")}</dt>
              <dd className="text-sm font-medium break-words">{user?.email || t("Not provided")}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground mb-1">{t("Role")}</dt>
              <dd className="inline-flex items-center gap-1.5 text-sm font-medium">
                <ShieldCheck className="w-4 h-4 text-primary" /> {roleLabel}
              </dd>
            </div>
          </dl>
        </section>

        {isStaff && (
          <section className="mt-10 border-t border-border pt-6">
            <h2 className="font-semibold text-base text-destructive mb-2">{t("Delete account")}</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {t("This removes only your Property Care staff profile and access. Company clients, visits, photos, findings, invoices, and other business records stay in the app. Your ChatGPT account is not deleted.")}
            </p>
            <Button variant="destructive" className="gap-2" onClick={() => { setError(""); setConfirmOpen(true); }}>
              <Trash2 className="w-4 h-4" /> {t("Delete account")}
            </Button>
          </section>
        )}

        {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}

        {!isStaff && (
          <p className="mt-8 text-sm text-muted-foreground">
            {t("The owner account is managed through ChatGPT. Staff can delete their Property Care profile here.")}
          </p>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={(open) => !deleting && setConfirmOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Delete your Property Care account?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("This permanently removes your Property Care staff profile and access, then signs you out. Company business records remain, and your ChatGPT account is unchanged.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("Cancel")}</AlertDialogCancel>
            <Button variant="destructive" disabled={deleting} onClick={deleteAccount}>
              {deleting ? <><Loader2 className="w-4 h-4 animate-spin" /> {t("Deleting…")}</> : t("Delete account")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
