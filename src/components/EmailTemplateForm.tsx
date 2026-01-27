"use client";

import React, { useRef, useState } from 'react';
import { type FieldPath, useFormContext } from 'react-hook-form';
import * as z from 'zod';
import { ChevronDown, XCircle } from 'lucide-react';

import { Input } from '@/components/ui/input';
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
import { parseEmailList } from '@/utils/email';

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

type ContactsFormValues = z.infer<typeof contactsFormSchema>;

interface EmailTemplateFormProps {
  groupIndex: number;
  contactIndex: number;
  templateIndex: number;
  languages: { value: string; label: string }[];
  removeEmailTemplate: (index: number) => void;
  totalTemplates: number;
  allowRemoveExisting?: boolean;
  readOnly?: boolean;
}

export const EmailTemplateForm: React.FC<EmailTemplateFormProps> = ({
  groupIndex,
  contactIndex,
  templateIndex,
  languages,
  removeEmailTemplate,
  totalTemplates,
  allowRemoveExisting = true,
  readOnly = false,
}) => {
  const { control, watch, getValues, setValue } = useFormContext<ContactsFormValues>();
  const [isOpen, setIsOpen] = useState(templateIndex === 0); // Open the first template by default
  const [activeField, setActiveField] = useState<"subject" | "body">("subject");
  const subjectRef = useRef<HTMLInputElement | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  const currentLanguage = watch(`groups.${groupIndex}.contacts.${contactIndex}.emailTemplates.${templateIndex}.emailLanguage`);
  const languageLabel = languages.find(lang => lang.value === currentLanguage)?.label || 'New Template';
  const templateId = watch(`groups.${groupIndex}.contacts.${contactIndex}.emailTemplates.${templateIndex}.templateId`);
  const canRemoveTemplate = !readOnly && totalTemplates > 1 && (allowRemoveExisting || !templateId);

  const insertPlaceholder = (
    fieldPath: FieldPath<ContactsFormValues>,
    placeholder: string,
    element: HTMLInputElement | HTMLTextAreaElement | null,
  ) => {
    const rawValue = getValues(fieldPath);
    const currentValue = typeof rawValue === 'string' ? rawValue : '';

    if (!element) {
      const trimmed = currentValue.trim();
      const nextValue = trimmed ? `${trimmed} ${placeholder}` : placeholder;
      setValue(fieldPath, nextValue, { shouldDirty: true, shouldTouch: true });
      return;
    }

    const start = element.selectionStart ?? currentValue.length;
    const end = element.selectionEnd ?? currentValue.length;
    const nextValue =
      currentValue.slice(0, start) + placeholder + currentValue.slice(end);
    setValue(fieldPath, nextValue, { shouldDirty: true, shouldTouch: true });

    requestAnimationFrame(() => {
      element.focus();
      const cursor = start + placeholder.length;
      element.setSelectionRange(cursor, cursor);
    });
  };

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="relative rounded-2xl border border-border/60 bg-gradient-to-b from-card/80 via-card/60 to-card/30 p-5 shadow-sm"
    >
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between cursor-pointer rounded-xl px-3 py-3 -mx-1 hover:bg-muted/40 transition-colors">
          <div className="flex flex-col gap-1">
            <h5 className="text-md font-semibold text-foreground">
              Email Template #{templateIndex + 1}
            </h5>
            <span className="inline-flex w-fit items-center rounded-full border border-border/70 bg-muted/60 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {languageLabel}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {canRemoveTemplate && (
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
      <CollapsibleContent className="grid gap-5 pt-4">
        <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/80">
                Insert variables
              </span>
              <span className="text-muted-foreground/60">into</span>
              <span className="capitalize">
                {activeField === "subject" ? "subject" : "body"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant={activeField === "subject" ? "secondary" : "outline"}
                className="h-7 rounded-full px-3 text-xs"
                onClick={() => {
                  setActiveField("subject");
                  subjectRef.current?.focus();
                }}
                disabled={readOnly}
              >
                Subject
              </Button>
              <Button
                type="button"
                size="sm"
                variant={activeField === "body" ? "secondary" : "outline"}
                className="h-7 rounded-full px-3 text-xs"
                onClick={() => {
                  setActiveField("body");
                  bodyRef.current?.focus();
                }}
                disabled={readOnly}
              >
                Body
              </Button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 rounded-full px-3 text-xs border-dashed"
              onClick={() =>
                insertPlaceholder(
                  (activeField === "subject"
                    ? `groups.${groupIndex}.contacts.${contactIndex}.emailTemplates.${templateIndex}.emailSubject`
                    : `groups.${groupIndex}.contacts.${contactIndex}.emailTemplates.${templateIndex}.emailBody`) as FieldPath<ContactsFormValues>,
                  "{{name}}",
                  activeField === "subject" ? subjectRef.current : bodyRef.current,
                )
              }
              disabled={readOnly}
            >
              {"{{name}}"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 rounded-full px-3 text-xs border-dashed"
              onClick={() =>
                insertPlaceholder(
                  (activeField === "subject"
                    ? `groups.${groupIndex}.contacts.${contactIndex}.emailTemplates.${templateIndex}.emailSubject`
                    : `groups.${groupIndex}.contacts.${contactIndex}.emailTemplates.${templateIndex}.emailBody`) as FieldPath<ContactsFormValues>,
                  "{{city}}",
                  activeField === "subject" ? subjectRef.current : bodyRef.current,
                )
              }
              disabled={readOnly}
            >
              {"{{city}}"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 rounded-full px-3 text-xs border-dashed"
              onClick={() =>
                insertPlaceholder(
                  (activeField === "subject"
                    ? `groups.${groupIndex}.contacts.${contactIndex}.emailTemplates.${templateIndex}.emailSubject`
                    : `groups.${groupIndex}.contacts.${contactIndex}.emailTemplates.${templateIndex}.emailBody`) as FieldPath<ContactsFormValues>,
                  "{{country}}",
                  activeField === "subject" ? subjectRef.current : bodyRef.current,
                )
              }
              disabled={readOnly}
            >
              {"{{country}}"}
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border border-border/50 bg-card/40 p-4">
          <FormField
            control={control}
            name={`groups.${groupIndex}.contacts.${contactIndex}.emailTemplates.${templateIndex}.emailLanguage`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-foreground">Template Language</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={readOnly}>
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
                  <Input
                    placeholder="Regarding the recent events in {{city}}"
                    className="rounded-lg border-border bg-input text-foreground"
                    {...field}
                    ref={(node) => {
                      field.ref(node);
                      subjectRef.current = node;
                    }}
                    onFocus={() => setActiveField("subject")}
                    disabled={readOnly}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Keep it short and specific—placeholders work here too.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={control}
          name={`groups.${groupIndex}.contacts.${contactIndex}.emailTemplates.${templateIndex}.emailBody`}
          render={({ field }) => (
            <FormItem className="mb-2 rounded-xl border border-border/50 bg-card/40 p-4">
              <FormLabel className="text-sm font-medium text-foreground">Body</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Dear {{name}}, I am writing to express my concern..."
                  rows={6}
                  className="rounded-lg border-border bg-input text-foreground"
                  {...field}
                  ref={(node) => {
                    field.ref(node);
                    bodyRef.current = node;
                  }}
                  onFocus={() => setActiveField("body")}
                  disabled={readOnly}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                Aim for a friendly, clear tone and keep paragraphs short.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
      </CollapsibleContent>
    </Collapsible>
  );
};
