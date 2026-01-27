import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTopics } from '@/services/supabaseService';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Topic } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import NewTopicForm from '@/components/NewTopicForm';
import { PlusCircle } from 'lucide-react';

const TopicCard: React.FC<{ topic: Topic }> = ({ topic }) => {
  return (
    <Link to={`/${topic.slug}`} className="block h-full">
      <Card className="h-full flex flex-col justify-between rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out border border-border bg-card text-card-foreground">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 mb-1">
            {topic.emoji && <span className="text-3xl">{topic.emoji}</span>}
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
        <CardFooter className="flex flex-wrap gap-2 pt-0">
          {/* Removed tags as it's no longer in schema */}
        </CardFooter>
      </Card>
    </Link>
  );
};

const Index = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: topics, isLoading, isError } = useQuery<Topic[]>({
    queryKey: ['topics'],
    queryFn: getTopics,
  });

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center p-8 bg-card rounded-lg shadow-2xl border border-destructive/20">
          <h1 className="text-4xl font-bold text-destructive mb-4">Error Loading Topics</h1>
          <p className="text-lg text-foreground">
            Could not fetch advocacy topics. Please check your Supabase connection and environment variables.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 sm:p-8">
      <div className="container mx-auto max-w-6xl py-12">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-5xl font-extrabold text-foreground drop-shadow-lg">
            Email4Iran
          </h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-base py-3 px-6">
                <PlusCircle className="mr-2 h-5 w-5" /> New Topic
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-xl p-6 bg-card text-card-foreground">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-foreground">Add New Topic</DialogTitle>
              </DialogHeader>
              <NewTopicForm onSuccess={() => setIsDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
        <p className="text-xl text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          Explore various topics and make your voice heard by sending emails to key contacts.
        </p>

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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {topics?.map((topic) => (
              <TopicCard key={topic.id} topic={topic} />
            ))}
          </div>
        )}
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;