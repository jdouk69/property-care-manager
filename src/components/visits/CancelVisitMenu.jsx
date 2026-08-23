import React, { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import CancelVisitDialog from "@/components/visits/CancelVisitDialog";
import { cancelVisitFromDraft } from "@/lib/visitCancel";

// A small ⋯ menu offering a safe "Cancel Visit" action for an in-progress
// (draft) visit. Used on the Dashboard "Continue Visit" card and inside the
// active Visit Wizard. Additive only — does not affect start/complete flows.
export default function CancelVisitMenu({ draft, onDone, triggerClassName = "" }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await cancelVisitFromDraft(draft);
      setConfirm(false);
      setOpen(false);
      onDone?.();
    } catch (e) {
      alert("Could not cancel visit: " + (e?.message || e));
    }
    setBusy(false);
  };

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Visit options"
            className={`rounded-full shrink-0 h-9 w-9 ${triggerClassName}`}
          >
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setConfirm(true)}
          >
            Cancel Visit
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CancelVisitDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={handleConfirm}
        busy={busy}
      />
    </>
  );
}