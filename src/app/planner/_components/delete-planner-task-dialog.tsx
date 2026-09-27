"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { PlannerTask } from "@/lib/planner-types";

export function DeletePlannerTaskDialog({
  task,
  onClose,
  onConfirm,
}: {
  task: PlannerTask | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={!!task} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete task?</DialogTitle>
          <DialogDescription>
            This will permanently remove{" "}
            <span className="font-semibold">{task?.title}</span> from your
            planner. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
