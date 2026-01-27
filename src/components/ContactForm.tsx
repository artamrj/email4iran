"use client";

import React, { useMemo, useState, useEffect } from 'react';
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
import { parseEmailList, selectPrimaryEmail } from '@/utils/email';

// Define the schema for email templates (re-using from AddTopicDialog)
const emailTemplateSchema = z.object({
  templateId: z.string().optional(),
  emailLanguage: z.string().min(1, { message: "Email template language is required." }),
  emailSubject: z.string().min(1, { message: "Email subject is required." }),
  emailBody: z.string().min(1, { message: "Email body is required." }),
});

// Define the schema for contacts (re-using from AddTopicDialog)
const contactSchema = z.object({
  contactId: z.string().optional(),
  contactName: z.string().min(1, { message: "Contact name is required." }),
  // contactOrganization: z.string().optional(), // Removed for simplification
  // contactLocation: z.string().optional(), // Removed for simplification
  contactEmoji: z.string().optional(),
  templateSourceContactIndex: z.number().int().nonnegative().optional(),
  contactEmail: z.string().min(1, { message: "Email is required." }).refine(
    (val) => {
      const emails = parseEmailList(val);
      if (emails.length === 0) return false;
      return emails.every(email => z.string().email().safeParse(email).success);
    },
    { message: "Invalid email format. Please enter one or more valid email addresses, separated by commas." }
  ),
  contactPrimaryEmail: z.string().optional(),
  contactLanguages: z.array(z.string()).min(1, { message: "At least one language is required." }),
  emailTemplates: z.array(emailTemplateSchema).min(1, { message: "At least one email template is required." }),
}).superRefine((data, ctx) => {
  const emails = parseEmailList(data.contactEmail);
  if (emails.length > 1) {
    if (!data.contactPrimaryEmail) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please select a primary email address.",
        path: ["contactPrimaryEmail"],
      });
    } else if (!emails.includes(data.contactPrimaryEmail)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Primary email must be one of the listed addresses.",
        path: ["contactPrimaryEmail"],
      });
    }
  }
});

