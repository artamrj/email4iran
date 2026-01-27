"use client";

import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings } from "lucide-react";

import { getTopics, updateTopicActive } from "@/services/supabaseService";
import { Topic } from "@/types/supabase";
import { AddTopicDialog } from "@/components/AddTopicDialog";
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
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const queryClient = useQueryClient();

  const hasPasswordConfigured = !!process.env.NEXT_PUBLIC_ADD_TOPIC_PASSWORD;

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

  const topicsList = useMemo(() => topics ?? [], [topics]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setIsPasswordVerified(false);
    }
  };

  const handleToggle = (topic: Topic, isActive: boolean) => {
    updateMutation.mutate({ topicId: topic.id, isActive });
  };

  const isUpdatingTopic = (topicId: string) =>
    updateMutation.isPending && updateMutation.variables?.topicId === topicId;

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
            <p>Please set `NEXT_PUBLIC_ADD_TOPIC_PASSWORD` in your .env.local file to enable this feature.</p>
          </TooltipContent>
        )}
      </Tooltip>
      <DialogContent className="sm:max-w-[720px] rounded-xl p-6 bg-card text-card-foreground overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">
            {!isPasswordVerified ? "Enter Password" : "Topic Control Panel"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {!isPasswordVerified
              ? "A password is required to manage topics."
              : "Add new topics or activate/deactivate existing ones."}
          </DialogDescription>
        </DialogHeader>

        {!isPasswordVerified ? (
          <PasswordPrompt
            onSuccess={() => setIsPasswordVerified(true)}
            onCancel={() => setIsOpen(false)}
          />
        ) : (
          <div className="grid gap-6 pt-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Manage Topics</h3>
                <p className="text-sm text-muted-foreground">
                  New topics are active by default. Toggle a switch to deactivate old topics.
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
