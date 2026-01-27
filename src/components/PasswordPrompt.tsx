"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { showSuccess, showError } from '@/utils/toast';

const passwordSchema = z.object({
  password: z.string().min(1, { message: "Password is required." }),
});

interface PasswordPromptProps {
  onSuccess: () => void;
  onCancel: () => void;
  passwordEnvKey?: string;
  expectedPassword?: string;
  expectedPasswords?: string[];
  passwordMatches?: { password: string; match: string }[];
  onSuccessWithMatch?: (match: string) => void;
}

export const PasswordPrompt: React.FC<PasswordPromptProps> = ({
  onSuccess,
  onCancel,
  passwordEnvKey = "NEXT_PUBLIC_ADD_TOPIC_PASSWORD",
  expectedPassword,
  expectedPasswords,
  passwordMatches,
  onSuccessWithMatch,
}) => {
  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: '',
    },
  });

  const onSubmit = (values: z.infer<typeof passwordSchema>) => {
    // NEXT_PUBLIC_ADD_TOPIC_PASSWORD should be set as a build-time environment variable
    // in your hosting platform or locally when running `next dev`.
    if (passwordMatches && passwordMatches.length > 0) {
      const matchEntry = passwordMatches.find((entry) => entry.password === values.password);
      if (matchEntry) {
        showSuccess("Password verified!");
        onSuccess();
        onSuccessWithMatch?.(matchEntry.match);
        return;
      }
      showError("Incorrect password.");
      form.setError("password", { message: "Incorrect password." });
      return;
    }

    if (passwordMatches && passwordMatches.length === 0) {
      showError(`Password not configured. Please set ${passwordEnvKey} as a build-time environment variable.`);
      return;
    }

    const fallbackPasswords = [
      process.env.NEXT_PUBLIC_ADMIN_PASSWORD,
      process.env.NEXT_PUBLIC_ADD_TOPIC_PASSWORD,
    ].filter((value): value is string => Boolean(value));

    const resolvedPasswords =
      expectedPasswords?.filter((value): value is string => Boolean(value)) ??
      (expectedPassword ? [expectedPassword] : fallbackPasswords);

    if (resolvedPasswords.length === 0) {
      showError(`Password not configured. Please set ${passwordEnvKey} as a build-time environment variable.`);
      return;
    }

    if (resolvedPasswords.includes(values.password)) {
      showSuccess("Password verified!");
      onSuccess();
    } else {
      showError("Incorrect password.");
      form.setError("password", { message: "Incorrect password." });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-foreground">Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Enter password" className="rounded-lg border-border bg-input text-foreground" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} className="rounded-lg border-secondary text-secondary-foreground hover:bg-secondary/80">
            Cancel
          </Button>
          <Button type="submit" className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground">
            Verify
          </Button>
        </div>
      </form>
    </Form>
  );
};
