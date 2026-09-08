"use client";

import * as React from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { Plus, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { TopicItem } from "@/components/planner/topic-item";
import { usePlannerStore } from "@/lib/planner-store";
import { useHabitStore } from "@/lib/store";
import { toast } from "sonner";
import type { Topic } from "@/lib/planner-types";

export function TopicsPanel() {
  const [open, setOpen] = React.useState(false);
  const [showCompleted, setShowCompleted] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState("");
  const [newDescription, setNewDescription] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [editing, setEditing] = React.useState<Topic | null>(null);
  const [editTitle, setEditTitle] = React.useState("");
  const [editDescription, setEditDescription] = React.useState("");
  const [toDelete, setToDelete] = React.useState<Topic | null>(null);

  const topics = usePlannerStore((s) => s.topics);
  const createTopic = usePlannerStore((s) => s.createTopic);
  const updateTopic = usePlannerStore((s) => s.updateTopic);
  const deleteTopic = usePlannerStore((s) => s.deleteTopic);
  const reorderTopics = usePlannerStore((s) => s.reorderTopics);
  const toggleTopicActive = usePlannerStore((s) => s.toggleTopicActive);
  const habits = useHabitStore((s) => s.habits);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const activeTopics = React.useMemo(
    () =>
      topics
        .filter((t) => t.isActive)
        .sort((a, b) => a.position - b.position),
    [topics]
  );

  const completedTopics = React.useMemo(
    () =>
      topics
        .filter((t) => !t.isActive)
        .sort((a, b) => a.position - b.position),
    [topics]
  );

  const displayedTopics = showCompleted
    ? [...activeTopics, ...completedTopics]
    : activeTopics;

  const habitMap = React.useMemo(() => {
    const map: Record<string, (typeof habits)[number]> = {};
    for (const h of habits) map[h.id] = h;
    return map;
  }, [habits]);

  const handleCreate = async () => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      await createTopic(trimmed, newDescription.trim() || undefined);
      setNewTitle("");
      setNewDescription("");
      toast.success("Topic created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create topic");
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = async () => {
    if (!editing) return;
    const trimmed = editTitle.trim();
    if (!trimmed) return;
    try {
      await updateTopic(editing.id, {
        title: trimmed,
        description: editDescription.trim() || null,
      });
      setEditing(null);
      toast.success("Topic updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update topic");
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteTopic(toDelete.id);
      setToDelete(null);
      toast.success("Topic deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete topic");
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await toggleTopicActive(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update topic");
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const sorted = [...topics].sort((a, b) => a.position - b.position);
    const ids = sorted.map((t) => t.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    reorderTopics(arrayMove(ids, oldIndex, newIndex));
  };

  const openEditDialog = (topic: Topic) => {
    setEditing(topic);
    setEditTitle(topic.title);
    setEditDescription(topic.description ?? "");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2">
          <List className="h-4 w-4" />
          Topics
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Topics</SheetTitle>
          <SheetDescription>
            Manage long-term topics and learning paths.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Create form */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="New topic title..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
                disabled={creating}
              />
              <Button
                onClick={handleCreate}
                disabled={!newTitle.trim() || creating}
                size="icon"
                className="shrink-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <Input
              placeholder="Description (optional)"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              disabled={creating}
            />
          </div>

          {/* Show completed toggle */}
          {completedTopics.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              Show completed ({completedTopics.length})
            </label>
          )}

          {/* Topic list */}
          {displayedTopics.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No topics yet. Create one above to get started.
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={displayedTopics.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {displayedTopics.map((topic) => (
                    <TopicItem
                      key={topic.id}
                      topic={topic}
                      habit={
                        topic.habitId ? habitMap[topic.habitId] : undefined
                      }
                      onEdit={openEditDialog}
                      onDelete={setToDelete}
                      onToggleActive={handleToggle}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </SheetContent>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Topic</DialogTitle>
            <DialogDescription>Update topic details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">Description</Label>
              <Input
                id="edit-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={!editTitle.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete topic?</DialogTitle>
            <DialogDescription>
              This will permanently remove{" "}
              <span className="font-semibold">{toDelete?.title}</span>. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
