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
      <Card className="h-full flex flex-col justify-between rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out border-none bg-gradient-to-br from-purple-500/10 to-blue-500/10 dark:from-purple-900/20 dark:to-blue-900/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-extrabold text-purple-800 dark:text-purple-300 leading-tight">
            {topic.name} {/* Changed from topic.title */}
          </CardTitle>
          <CardDescription className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {/* Removed topic.primaryRegion as it's no longer in schema */}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
          <p className="text-base text-gray-700 dark:text-gray-300 mb-4 line-clamp-3">
            {topic.description} {/* Changed from topic.shortDescription */}
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900 dark:to-orange-900 p-4">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-xl shadow-2xl">
          <h1 className="text-4xl font-bold text-red-600 dark:text-red-400 mb-4">Error Loading Topics</h1>
          <p className="text-lg text-gray-700 dark:text-gray-300">
            Could not fetch advocacy topics. Please check your Supabase connection and environment variables.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-950 dark:to-gray-900 p-4 sm:p-8">
      <div className="container mx-auto max-w-6xl py-12">
        <h1 className="text-5xl font-extrabold text-center mb-6 text-gray-900 dark:text-white drop-shadow-lg">
          Email4Iran
        </h1>
        <p className="text-xl text-center text-gray-700 dark:text-gray-300 mb-12 max-w-2xl mx-auto">
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