// Define the schema for groups (re-using from AddTopicDialog)
const groupEntrySchema = z.object({
  groupId: z.string().optional(),
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
  allowRemoveExisting?: boolean;
  enableTemplateReuse?: boolean;
}

export const ContactForm: React.FC<ContactFormProps> = ({
  groupIndex,
  contactIndex,
  languages,
  removeContact,
  totalContacts,
  allowRemoveExisting = true,
  enableTemplateReuse = false,
}) => {
  const { control, watch, getValues, setValue } = useFormContext<z.infer<typeof contactsFormSchema>>();
  const [isOpen, setIsOpen] = useState(contactIndex === 0); // Open the first contact by default

  const { fields: emailTemplateFields, remove: removeEmailTemplate } = useFieldArray({
    control,
    name: `groups.${groupIndex}.contacts.${contactIndex}.emailTemplates`,
  });

  const templateSourcePath = `groups.${groupIndex}.contacts.${contactIndex}.templateSourceContactIndex` as const;
  const templatesPath = `groups.${groupIndex}.contacts.${contactIndex}.emailTemplates` as const;
  const contactName = watch(`groups.${groupIndex}.contacts.${contactIndex}.contactName`);
  const contactId = watch(`groups.${groupIndex}.contacts.${contactIndex}.contactId`);
  const templateSourceContactIndex = watch(templateSourcePath);
  const contactEmail = watch(`groups.${groupIndex}.contacts.${contactIndex}.contactEmail`);
  const contactPrimaryEmail = watch(`groups.${groupIndex}.contacts.${contactIndex}.contactPrimaryEmail`);
  const canRemoveContact = totalContacts > 1 && (allowRemoveExisting || !contactId);
  const primaryEmailPath = `groups.${groupIndex}.contacts.${contactIndex}.contactPrimaryEmail` as const;

  const emailOptions = useMemo(() => parseEmailList(contactEmail ?? ''), [contactEmail]);
  const contactsInGroup = watch(`groups.${groupIndex}.contacts`);

  const availableTemplateSources = useMemo(() => {
    if (!enableTemplateReuse || !Array.isArray(contactsInGroup)) {
      return [];
    }
    return contactsInGroup
      .slice(0, contactIndex)
      .map((contact, index) => {
        const name =
          contact?.contactName?.trim() ||
          `Contact #${index + 1}`;
        return {
          index,
          label: name,
          templateCount: contact?.emailTemplates?.length ?? 0,
        };
      })
      .filter((option) => option.templateCount > 0);
  }, [contactIndex, contactsInGroup, enableTemplateReuse]);

  const isTemplateLinked =
    enableTemplateReuse &&
    typeof templateSourceContactIndex === 'number' &&
    Number.isInteger(templateSourceContactIndex) &&
    templateSourceContactIndex >= 0;

  const linkedSourceLabel = useMemo(() => {
    if (!isTemplateLinked) return '';
    const source = availableTemplateSources.find((option) => option.index === templateSourceContactIndex);
    return source?.label ?? `Contact #${(templateSourceContactIndex ?? 0) + 1}`;
  }, [availableTemplateSources, isTemplateLinked, templateSourceContactIndex]);

  const sourceTemplates = isTemplateLinked
    ? watch(`groups.${groupIndex}.contacts.${templateSourceContactIndex}.emailTemplates`)
    : undefined;

  useEffect(() => {
    if (!isTemplateLinked || !Array.isArray(sourceTemplates)) return;
    const nextTemplates = sourceTemplates.map((template) => ({
      templateId: template?.templateId,
      emailLanguage: template?.emailLanguage ?? 'en',
      emailSubject: template?.emailSubject ?? '',
      emailBody: template?.emailBody ?? '',
    }));
    setValue(templatesPath, nextTemplates, { shouldDirty: true, shouldTouch: true });
  }, [isTemplateLinked, sourceTemplates, setValue, templatesPath]);

  useEffect(() => {
    if (emailOptions.length === 0) {
      if (contactPrimaryEmail) {
        setValue(primaryEmailPath, '', { shouldDirty: true, shouldTouch: true });
      }
      return;
    }

    const nextPrimary = selectPrimaryEmail(emailOptions, contactPrimaryEmail);
    if (nextPrimary !== contactPrimaryEmail) {
      setValue(primaryEmailPath, nextPrimary, { shouldDirty: true, shouldTouch: true });
    }
  }, [contactPrimaryEmail, emailOptions, primaryEmailPath, setValue]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="relative border border-border rounded-lg p-4 bg-card/50">
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between cursor-pointer py-2 -mx-2 px-2 rounded-md hover:bg-secondary/20 transition-colors">
          <h4 className="text-lg font-semibold text-foreground">
            Contact #{contactIndex + 1}: {contactName || 'New Contact'}
          </h4>
          <div className="flex items-center gap-2">
            {canRemoveContact && (
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
                <Input type="text" placeholder="contact@example.com, another@example.com" className="rounded-lg border-border bg-input text-foreground" {...field} />
              </FormControl>
              <FormDescription className="text-xs text-muted-foreground">
                Enter multiple emails separated by commas.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        {emailOptions.length > 1 && (
          <FormField
            control={control}
            name={`groups.${groupIndex}.contacts.${contactIndex}.contactPrimaryEmail`}
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel className="text-sm font-medium text-foreground">Primary Email (To)</FormLabel>
                <Select
                  value={field.value ?? ''}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger className="rounded-lg border-border bg-input text-foreground">
                      <SelectValue placeholder="Select primary email" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="rounded-lg bg-card text-card-foreground border-border">
                    {emailOptions.map((email) => (
                      <SelectItem key={email} value={email}>
                        {email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription className="text-xs text-muted-foreground">
                  Other emails will be added as CC.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
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
        {enableTemplateReuse && availableTemplateSources.length > 0 && (
          <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
            <Label className="text-sm font-medium text-foreground">Email Templates Source</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Reuse templates from another contact so you don't re-enter the same content.
            </p>
            <Select
              value={isTemplateLinked ? String(templateSourceContactIndex) : 'new'}
              onValueChange={(value) => {
                if (value === 'new') {
                  setValue(templateSourcePath, undefined, { shouldDirty: true, shouldTouch: true });
                  const currentTemplates = getValues(templatesPath) ?? [];
                  const detachedTemplates = currentTemplates.map((template) => ({
                    ...template,
                    templateId: undefined,
                  }));
                  setValue(templatesPath, detachedTemplates, { shouldDirty: true, shouldTouch: true });
                  return;
                }
                const sourceIndex = Number(value);
                if (Number.isNaN(sourceIndex)) return;
                setValue(templateSourcePath, sourceIndex, { shouldDirty: true, shouldTouch: true });
              }}
            >
              <FormControl>
                <SelectTrigger className="mt-2 rounded-lg border-border bg-input text-foreground">
                  <SelectValue placeholder="Create new templates" />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="rounded-lg bg-card text-card-foreground border-border">
                <SelectItem value="new">Create new templates</SelectItem>
                {availableTemplateSources.map((source) => (
                  <SelectItem key={source.index} value={String(source.index)}>
                    {source.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isTemplateLinked && (
              <p className="text-xs text-muted-foreground mt-2">
                Templates are linked to {linkedSourceLabel}. Edit the source contact to change them.
              </p>
            )}
          </div>
        )}
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
              allowRemoveExisting={allowRemoveExisting}
              readOnly={isTemplateLinked}
            />
          ))}
        </div>

        {!isTemplateLinked && (
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
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};
