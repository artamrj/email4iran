"use client";

import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings, Trash2 } from "lucide-react";

import { deleteTopic, getTopics, updateTopicActive } from "@/services/supabaseService";
import { Topic } from "@/types/supabase";
import { AddTopicDialog } from "@/components/AddTopicDialog";
import { EditTopicDialog } from "@/components/EditTopicDialog";
import { PasswordPrompt } from "@/components/PasswordPrompt";
import { showError, showSuccess } from "@/utils/toast";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export const TopicControlPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [accessLevel, setAccessLevel] = useState<"none" | "add" | "admin">("none");
  const queryClient = useQueryClient();

  const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
  const addPassword = process.env.NEXT_PUBLIC_ADD_TOPIC_PASSWORD;
  const hasPasswordConfigured = !!adminPassword || !!addPassword;
  const adminPasswordEnvKey = "NEXT_PUBLIC_ADMIN_PASSWORD or NEXT_PUBLIC_ADD_TOPIC_PASSWORD";
  const expectedAdminPassword = adminPassword;
  const expectedAdminPasswords = [
    adminPassword ? { password: adminPassword, match: "admin" } : null,
    addPassword ? { password: addPassword, match: "add" } : null,
  ].filter(Boolean) as { password: string; match: "admin" | "add" }[];

  const isPasswordVerified = accessLevel !== "none";
  const isAdmin = accessLevel === "admin";

  const { data: topics, isLoading, isError } = useQuery<Topic[]>({
    queryKey: ["topics", "admin"],
    queryFn: getTopics,
    enabled: isPasswordVerified,
  });

  const updateMutation = useMutation({
    mutationFn: ({ topicId, isActive }: { topicId: string; isActive: boolean }) =>
      updateTopicActive(topicId, isActive),
    onSuccess: (updatedTopic) => {
      const nextState = updatedTopic.is_active ? "activated" : "deactivated";
      showSuccess(`Topic ${nextState}.`);
      queryClient.invalidateQueries({ queryKey: ["topics"] });
      queryClient.invalidateQueries({ queryKey: ["topics", "admin"] });
    },
    onError: (error) => {
      console.error("Failed to update topic status:", error);
      showError("Failed to update topic status. Please try again.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (topicId: string) => deleteTopic(topicId),
    onSuccess: () => {
      showSuccess("Topic deleted.");
      queryClient.invalidateQueries({ queryKey: ["topics"] });
      queryClient.invalidateQueries({ queryKey: ["topics", "admin"] });
    },
    onError: (error) => {
      console.error("Failed to delete topic:", error);
      showError("Failed to delete topic. Please try again.");
    },
  });

  const topicsList = useMemo(() => topics ?? [], [topics]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setAccessLevel("none");
    }
  };

  const handleToggle = (topic: Topic, isActive: boolean) => {
    updateMutation.mutate({ topicId: topic.id, isActive });
  };

  const isUpdatingTopic = (topicId: string) =>
    updateMutation.isPending && updateMutation.variables?.topicId === topicId;

  const isDeletingTopic = (topicId: string) =>
    deleteMutation.isPending && deleteMutation.variables === topicId;

  const handleDelete = (topic: Topic) => {
    if (!isAdmin) return;
    const confirmed = window.confirm(
      `Delete "${topic.name}"? This cannot be undone.`,
    );
    if (!confirmed) return;
    deleteMutation.mutate(topic.id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Button
            onClick={() => setIsOpen(true)}
            variant="ghost"
            className="absolute top-4 left-4 z-50 rounded-full px-4 py-2 text-foreground hover:bg-secondary transition-colors duration-300 ease-in-out flex items-center gap-2"
            disabled={!hasPasswordConfigured}
          >
            <Settings className="h-5 w-5" />
            <span>Control Panel</span>
          </Button>
        </TooltipTrigger>
        {!hasPasswordConfigured && (
          <TooltipContent className="rounded-lg bg-card text-card-foreground border-border shadow-md">
            <p>
              Please set `NEXT_PUBLIC_ADMIN_PASSWORD` or `NEXT_PUBLIC_ADD_TOPIC_PASSWORD` in your
              .env.local file to enable this feature.
            </p>
          </TooltipContent>
        )}
      </Tooltip>
      <DialogContent className="sm:max-w-[720px] rounded-xl p-6 bg-card text-card-foreground overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">
            {!isPasswordVerified
              ? "Enter Password"
              : isAdmin
                ? "Topic Control Panel"
                : "Add Topics"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {!isPasswordVerified
              ? "A password is required to manage topics."
              : isAdmin
                ? "Add new topics or activate/deactivate existing ones."
                : "Add new topics. Editing existing topics requires the admin password."}
          </DialogDescription>
        </DialogHeader>

        {!isPasswordVerified ? (
          <PasswordPrompt
            onSuccess={() => setAccessLevel("add")}
            onCancel={() => setIsOpen(false)}
            passwordEnvKey={adminPasswordEnvKey}
            expectedPassword={expectedAdminPassword}
            expectedPasswords={expectedAdminPasswords.map((entry) => entry.password)}
            passwordMatches={expectedAdminPasswords}
            onSuccessWithMatch={(match) =>
              setAccessLevel(match === "admin" ? "admin" : "add")
            }
          />
        ) : (
          <div className="grid gap-6 pt-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {isAdmin ? "Manage Topics" : "Manage Visibility"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isAdmin
                    ? "New topics are active by default. Toggle a switch to deactivate old topics."
                    : "Toggle topics active/inactive. Editing groups and emails requires the admin password."}
                </p>
              </div>
              <AddTopicDialog
                triggerLabel="Add Topic"
                triggerVariant="default"
                triggerSize="sm"
                triggerClassName="rounded-lg px-4 py-2"
                showTooltip={false}
                skipPassword
              />
            </div>

            <>
              <Separator className="bg-border rounded-full" />

              {isLoading ? (
                <div className="grid gap-3">
                  {[...Array(4)].map((_, index) => (
                    <div key={index} className="rounded-lg border border-border p-4">
                      <Skeleton className="h-5 w-40 mb-2 rounded-md" />
                      <Skeleton className="h-4 w-28 rounded-md" />
                    </div>
                  ))}
                </div>
              ) : isError ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                  Failed to load topics. Please check your Supabase connection and schema.
                </div>
              ) : topicsList.length === 0 ? (
                <div className="rounded-lg border border-border bg-secondary/10 p-4 text-sm text-muted-foreground">
                  No topics found yet. Add your first topic to get started.
                </div>
              ) : (
                <div className="grid gap-3">
                  {topicsList.map((topic) => {
                    const isActive = topic.is_active !== false;
                    return (
                      <div
                        key={topic.id}
                        className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-start gap-3">
                          {topic.emoji && (
                            <span className="text-2xl" aria-hidden>
                              {topic.emoji}
                            </span>
                          )}
                          <div>
                            <p className="text-base font-semibold text-foreground">
                              {topic.name}
                            </p>
                            <p className="text-xs text-muted-foreground">/{topic.slug}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {isAdmin && (
                            <>
                              <EditTopicDialog topic={topic} />
                              <Button
                                variant="destructive"
                                size="sm"
                                className="rounded-lg"
                                onClick={() => handleDelete(topic)}
                                disabled={isDeletingTopic(topic.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </Button>
                            </>
                          )}
                          <span
                            className={cn(
                              "text-xs font-semibold uppercase tracking-wide",
                              isActive ? "text-emerald-600" : "text-muted-foreground",
                            )}
                          >
                            {isActive ? "Active" : "Inactive"}
                          </span>
                          <Switch
                            checked={isActive}
                            onCheckedChange={(checked) => handleToggle(topic, checked)}
                            disabled={isUpdatingTopic(topic.id)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
