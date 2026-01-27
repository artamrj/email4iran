"use client";

import React, { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import * as z from 'zod';
import { ChevronDown, XCircle } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

// Define the schema for email templates (re-using from AddTopicDialog)
const emailTemplateSchema = z.object({
  emailLanguage: z.string().min(1, { message: "Email template language is required." }),
  emailSubject: z.string().min(1, { message: "Email subject is required." }),
  emailBody: z.string().min(1, { message: "Email body is required." }),
});

// Define the schema for contacts (re-using from AddTopicDialog)
const contactSchema = z.object({
  contactName: z.string().min(1, { message: "Contact name is required." }),
  contactOrganization: z.string().optional(),
  contactLocation: z.string().optional(),
  contactEmoji: z.string().optional(),
  contactEmail: z.string().min(1, { message: "Email is required." }).refine(
    (val) => {
      const emails = val.split(',').map(email => email.trim()).filter(Boolean);
      if (emails.length === 0) return false;
      return emails.every(email => z.string().email().safeParse(email).success);
    },
    { message: "Invalid email format. Each email must be valid and separated by commas. Individual email addresses cannot contain commas." }
  ),
  contactLanguages: z.array(z.string()).min(1, { message: "At least one language is required." }),
  emailTemplates: z.array(emailTemplateSchema).min(1, { message: "At least one email template is required." }),
});

// Define the schema for groups (re-using from AddTopicDialog)
const groupEntrySchema = z.object({
  groupName: z.string().min(1, { message: "Group name is required." }),
  groupDescription: z.string().optional(),
  contacts: z.array(contactSchema).min(1, { message: "At least one contact is required per group." }),
});

// Define the main form schema (re-using from AddTopicDialog)
const contactsFormSchema = z.object({
  groups: z.array(groupEntrySchema).min(1, { message: "At least one group is required." }),
});

interface EmailTemplateFormProps {
  groupIndex: number;
  contactIndex: number;
  templateIndex: number;
  languages: { value: string; label: string }[];
  removeEmailTemplate: (index: number) => void;
  totalTemplates: number;
}

export const EmailTemplateForm: React.FC<EmailTemplateFormProps> = ({
  groupIndex,
  contactIndex,
  templateIndex,
  languages,
  removeEmailTemplate,
  totalTemplates,
}) => {
  const { control, watch } = useFormContext<z.infer<typeof contactsFormSchema>>();
  const [isOpen, setIsOpen] = useState(templateIndex === 0); // Open the first template by default

  const currentLanguage = watch(`groups.${groupIndex}.contacts.${contactIndex}.emailTemplates.${templateIndex}.emailLanguage`);
  const languageLabel = languages.find(lang => lang.value === currentLanguage)?.label || 'New Template';

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="relative border border-border rounded-lg p-4 bg-card/30">
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between cursor-pointer py-2 -mx-2 px-2 rounded-md hover:bg-secondary/20 transition-colors">
          <h5 className="text-md font-semibold text-foreground">
            Email Template #{templateIndex + 1}: {languageLabel}
          </h5>
          <div className="flex items-center gap-2">
            {totalTemplates > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent collapsible from toggling
                  removeEmailTemplate(templateIndex);
                }}
                className="text-destructive hover:bg-destructive/10 rounded-full h-8 w-8"
              >
                <XCircle className="h-4 w-4" />
                <span className="sr-only">Remove Email Template</span>
              </Button>
            )}
            <ChevronDown className={cn("h-5 w-5 transition-transform", isOpen ? "rotate-180" : "rotate-0")} />
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="grid gap-4 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <FormField
            control={control}
            name={`groups.${groupIndex}.contacts.${contactIndex}.emailTemplates.${templateIndex}.emailLanguage`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-foreground">Template Language</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="rounded-lg border-border bg-input text-foreground">
                      <SelectValue placeholder="Select template language" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="rounded-lg bg-card text-card-foreground border-border">
                    {languages.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`groups.${groupIndex}.contacts.${contactIndex}.emailTemplates.${templateIndex}.emailSubject`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-foreground">Subject</FormLabel>
                <FormControl>
                  <Input placeholder="Regarding the recent events in {{city}}" className="rounded-lg border-border bg-input text-foreground" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={control}
          name={`groups.${groupIndex}.contacts.${contactIndex}.emailTemplates.${templateIndex}.emailBody`}
          render={({ field }) => (
            <FormItem className="mb-2">
              <FormLabel className="text-sm font-medium text-foreground">Body</FormLabel>
              <FormControl>
                <Textarea placeholder="Dear {{name}}, I am writing to express my concern..." rows={6} className="rounded-lg border-border bg-input text-foreground" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CollapsibleContent>
    </Collapsible>
  );
};