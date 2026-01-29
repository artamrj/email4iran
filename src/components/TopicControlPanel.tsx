"use client";

import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings, Trash2 } from "lucide-react";

import {
  deleteTopic,
  getTopics,
  setTopicFeaturedOrder,
  updateTopicActive,
} from "@/services/supabaseService";
import { Topic } from "@/types/supabase";
import { AddTopicDialog } from "@/components/AddTopicDialog";
import { EditTopicDialog } from "@/components/EditTopicDialog";
import { PasswordPrompt } from "@/components/PasswordPrompt";
import { showError, showSuccess } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export const TopicControlPanel: React.FC = () => {
  const { t } = useTranslation();
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
      if (updatedTopic.is_active) {
        showSuccess(t("topicActivated"));
      } else {
        showSuccess(t("topicDeactivated"));
      }
      queryClient.invalidateQueries({ queryKey: ["topics"] });
      queryClient.invalidateQueries({ queryKey: ["topics", "admin"] });
    },
    onError: (error) => {
      console.error("Failed to update topic status:", error);
      showError(t("failedUpdateTopicStatus"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (topicId: string) => deleteTopic(topicId),
    onSuccess: () => {
      showSuccess(t("topicDeleted"));
      queryClient.invalidateQueries({ queryKey: ["topics"] });
      queryClient.invalidateQueries({ queryKey: ["topics", "admin"] });
    },
    onError: (error) => {
      console.error("Failed to delete topic:", error);
      showError(t("failedDeleteTopic"));
    },
  });

  const featuredMutation = useMutation({
    mutationFn: ({ slot, topicId }: { slot: 1 | 2; topicId: string | null }) =>
      setTopicFeaturedOrder(slot, topicId),
    onSuccess: () => {
      showSuccess(t("featuredTopicsUpdated"));
      queryClient.invalidateQueries({ queryKey: ["topics"] });
      queryClient.invalidateQueries({ queryKey: ["topics", "admin"] });
    },
    onError: (error) => {
      console.error("Failed to update featured topics:", error);
      showError(t("failedUpdateFeaturedTopics"));
    },
  });

  const topicsList = useMemo(() => topics ?? [], [topics]);
  const featuredSlotOne = useMemo(
    () => topicsList.find((topic) => topic.featured_order === 1) ?? null,
    [topicsList],
  );
  const featuredSlotTwo = useMemo(
    () => topicsList.find((topic) => topic.featured_order === 2) ?? null,
    [topicsList],
  );

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

  const handleFeaturedChange = (slot: 1 | 2, value: string) => {
    if (!isAdmin) return;
    const current = slot === 1 ? featuredSlotOne?.id : featuredSlotTwo?.id;
    const normalized = value === "none" ? null : value;
    if ((current ?? null) === normalized) return;
    featuredMutation.mutate({ slot, topicId: normalized });
  };

  const handleDelete = (topic: Topic) => {
    if (!isAdmin) return;
    const confirmed = window.confirm(
      t("deleteConfirm", { topicName: topic.name }),
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
            className="absolute top-4 left-4 z-50 rounded-full px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors duration-300 ease-in-out flex items-center gap-2 opacity-50"
            disabled={!hasPasswordConfigured}
          >
            <Settings className="h-5 w-5" />
            <span>{t("controlPanel")}</span>
          </Button>
        </TooltipTrigger>
        {!hasPasswordConfigured && (
          <TooltipContent className="rounded-lg bg-card text-card-foreground border-border shadow-md">
            <p>
              {t("adminEnvTooltip")}
            </p>
          </TooltipContent>
        )}
      </Tooltip>
      <DialogContent className="sm:max-w-[720px] rounded-xl p-6 bg-card text-card-foreground overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">
            {!isPasswordVerified
              ? t("enterPassword")
              : isAdmin
                ? t("topicControlPanel")
                : t("addTopics")}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {!isPasswordVerified
              ? t("passwordRequiredManage")
              : isAdmin
                ? t("addTopicsOrActivate")
                : t("addTopicsAdminRequired")}
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
                  {isAdmin ? t("manageTopics") : t("manageVisibility")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isAdmin
                    ? t("newTopicsActiveByDefault")
                    : t("toggleTopicsActiveInactive")}
                </p>
              </div>
              <AddTopicDialog
                triggerLabel={t("addTopic")}
                triggerVariant="default"
                triggerSize="sm"
                triggerClassName="rounded-lg px-4 py-2"
                showTooltip={false}
                skipPassword
              />
            </div>

            {isAdmin && (
              <div className="rounded-lg border border-border bg-secondary/10 p-4">
                <div className="mb-3">
                  <h4 className="text-base font-semibold text-foreground">
                    {t("featuredTopics")}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {t("featuredTopicsDescription")}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      {t("featuredSlotPrimary")}
                    </span>
                    <Select
                      value={featuredSlotOne?.id ?? "none"}
                      onValueChange={(value) => handleFeaturedChange(1, value)}
                      disabled={featuredMutation.isPending || isLoading || isError}
                    >
                      <SelectTrigger className="rounded-lg border-border bg-background">
                        <SelectValue placeholder={t("featuredSelectPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t("featuredNone")}</SelectItem>
                        <SelectSeparator />
                        {topicsList.map((topic) => (
                          <SelectItem key={topic.id} value={topic.id}>
                            {topic.emoji ? `${topic.emoji} ` : ""}
                            {topic.name}
                            {topic.is_active === false
                              ? ` (${t("inactiveStatus")})`
                              : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      {t("featuredSlotSecondary")}
                    </span>
                    <Select
                      value={featuredSlotTwo?.id ?? "none"}
                      onValueChange={(value) => handleFeaturedChange(2, value)}
                      disabled={featuredMutation.isPending || isLoading || isError}
                    >
                      <SelectTrigger className="rounded-lg border-border bg-background">
                        <SelectValue placeholder={t("featuredSelectPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t("featuredNone")}</SelectItem>
                        <SelectSeparator />
                        {topicsList.map((topic) => (
                          <SelectItem key={topic.id} value={topic.id}>
                            {topic.emoji ? `${topic.emoji} ` : ""}
                            {topic.name}
                            {topic.is_active === false
                              ? ` (${t("inactiveStatus")})`
                              : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

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
                  {t("failedLoadTopics")}
                </div>
              ) : topicsList.length === 0 ? (
                <div className="rounded-lg border border-border bg-secondary/10 p-4 text-sm text-muted-foreground">
                  {t("noTopicsFound")}
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
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-base font-semibold text-foreground">
                                {topic.name}
                              </p>
                              {typeof topic.featured_order === "number" && (
                                <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                                  {t("featuredBadge", {
                                    slot: topic.featured_order,
                                  })}
                                </span>
                              )}
                            </div>
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
                                {t("deleteAction")}
                              </Button>
                            </>
                          )}
                          <span
                            className={cn(
                              "text-xs font-semibold uppercase tracking-wide",
                              isActive ? "text-emerald-600" : "text-muted-foreground",
                            )}
                          >
                            {isActive ? t("activeStatus") : t("inactiveStatus")}
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
