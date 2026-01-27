"use client";

import React, { useState } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import * as z from 'zod';
import { Plus, ChevronDown, XCircle } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
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
import { EmailTemplateForm } from './EmailTemplateForm'; // Import the new EmailTemplateForm

// Define the schema for email templates (re-using from AddTopicDialog)
const emailTemplateSchema = z.object({
  emailLanguage: z.string().min(1, { message: "Email template language is required." }),
  emailSubject: z.string().min(1, { message: "Email subject is required." }),
  emailBody: z.string().min(1, { message: "Email body is required." }),
});

// Define the schema for contacts (re-using from AddTopicDialog)
const contactSchema = z.object({
  contactName: z.string().min(1, { message: "Contact name is required." }),
  // contactOrganization: z.string().optional(), // Removed for simplification
  // contactLocation: z.string().optional(), // Removed for simplification
  contactEmoji: z.string().optional(),
  contactEmail: z.string().min(1, { message: "Email is required." }).refine(
    (val) => {
      const emails = val.split(',').map(email => email.trim()).filter(Boolean);
      if (emails.length === 0) return false;
      return emails.every(email => z.string().email().safeParse(email).success);
    },
    { message: "Invalid email format. Please enter one or more valid email addresses, separated by commas." }
  ),
  contactLanguages: z.array(z.string()).min(1, { message: "At least one language is required." }),
  emailTemplates: z.array(emailTemplateSchema).min(1, { message: "At least one email template is required." }),
});

// Define the schema for groups (re-using from AddTopicDialog)
const groupEntrySchema = z.object({
  groupName: z.string().min(1, { message: "Group name is required." }),
  // groupDescription: z.string().optional(), // Removed for simplification
  contacts: z.array(contactSchema).min(1, { message: "At least one contact is required per group." }),
});

// Define the main form schema (re-using from AddTopicDialog)
const contactsFormSchema = z.object({
  groups: z.array(groupEntrySchema).min(1, { message: "At least one group is required." }),
});

interface ContactFormProps {
  groupIndex: number;
  contactIndex: number;
  languages: { value: string; label: string }[];
  removeContact: (index: number) => void;
  totalContacts: number;
}

export const ContactForm: React.FC<ContactFormProps> = ({
  groupIndex,
  contactIndex,
  languages,
  removeContact,
  totalContacts,
}) => {
  const { control, watch, getValues, setValue } = useFormContext<z.infer<typeof contactsFormSchema>>();
  const [isOpen, setIsOpen] = useState(contactIndex === 0); // Open the first contact by default

  const { fields: emailTemplateFields, remove: removeEmailTemplate } = useFieldArray({
    control,
    name: `groups.${groupIndex}.contacts.${contactIndex}.emailTemplates`,
  });

  const contactName = watch(`groups.${groupIndex}.contacts.${contactIndex}.contactName`);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="relative border border-border rounded-lg p-4 bg-card/50">
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between cursor-pointer py-2 -mx-2 px-2 rounded-md hover:bg-secondary/20 transition-colors">
          <h4 className="text-lg font-semibold text-foreground">
            Contact #{contactIndex + 1}: {contactName || 'New Contact'}
          </h4>
          <div className="flex items-center gap-2">
            {totalContacts > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent collapsible from toggling
                  removeContact(contactIndex);
                }}
                className="text-destructive hover:bg-destructive/10 rounded-full h-8 w-8"
              >
                <XCircle className="h-4 w-4" />
                <span className="sr-only">Remove Contact</span>
              </Button>
            )}
            <ChevronDown className={cn("h-5 w-5 transition-transform", isOpen ? "rotate-180" : "rotate-0")} />
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="grid gap-4 pt-4">
        {/* Contact Details */}
        <h5 className="text-md font-semibold text-foreground mt-2 mb-2">Contact Details</h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <FormField
            control={control}
            name={`groups.${groupIndex}.contacts.${contactIndex}.contactName`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-foreground">Contact Name</FormLabel>
                <FormControl>
                  <Input placeholder="Minister of Justice" className="rounded-lg border-border bg-input text-foreground" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Removed contactOrganization field */}
          <FormField
            control={control}
            name={`groups.${groupIndex}.contacts.${contactIndex}.contactEmoji`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-foreground">Emoji (e.g., 🇮🇷)</FormLabel>
                <FormControl>
                  <Input placeholder="🇮🇷" className="rounded-lg border-border bg-input text-foreground" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {/* Removed contactLocation field */}
        <FormField
          control={control}
          name={`groups.${groupIndex}.contacts.${contactIndex}.contactEmail`}
          render={({ field }) => (
            <FormItem className="mb-4">
              <FormLabel className="text-sm font-medium text-foreground">Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="contact@example.com, another@example.com" className="rounded-lg border-border bg-input text-foreground" {...field} />
              </FormControl>
              <FormDescription className="text-xs text-muted-foreground">
                Enter multiple emails separated by commas.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={`groups.${groupIndex}.contacts.${contactIndex}.contactLanguages`}
          render={({ field }) => (
            <FormItem className="mb-4">
              <FormLabel className="text-sm font-medium text-foreground">Contact Languages</FormLabel>
              <Select onValueChange={(value) => field.onChange([value])} defaultValue={field.value[0]}>
                <FormControl>
                  <SelectTrigger className="rounded-lg border-border bg-input text-foreground">
                    <SelectValue placeholder="Select a language" />
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
              <FormDescription className="text-xs text-muted-foreground">
                Select the primary language for this contact.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Separator className="my-4 bg-border rounded-full" />

        {/* Email Templates Field Array */}
        <h5 className="text-md font-semibold text-foreground mb-2">Email Templates</h5>
        <div className="grid gap-4">
          {emailTemplateFields.map((templateField, templateIndex) => (
            <EmailTemplateForm
              key={templateField.id}
              groupIndex={groupIndex}
              contactIndex={contactIndex}
              templateIndex={templateIndex}
              languages={languages}
              removeEmailTemplate={removeEmailTemplate}
              totalTemplates={emailTemplateFields.length}
            />
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const currentTemplates = getValues(`groups.${groupIndex}.contacts.${contactIndex}.emailTemplates`);
            setValue(`groups.${groupIndex}.contacts.${contactIndex}.emailTemplates`, [
              ...currentTemplates,
              {
                emailLanguage: 'en',
                emailSubject: '',
                emailBody: '',
              }
            ]);
          }}
          className="w-full rounded-lg border-primary text-primary hover:bg-primary/10 dark:hover:bg-primary/20 text-base py-3 mt-4"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Another Email Template
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
};