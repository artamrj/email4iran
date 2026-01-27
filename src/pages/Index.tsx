import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTopics } from '@/services/supabaseService';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Topic } from '@/types/supabase'; // Import Topic type

const TopicCard: React.FC<{ topic: Topic }> = ({ topic }) => { // Use Topic type
  return (
    <Link to={`/${topic.slug}`} className="block h-full">
      <Card className="h-full flex flex-col justify-between rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out border-2 border-transparent hover:border-iran-green dark:hover:border-iran-dark-green bg-gradient-to-br from-iran-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-extrabold text-primary dark:text-primary-foreground leading-tight">
            {topic.name}
          </CardTitle>
          <CardDescription className="text-sm text-gray-600 dark:text-gray-400 mt-1">
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-iran-red/10 to-iran-white dark:from-iran-dark-red/20 dark:to-gray-900 p-4">
        <div className="text-center p-8 bg-card dark:bg-card-foreground rounded-xl shadow-2xl">
          <h1 className="text-4xl font-bold text-destructive dark:text-destructive-foreground mb-4">Error Loading Topics</h1>
          <p className="text-lg text-foreground">
            Could not fetch advocacy topics. Please check your Supabase connection and environment variables.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-iran-white to-iran-green/5 dark:from-gray-950 dark:to-gray-900 p-4 sm:p-8">
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
              <Card key={i} className="rounded-xl shadow-lg border-none bg-gradient-to-br from-gray-100/50 to-gray-200/50 dark:from-gray-800/50 dark:to-gray-700/50">
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