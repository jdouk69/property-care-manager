import React from "react";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";

// Shown to authenticated users whose role is not admin/staff.
// Renders no operational data and mounts no operational components.
export default function AccessNotApproved() {
  const { logout } = useAuth();

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-5 w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <ShieldAlert className="w-7 h-7 text-destructive" />
        </div>
        <h1 className="font-heading text-xl font-semibold text-foreground">Access Not Approved</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          This account does not currently have access to the Property Care system. Please contact
          the administrator if you believe you should have access.
        </p>
        <Button variant="outline" className="mt-6 w-full" onClick={() => logout()}>
          Sign Out
        </Button>
      </div>
    </div>
  );
}