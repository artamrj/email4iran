"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getTopics } from "@/services/supabaseService";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Topic } from "@/types/supabase";
import { TopicControlPanel } from "@/components/TopicControlPanel";
import { useTranslation } from "@/lib/i18n";

const TopicCard: React.FC<{ topic: Topic }> = ({ topic }) => {
  const { t } = useTranslation();

  return (
    <Link href={`/${topic.slug}`} className="block h-full">
      <Card className="h-full flex flex-col justify-between rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out border border-border bg-card text-card-foreground">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 mb-1">
            {topic.emoji && (
              <div className="rounded-[18px] bg-emerald-50/80 px-3 py-2 shadow-inner shadow-emerald-200/40">
                <span className="text-3xl leading-tight">{topic.emoji}</span>
              </div>
            )}
            <CardTitle className="text-2xl font-extrabold text-primary leading-tight">
              {topic.name}
            </CardTitle>
          </div>
          <CardDescription className="text-sm text-muted-foreground mt-1">
            {/* Removed topic.primaryRegion as it's no longer in schema */}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
          <p className="text-base text-foreground mb-4 line-clamp-2">
            {topic.description}
          </p>
        </CardContent>
        <CardFooter className="pt-0">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full bg-destructive px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-destructive-foreground transition duration-200 ease-out hover:bg-destructive/90 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
          >
            {t("getStarted")}
          </button>
        </CardFooter>
      </Card>
    </Link>
  );
};

const FeaturedTopicCard: React.FC<{ topic: Topic }> = ({ topic }) => {
  const { t } = useTranslation();
  const featuredLabel =
    typeof topic.featured_order === "number"
      ? t("featuredBadge", { slot: topic.featured_order })
      : t("featuredTopicLabel");

  return (
    <Link href={`/${topic.slug}`} className="block w-full">
      <Card className="relative w-full overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-card to-secondary/10 shadow-lg transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:shadow-xl">
        <div className="pointer-events-none absolute -left-10 -top-16 h-32 w-32 rounded-full bg-primary/10" />
        <div className="pointer-events-none absolute -bottom-20 right-6 h-40 w-40 rounded-full bg-secondary/20" />
        <div className="relative flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              {featuredLabel}
            </div>
            <div className="flex items-start gap-4">
              {topic.emoji && (
                <div className="rounded-[18px] bg-emerald-50/80 px-3 py-2 shadow-inner shadow-emerald-200/40">
                  <span className="text-3xl leading-tight">{topic.emoji}</span>
                </div>
              )}
              <div>
                <h2 className="text-2xl font-extrabold text-primary sm:text-3xl">
                  {topic.name}
                </h2>
                <p className="mt-3 text-base text-muted-foreground sm:text-lg line-clamp-2">
                  {topic.description}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center">
            <span className="inline-flex items-center justify-center rounded-full bg-destructive px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-destructive-foreground transition duration-200 ease-out hover:bg-destructive/90">
              {t("getStarted")}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
};

const Index = () => {
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const { t, locale } = useTranslation();
  const { data: topics, isLoading, isError } = useQuery<Topic[]>({
    queryKey: ["topics"],
    queryFn: getTopics,
  });

  const activeTopics = useMemo(
    () => topics?.filter((topic) => topic.is_active !== false) ?? [],
    [topics],
  );

  const featuredTopics = useMemo(
    () =>
      activeTopics
        .filter((topic) => typeof topic.featured_order === "number")
        .sort(
          (a, b) =>
            (a.featured_order ?? 0) - (b.featured_order ?? 0),
        ),
    [activeTopics],
  );

  const regularTopics = useMemo(() => {
    const filtered = activeTopics.filter(
      (topic) => typeof topic.featured_order !== "number",
    );
    if (sortOrder === "oldest") {
      return [...filtered].reverse();
    }
    return filtered;
  }, [activeTopics, sortOrder]);

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center p-8 bg-card rounded-lg shadow-2xl border border-destructive/20">
          <h1 className="text-4xl font-bold text-destructive mb-4">
            {t("errorLoadingTopics")}
          </h1>
          <p className="text-lg text-foreground">
            {t("errorLoadingTopicsBody")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 sm:p-8 relative">
      <TopicControlPanel />
      <div className="container mx-auto max-w-6xl py-12">
        <div className="relative mb-12 overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-b from-background via-background to-secondary/10 px-6 py-12 text-center sm:px-12">
          <div className="pointer-events-none absolute -top-16 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full bg-primary/10" />
          <div className="pointer-events-none absolute -bottom-20 right-0 h-40 w-40 rounded-full bg-secondary/20" />
          <div className="relative">
            <div className="mx-auto mb-6 flex items-center justify-center">
              <div className="rounded-2xl border border-border/70 bg-background/80 p-4 shadow-[0_18px_40px_rgba(0,0,0,0.12)]">
                <Image
                  src="/lionandsun.png"
                  alt={t("lionSunAlt")}
                  width={120}
                  height={120}
                  priority
                  className="h-12 w-auto sm:h-16"
                />
              </div>
            </div>
            <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              irani.email
            </div>
            <div dir={locale === "fa" ? "rtl" : "ltr"}>
              <h1 className="text-4xl font-black tracking-tight text-foreground sm:text-6xl">
                {t("heroTitle")}
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground sm:text-xl">
                {t("heroSubtitle")}
              </p>
            </div>
          </div>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="rounded-lg shadow-lg border border-border bg-card">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2 rounded-md" />
                  <Skeleton className="h-4 w-1/2 rounded-md" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full rounded-md" />
                </CardContent>
                <CardFooter className="flex flex-wrap gap-2">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : featuredTopics.length || regularTopics.length ? (
          <>
            {featuredTopics.length ? (
              <div className="mb-10">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                  {t("featuredTopics")}
                </h2>
                <div className="grid gap-6">
                  {featuredTopics.map((topic) => (
                    <FeaturedTopicCard key={topic.id} topic={topic} />
                  ))}
                </div>
              </div>
            ) : null}

            {regularTopics.length ? (
              <div className="flex justify-center mb-8">
                <button
                  type="button"
                  onClick={() =>
                    setSortOrder((prev) =>
                      prev === "newest" ? "oldest" : "newest",
                    )
                  }
                  className="inline-flex items-center justify-center rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-secondary"
                >
                  {sortOrder === "newest"
                    ? t("sortOldestToNewest")
                    : t("sortNewestToOldest")}
                </button>
              </div>
            ) : null}

            {regularTopics.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {regularTopics.map((topic) => (
                  <TopicCard key={topic.id} topic={topic} />
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <div className="text-center text-muted-foreground py-12">
            {t("noActiveTopics")}
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
