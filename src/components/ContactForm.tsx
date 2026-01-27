"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
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
import { getLanguageLabel, useTranslation } from '@/lib/i18n';
import { type ContactsFormValues } from '@/types/forms';

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
  const { t, locale } = useTranslation();
  const { control, watch, getValues, setValue } = useFormContext<ContactsFormValues>();
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
          t("contactNumber", { index: index + 1 });
        return {
          index,
          label: name,
          templateCount: contact?.emailTemplates?.length ?? 0,
        };
      })
      .filter((option) => option.templateCount > 0);
  }, [contactIndex, contactsInGroup, enableTemplateReuse, t]);

  const isTemplateLinked =
    enableTemplateReuse &&
    typeof templateSourceContactIndex === 'number' &&
    Number.isInteger(templateSourceContactIndex) &&
    templateSourceContactIndex >= 0;

  const linkedSourceLabel = useMemo(() => {
    if (!isTemplateLinked) return '';
    const source = availableTemplateSources.find((option) => option.index === templateSourceContactIndex);
    return source?.label ?? t("contactNumber", { index: (templateSourceContactIndex ?? 0) + 1 });
  }, [availableTemplateSources, isTemplateLinked, templateSourceContactIndex, t]);

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
            {t("contactTitle", {
              index: contactIndex + 1,
              name: contactName || t("newContact"),
            })}
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
                <span className="sr-only">{t("removeContact")}</span>
              </Button>
            )}
            <ChevronDown className={cn("h-5 w-5 transition-transform", isOpen ? "rotate-180" : "rotate-0")} />
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="grid gap-4 pt-4">
        {/* Contact Details */}
        <h5 className="text-md font-semibold text-foreground mt-2 mb-2">
          {t("contactDetails")}
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <FormField
            control={control}
            name={`groups.${groupIndex}.contacts.${contactIndex}.contactName`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-foreground">
                  {t("contactNameLabel")}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("contactNamePlaceholder")}
                    className="rounded-lg border-border bg-input text-foreground"
                    {...field}
                  />
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
                <FormLabel className="text-sm font-medium text-foreground">
                  {t("contactEmojiLabel")}
                </FormLabel>
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
              <FormLabel className="text-sm font-medium text-foreground">
                {t("emailLabel")}
              </FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder={t("emailPlaceholder")}
                  className="rounded-lg border-border bg-input text-foreground"
                  {...field}
                />
              </FormControl>
              <FormDescription className="text-xs text-muted-foreground">
                {t("multipleEmailsHelp")}
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
                <FormLabel className="text-sm font-medium text-foreground">
                  {t("primaryEmailLabel")}
                </FormLabel>
                <Select
                  value={field.value ?? ''}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger className="rounded-lg border-border bg-input text-foreground">
                      <SelectValue placeholder={t("selectPrimaryEmail")} />
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
                  {t("ccNote")}
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
              <FormLabel className="text-sm font-medium text-foreground">
                {t("contactLanguagesLabel")}
              </FormLabel>
              <Select onValueChange={(value) => field.onChange([value])} defaultValue={field.value[0]}>
                <FormControl>
                  <SelectTrigger className="rounded-lg border-border bg-input text-foreground">
                    <SelectValue placeholder={t("selectLanguage")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="rounded-lg bg-card text-card-foreground border-border">
                  {languages.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {getLanguageLabel(lang.value, locale, t, lang.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription className="text-xs text-muted-foreground">
                {t("primaryLanguageHelp")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        {enableTemplateReuse && availableTemplateSources.length > 0 && (
          <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
            <Label className="text-sm font-medium text-foreground">
              {t("emailTemplatesSourceLabel")}
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              {t("emailTemplatesSourceHelp")}
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
                  <SelectValue placeholder={t("createNewTemplates")} />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="rounded-lg bg-card text-card-foreground border-border">
                <SelectItem value="new">{t("createNewTemplates")}</SelectItem>
                {availableTemplateSources.map((source) => (
                  <SelectItem key={source.index} value={String(source.index)}>
                    {source.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isTemplateLinked && (
              <p className="text-xs text-muted-foreground mt-2">
                {t("templatesLinked", { name: linkedSourceLabel })}
              </p>
            )}
          </div>
        )}
        <Separator className="my-4 bg-border rounded-full" />

        {/* Email Templates Field Array */}
        <h5 className="text-md font-semibold text-foreground mb-2">
          {t("emailTemplatesLabel")}
        </h5>
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
            <Plus className="mr-2 h-4 w-4" /> {t("addAnotherTemplate")}
          </Button>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};
