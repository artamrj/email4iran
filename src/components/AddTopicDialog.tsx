"use client";

import React, { useMemo, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, ChevronLeft, CheckCircle2, XCircle, ChevronDown } from 'lucide-react';

import { Button, type ButtonProps } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { showSuccess, showError } from '@/utils/toast';
import { buildCcEmails, parseEmailList, selectPrimaryEmail } from '@/utils/email';
import { createTopic, createGroup, createContact, createEmailTemplate, linkEmailTemplateToContact } from '@/services/supabaseService';
import { Topic, Group, Contact, EmailTemplate } from '@/types/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils'; // Import cn for conditional classNames
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'; // New imports for Tooltip

import { ContactForm } from './ContactForm';
import { PasswordPrompt } from './PasswordPrompt'; // New import
import { languages } from '@/constants/languages';
import { useTranslation } from '@/lib/i18n';

type Translator = ReturnType<typeof useTranslation>["t"];

const buildTopicFormSchema = (t: Translator) =>
  z.object({
    slug: z
      .string()
      .min(1, { message: t("validationSlugRequired") })
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
        message: t("validationSlugFormat"),
      }),
    name: z.string().min(1, { message: t("validationTopicNameRequired") }),
    description: z
      .string()
      .min(1, { message: t("validationDescriptionRequired") }),
    emoji: z.string().optional(),
  });

const buildEmailTemplateSchema = (t: Translator) =>
  z.object({
    templateId: z.string().optional(),
    emailLanguage: z
      .string()
      .min(1, { message: t("validationEmailTemplateLanguageRequired") }),
    emailSubject: z
      .string()
      .min(1, { message: t("validationEmailSubjectRequired") }),
    emailBody: z
      .string()
      .min(1, { message: t("validationEmailBodyRequired") }),
  });

const buildContactSchema = (t: Translator) => {
  const emailTemplateSchema = buildEmailTemplateSchema(t);
  return z
    .object({
      contactId: z.string().optional(),
      contactName: z
        .string()
        .min(1, { message: t("validationContactNameRequired") }),
      // contactOrganization: z.string().optional(), // Removed for simplification
      // contactLocation: z.string().optional(), // Removed for simplification
      contactEmoji: z.string().optional(),
      templateSourceContactIndex: z.number().int().nonnegative().optional(),
      contactEmail: z
        .string()
        .min(1, { message: t("validationEmailRequired") })
        .refine(
          (val) => {
            const emails = parseEmailList(val);
            if (emails.length === 0) return false; // Must have at least one email
            return emails.every((email) => z.string().email().safeParse(email).success);
          },
          { message: t("validationEmailInvalid") },
        ),
      contactPrimaryEmail: z.string().optional(),
      contactLanguages: z
        .array(z.string())
        .min(1, { message: t("validationLanguageRequired") }),
      emailTemplates: z
        .array(emailTemplateSchema)
        .min(1, { message: t("validationEmailTemplateRequired") }),
    })
    .superRefine((data, ctx) => {
      const emails = parseEmailList(data.contactEmail);
      if (emails.length > 1) {
        if (!data.contactPrimaryEmail) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t("validationPrimaryEmailRequired"),
            path: ["contactPrimaryEmail"],
          });
        } else if (!emails.includes(data.contactPrimaryEmail)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t("validationPrimaryEmailMustBeListed"),
            path: ["contactPrimaryEmail"],
          });
        }
      }
    });
};

const buildGroupEntrySchema = (t: Translator) => {
  const contactSchema = buildContactSchema(t);
  return z.object({
    groupId: z.string().optional(),
    groupName: z.string().min(1, { message: t("validationGroupNameRequired") }),
    // groupDescription: z.string().optional(), // Removed for simplification
    contacts: z
      .array(contactSchema)
      .min(1, { message: t("validationContactRequiredPerGroup") }),
  });
};

