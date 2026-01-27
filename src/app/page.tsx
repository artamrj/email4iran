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

const TopicCard: React.FC<{ topic: Topic }> = ({ topic }) => {
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
          <p className="text-base text-foreground mb-4 line-clamp-3">
            {topic.description}
          </p>
        </CardContent>
        <CardFooter className="pt-0">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full bg-destructive px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-destructive-foreground transition duration-200 ease-out hover:bg-destructive/90 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
          >
            Get Started
          </button>
        </CardFooter>
      </Card>
    </Link>
  );
};

const Index = () => {
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const { data: topics, isLoading, isError } = useQuery<Topic[]>({
    queryKey: ["topics"],
    queryFn: getTopics,
  });

  const activeTopics = useMemo(() => {
    const filtered = topics?.filter((topic) => topic.is_active !== false) ?? [];
    if (sortOrder === "oldest") {
      return [...filtered].reverse();
    }
    return filtered;
  }, [topics, sortOrder]);

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center p-8 bg-card rounded-lg shadow-2xl border border-destructive/20">
          <h1 className="text-4xl font-bold text-destructive mb-4">
            Error Loading Topics
          </h1>
          <p className="text-lg text-foreground">
            Could not fetch advocacy topics. Please check your Supabase connection
            and environment variables.
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
                  alt="Lion and Sun emblem"
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
            <h1 className="text-4xl font-black tracking-tight text-foreground sm:text-6xl">
              Send the emails that move #FreeIran forward
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Discover verified domains and key contacts, send faster with ready templates,
              and turn small wins into unstoppable momentum for #IranRevolution2026.
            </p>
          </div>
        </div>
        <div className="flex justify-center mb-8">
          <button
            type="button"
            onClick={() =>
              setSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"))
            }
            className="inline-flex items-center justify-center rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-secondary"
          >
            {sortOrder === "newest" ? "Oldest → Newest" : "Newest → Oldest"}
          </button>
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
        ) : activeTopics.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {activeTopics.map((topic) => (
              <TopicCard key={topic.id} topic={topic} />
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-12">
            No active topics yet. Check back soon.
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
