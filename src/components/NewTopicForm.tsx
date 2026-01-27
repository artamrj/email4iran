"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTopic } from '@/services/supabaseService';
import { showSuccess, showError } from '@/utils/toast';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, PlusCircle } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(2, {
    message: 'Topic name must be at least 2 characters.',
  }).max(100, {
    message: 'Topic name must not exceed 100 characters.',
  }),
  slug: z.string().min(2, {
    message: 'Slug must be at least 2 characters.',
  }).max(100, {
    message: 'Slug must not exceed 100 characters.',
  }).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase, alphanumeric, and use hyphens for spaces.',
  }),
  description: z.string().min(10, {
    message: 'Description must be at least 10 characters.',
  }).max(1000, {
    message: 'Description must not exceed 1000 characters.',
  }),
  emoji: z.string().optional(),
  default_language: z.string().min(2, {
    message: 'Default language must be at least 2 characters.',
  }),
});

interface NewTopicFormProps {
  onSuccess?: () => void;
}

const NewTopicForm: React.FC<NewTopicFormProps> = ({ onSuccess }) => {
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      emoji: '',
      default_language: 'en',
    },
  });

  const createTopicMutation = useMutation({
    mutationFn: createTopic,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      showSuccess('Topic added successfully!');
      form.reset();
      onSuccess?.();
    },
    onError: (error) => {
      showError(`Failed to add topic: ${error.message}`);
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createTopicMutation.mutate(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground">Topic Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Human Rights" {...field} className="rounded-lg border-border bg-input text-foreground" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground">Slug</FormLabel>
              <FormControl>
                <Input placeholder="e.g., human-rights" {...field} className="rounded-lg border-border bg-input text-foreground" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground">Description</FormLabel>
              <FormControl>
                <Textarea placeholder="A brief description of the topic..." {...field} rows={4} className="rounded-lg border-border bg-input text-foreground" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="emoji"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground">Emoji (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 🕊️" {...field} className="rounded-lg border-border bg-input text-foreground" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="default_language"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground">Default Language</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="rounded-lg border-border bg-input text-foreground">
                    <SelectValue placeholder="Select a default language" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="rounded-lg border-border bg-card text-card-foreground">
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fa">Farsi</SelectItem>
                  {/* Add more languages as needed */}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-base py-3" disabled={createTopicMutation.isPending}>
          {createTopicMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <PlusCircle className="mr-2 h-5 w-5" />
          )}
          Add Topic
        </Button>
      </form>
    </Form>
  );
};

export default NewTopicForm;