const buildContactsFormSchema = (t: Translator) => {
  const groupEntrySchema = buildGroupEntrySchema(t);
  return z.object({
    groups: z.array(groupEntrySchema).min(1, { message: t("validationGroupRequired") }),
  });
};

interface AddTopicDialogProps {
  triggerLabel?: string;
  triggerClassName?: string;
  triggerVariant?: ButtonProps["variant"];
  triggerSize?: ButtonProps["size"];
  showTooltip?: boolean;
  skipPassword?: boolean;
}

export const AddTopicDialog: React.FC<AddTopicDialogProps> = ({
  triggerLabel,
  triggerClassName,
  triggerVariant = "ghost",
  triggerSize = "default",
  showTooltip = true,
  skipPassword = false,
}) => {
  const { t } = useTranslation();
  const topicFormSchema = useMemo(() => buildTopicFormSchema(t), [t]);
  const contactsFormSchema = useMemo(() => buildContactsFormSchema(t), [t]);
  type TopicFormValues = z.infer<typeof topicFormSchema>;
  type ContactsFormValues = z.infer<typeof contactsFormSchema>;

  const resolvedTriggerLabel = triggerLabel ?? t("addNewTopic");
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [tempTopicData, setTempTopicData] = useState<TopicFormValues | null>(null);
  const [isPasswordVerified, setIsPasswordVerified] = useState(skipPassword); // New state
  const queryClient = useQueryClient();

  const hasPasswordConfigured =
    skipPassword ||
    !!process.env.NEXT_PUBLIC_ADD_TOPIC_PASSWORD ||
    !!process.env.NEXT_PUBLIC_ADMIN_PASSWORD; // Check if env var is set
  const passwordEnvKey = process.env.NEXT_PUBLIC_ADD_TOPIC_PASSWORD
    ? "NEXT_PUBLIC_ADD_TOPIC_PASSWORD"
    : "NEXT_PUBLIC_ADMIN_PASSWORD";
  const expectedPassword =
    process.env.NEXT_PUBLIC_ADD_TOPIC_PASSWORD ??
    process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
  const expectedPasswords = [
    process.env.NEXT_PUBLIC_ADD_TOPIC_PASSWORD,
    process.env.NEXT_PUBLIC_ADMIN_PASSWORD,
  ].filter((value): value is string => Boolean(value));

  const topicForm = useForm<TopicFormValues>({
    resolver: zodResolver(topicFormSchema),
    defaultValues: {
      slug: '',
      name: '',
      description: '',
      emoji: '',
    },
  });

  const contactForm = useForm<ContactsFormValues>({
    resolver: zodResolver(contactsFormSchema),
    defaultValues: {
      groups: [{
        groupName: '',
        contacts: [{
          contactName: '',
          contactEmoji: '',
          templateSourceContactIndex: undefined,
          contactEmail: '',
          contactPrimaryEmail: '',
          contactLanguages: ['en'],
          emailTemplates: [{
            emailLanguage: 'en',
            emailSubject: '',
            emailBody: '',
          }],
        }],
      }],
    },
  });

  const { fields: groupFields, append: appendGroup, remove: removeGroup } = useFieldArray({
    control: contactForm.control,
    name: "groups",
  });

  const handleTopicSubmit = async (values: TopicFormValues) => {
    setTempTopicData(values);
    showSuccess(t("topicDetailsSaved"));
    setStep(2);
  };

  const handleContactsSubmit = async (values: ContactsFormValues) => {
    if (!tempTopicData) {
      showError(t("topicDetailsMissing"));
      return;
    }

    try {
      // First, create the topic in the database
      const createdTopic = await createTopic(tempTopicData as Omit<Topic, 'id'>);
      const newTopicId = createdTopic.id;

      for (let groupIndex = 0; groupIndex < values.groups.length; groupIndex += 1) {
        const groupEntry = values.groups[groupIndex];
        // Create Group
        const groupData: Omit<Group, 'id'> = {
          topic_id: newTopicId, // Link to the newly created topic
          name: groupEntry.groupName,
          description: '', // Required by type; description field removed from form
        };
        const createdGroup = await createGroup(groupData);

        const templateIdsByContactIndex = new Map<number, string[]>();

        for (let contactIndex = 0; contactIndex < groupEntry.contacts.length; contactIndex += 1) {
          const contactEntry = groupEntry.contacts[contactIndex];
          const emails = parseEmailList(contactEntry.contactEmail);
          const primaryEmail = selectPrimaryEmail(emails, contactEntry.contactPrimaryEmail);
          const ccEmails = buildCcEmails(emails, primaryEmail);

          // Create Contact
          const contactData: Omit<Contact, 'id'> = {
            group_id: createdGroup.id,
            name: contactEntry.contactName,
            organization: null, // Set to null as it's removed from form
            location: null, // Set to null as it's removed from form
            emoji: contactEntry.contactEmoji || '👤',
            email: primaryEmail,
            cc_emails: ccEmails,
            languages: contactEntry.contactLanguages,
          };
          const createdContact = await createContact(contactData);

          const createTemplatesForContact = async (): Promise<string[]> => {
            const createdTemplateIds: string[] = [];
            for (const templateEntry of contactEntry.emailTemplates) {
              const emailTemplateData: Omit<EmailTemplate, 'id'> = {
                contact_id: createdContact.id,
                language: templateEntry.emailLanguage,
                subject: templateEntry.emailSubject,
                body: templateEntry.emailBody,
              };
              const createdTemplate = await createEmailTemplate(emailTemplateData);
              createdTemplateIds.push(createdTemplate.id);
            }
            return createdTemplateIds;
          };

          const sourceIndex = contactEntry.templateSourceContactIndex;
          if (
            typeof sourceIndex === 'number' &&
            Number.isInteger(sourceIndex) &&
            sourceIndex >= 0 &&
            sourceIndex < contactIndex
          ) {
            const sourceTemplateIds = templateIdsByContactIndex.get(sourceIndex) ?? [];
            if (sourceTemplateIds.length > 0) {
              for (const templateId of sourceTemplateIds) {
                await linkEmailTemplateToContact(createdContact.id, templateId);
              }
              templateIdsByContactIndex.set(contactIndex, sourceTemplateIds);
            } else {
              const createdTemplateIds = await createTemplatesForContact();
              templateIdsByContactIndex.set(contactIndex, createdTemplateIds);
            }
          } else {
            const createdTemplateIds = await createTemplatesForContact();
            templateIdsByContactIndex.set(contactIndex, createdTemplateIds);
          }
        }
      }

      showSuccess(t("addAllDetailsSuccess"));
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      queryClient.invalidateQueries({ queryKey: ['topics', 'admin'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['contactsByGroups'] });
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
      setIsOpen(false);
      setStep(1);
      topicForm.reset();
      contactForm.reset();
      setTempTopicData(null); // Clear temporary data
    } catch (error) {
      console.error('Error adding all details:', error);
      showError(t("addAllDetailsFailed"));
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setStep(1);
      topicForm.reset();
      contactForm.reset();
      setTempTopicData(null); // Clear temporary data on close
      setIsPasswordVerified(skipPassword); // Reset password verification on close
    }
  };

  const handlePasswordSuccess = () => {
    setIsPasswordVerified(true);
    setStep(1); // Start at step 1 after password verification
  };

  const handlePasswordCancel = () => {
    setIsOpen(false); // Close dialog if password prompt is cancelled
    setIsPasswordVerified(false); // Ensure it's reset
  };

  const triggerButton = (
    <Button
      onClick={() => setIsOpen(true)}
      variant={triggerVariant}
      size={triggerSize}
      className={
        triggerClassName ??
        "absolute top-4 left-4 z-50 rounded-full px-4 py-2 text-foreground hover:bg-secondary transition-colors duration-300 ease-in-out flex items-center gap-2"
      }
      disabled={!hasPasswordConfigured} // Disable if password not configured
    >
      <Plus className="h-5 w-5" />
      <span>{resolvedTriggerLabel}</span>
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {showTooltip ? (
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>{triggerButton}</TooltipTrigger>
          {!hasPasswordConfigured && (
            <TooltipContent className="rounded-lg bg-card text-card-foreground border-border shadow-md">
              <p>
                {t("adminEnvTooltip")}
              </p>
            </TooltipContent>
          )}
        </Tooltip>
      ) : (
        triggerButton
      )}
      <DialogContent className="sm:max-w-[700px] rounded-xl p-6 bg-card text-card-foreground overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">
            {!isPasswordVerified
              ? t("enterPassword")
              : step === 1
                ? t("createNewTopicTitle")
                : t("addContactDetailsTitle")}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {!isPasswordVerified
              ? t("passwordRequiredAddTopics")
              : step === 1
                ? t("fillTopicDetails")
                : t("addGroupsContactsTemplates")}
          </DialogDescription>
        </DialogHeader>

        {!isPasswordVerified ? (
          <PasswordPrompt
            onSuccess={handlePasswordSuccess}
            onCancel={handlePasswordCancel}
            passwordEnvKey={passwordEnvKey}
            expectedPassword={expectedPassword}
            expectedPasswords={expectedPasswords}
          />
        ) : (
          <>
            {step === 1 && (
              <Form {...topicForm}>
                <form onSubmit={topicForm.handleSubmit(handleTopicSubmit)} className="grid gap-4 py-4">
                  <FormField
                    control={topicForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-foreground">
                          {t("topicNameLabel")}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("topicNamePlaceholder")}
                            className="rounded-lg border-border bg-input text-foreground"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={topicForm.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-foreground">
                          {t("slugLabel")}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("slugPlaceholder")}
                            className="rounded-lg border-border bg-input text-foreground"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={topicForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-foreground">
                          {t("descriptionLabel")}
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t("descriptionPlaceholder")}
                            rows={4}
                            className="rounded-lg border-border bg-input text-foreground"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={topicForm.control}
                    name="emoji"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-foreground">
                          {t("emojiLabel")}
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="✊" className="rounded-lg border-border bg-input text-foreground" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter className="pt-4">
                    <Button type="submit" className="w-full rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-base py-3">
                      {t("nextAddContacts")} <CheckCircle2 className="ml-2 h-4 w-4" />
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            )}

            {step === 2 && (
              <Form {...contactForm}>
                <form onSubmit={contactForm.handleSubmit(handleContactsSubmit)} className="grid gap-4 py-4">
                  {groupFields.map((groupField, groupIndex) => (
                    <Collapsible key={groupField.id} defaultOpen={groupIndex === 0} className="relative border border-border rounded-xl p-6 mb-6 bg-secondary/10">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between cursor-pointer py-2 -mx-2 px-2 rounded-md hover:bg-secondary/20 transition-colors">
                          <h3 className="text-xl font-bold text-foreground">
                            {t("groupTitle", {
                              index: groupIndex + 1,
                              name:
                                contactForm.watch(`groups.${groupIndex}.groupName`) ||
                                t("newGroup"),
                            })}
                          </h3>
                          <div className="flex items-center gap-2">
                            {groupFields.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent collapsible from toggling
                                  removeGroup(groupIndex);
                                }}
                                className="text-destructive hover:bg-destructive/10 rounded-full h-8 w-8"
                              >
                                <XCircle className="h-5 w-5" />
                                <span className="sr-only">{t("removeGroup")}</span>
                              </Button>
                            )}
                            <ChevronDown className="h-5 w-5 transition-transform rotate-0" />
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="grid gap-4 pt-4">
                        {/* Group Details */}
                        <h4 className="text-lg font-semibold text-foreground mt-2 mb-2">
                          {t("groupDetails")}
                        </h4>
                        <FormField
                          control={contactForm.control}
                          name={`groups.${groupIndex}.groupName`}
                          render={({ field }) => (
                            <FormItem className="mb-2">
                              <FormLabel className="text-sm font-medium text-foreground">
                                {t("groupNameLabel")}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder={t("groupNamePlaceholder")}
                                  className="rounded-lg border-border bg-input text-foreground"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {/* Removed groupDescription field */}
                        <Separator className="my-6 bg-border rounded-full" />

                        {/* Contacts Field Array */}
                        <h4 className="text-lg font-semibold text-foreground mb-2">
                          {t("contactsInGroup")}
                        </h4>
                        <div className="grid gap-4">
                          {contactForm.watch(`groups.${groupIndex}.contacts`)?.map((contactField, contactIndex) => (
                            <ContactForm
                              key={`${groupIndex}-${contactIndex}`}
                              groupIndex={groupIndex}
                              contactIndex={contactIndex}
                              languages={languages}
                              removeContact={() => {
                                const currentContacts = contactForm.getValues(`groups.${groupIndex}.contacts`);
                                const nextContacts = currentContacts.filter((_, index) => index !== contactIndex);
                                const adjustedContacts = nextContacts.map((contact, index) => {
                                  const sourceIndex = contact?.templateSourceContactIndex;
                                  if (typeof sourceIndex !== 'number') {
                                    return contact;
                                  }
                                  if (sourceIndex === contactIndex) {
                                    return { ...contact, templateSourceContactIndex: undefined };
                                  }
                                  if (sourceIndex > contactIndex) {
                                    return { ...contact, templateSourceContactIndex: sourceIndex - 1 };
                                  }
                                  return contact;
                                });
                                contactForm.setValue(`groups.${groupIndex}.contacts`, adjustedContacts);
                              }}
                              totalContacts={contactForm.getValues(`groups.${groupIndex}.contacts`).length}
                              enableTemplateReuse
                            />
                          ))}
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const currentContacts = contactForm.getValues(`groups.${groupIndex}.contacts`);
                            contactForm.setValue(`groups.${groupIndex}.contacts`, [
                              ...currentContacts,
                              {
                                contactName: '',
                                // contactOrganization: '', // Removed for simplification
                                // contactLocation: '', // Removed for simplification
                                contactEmoji: '',
                                templateSourceContactIndex: undefined,
                                contactEmail: '',
                                contactPrimaryEmail: '',
                                contactLanguages: ['en'],
                                emailTemplates: [{
                                  emailLanguage: 'en',
                                  emailSubject: '',
                                  emailBody: '',
                                }],
                              }
                            ]);
                          }}
                          className="w-full rounded-lg border-primary text-primary hover:bg-primary/10 dark:hover:bg-primary/20 text-base py-3 mt-4"
                        >
                          <Plus className="mr-2 h-4 w-4" /> {t("addAnotherContact")}
                        </Button>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => appendGroup({
                      groupName: '',
                      // groupDescription: '', // Removed for simplification
                      contacts: [{
                        contactName: '',
                        // contactOrganization: '', // Removed for simplification
                        // contactLocation: '', // Removed for simplification
                        contactEmoji: '',
                        templateSourceContactIndex: undefined,
                        contactEmail: '',
                        contactPrimaryEmail: '',
                        contactLanguages: ['en'],
                        emailTemplates: [{
                          emailLanguage: 'en',
                          emailSubject: '',
                          emailBody: '',
                        }],
                      }],
                    })}
                    className="w-full rounded-lg border-accent text-accent hover:bg-accent/10 dark:hover:bg-accent/20 text-base py-3 mt-4"
                  >
                    <Plus className="mr-2 h-4 w-4" /> {t("addAnotherGroup")}
                  </Button>

                  <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="w-full sm:w-auto rounded-lg border-secondary text-secondary-foreground hover:bg-secondary/80 text-base py-3"
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" /> {t("backButton")}
                    </Button>
                    <Button type="submit" className="w-full sm:w-auto rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-base py-3">
                      {t("addAllDetails")} <CheckCircle2 className="ml-2 h-4 w-4" />
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
