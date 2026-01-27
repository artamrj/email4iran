import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTopics } from '@/services/supabaseService';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Topic } from '@/types/supabase'; // Import Topic type
import { AddTopicDialog } from '@/components/AddTopicDialog'; // Import the new component

const TopicCard: React.FC<{ topic: Topic }> = ({ topic }) => { // Use Topic type
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
  const { data: topics, isLoading, isError } = useQuery<Topic[]>({ // Specify Topic[] type
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
      <AddTopicDialog /> {/* Integrated the new component here */}
      <div className="container mx-auto max-w-6xl py-12">
        <h1 className="text-5xl font-extrabold text-center mb-6 text-foreground drop-shadow-lg">
          Email4Iran
        </h1>
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
    </div>
  );
};

export default Index;