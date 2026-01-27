"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, ChevronDown, XCircle, Save } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import {
  createContact,
  createEmailTemplate,
  createGroup,
  getContactsByGroupId,
  getEmailTemplatesByContactId,
  getGroupsByTopicId,
  setContactEmailTemplates,
  updateContact,
  updateEmailTemplate,
  updateGroup,
} from "@/services/supabaseService";
import { Topic, Group, Contact, EmailTemplate } from "@/types/supabase";
import { showError, showSuccess } from "@/utils/toast";
import { ContactForm } from "@/components/ContactForm";
import { languages } from "@/constants/languages";
import { buildCcEmails, joinEmailList, parseEmailList, selectPrimaryEmail } from "@/utils/email";

const emailTemplateSchema = z.object({
  templateId: z.string().optional(),
  emailLanguage: z.string().min(1, { message: "Email template language is required." }),
  emailSubject: z.string().min(1, { message: "Email subject is required." }),
  emailBody: z.string().min(1, { message: "Email body is required." }),
});

const contactSchema = z.object({
  contactId: z.string().optional(),
  contactName: z.string().min(1, { message: "Contact name is required." }),
  contactEmoji: z.string().optional(),
  templateSourceContactIndex: z.number().int().nonnegative().optional(),
  contactEmail: z
    .string()
    .min(1, { message: "Email is required." })
    .refine(
      (val) => {
        const emails = parseEmailList(val);
        if (emails.length === 0) return false;
        return emails.every((email) => z.string().email().safeParse(email).success);
      },
      { message: "Invalid email format. Please enter one or more valid email addresses, separated by commas." },
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

const groupEntrySchema = z.object({
  groupId: z.string().optional(),
  groupName: z.string().min(1, { message: "Group name is required." }),
  contacts: z.array(contactSchema).min(1, { message: "At least one contact is required per group." }),
});

const contactsFormSchema = z.object({
  groups: z.array(groupEntrySchema).min(1, { message: "At least one group is required." }),
});

type ContactsFormValues = z.infer<typeof contactsFormSchema>;

type AdminContact = Contact & { emailTemplates: EmailTemplate[] };

type AdminGroup = Group & { contacts: AdminContact[] };

interface EditTopicDialogProps {
  topic: Topic;
}

const blankEmailTemplate = () => ({
  templateId: undefined,
  emailLanguage: "en",
  emailSubject: "",
  emailBody: "",
});

const blankContact = () => ({
  contactId: undefined,
  contactName: "",
  contactEmoji: "",
  templateSourceContactIndex: undefined,
  contactEmail: "",
  contactPrimaryEmail: "",
  contactLanguages: ["en"],
  emailTemplates: [blankEmailTemplate()],
});

const blankGroup = () => ({
  groupId: undefined,
  groupName: "",
  contacts: [blankContact()],
});

export const EditTopicDialog: React.FC<EditTopicDialogProps> = ({ topic }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  const contactForm = useForm<ContactsFormValues>({
    resolver: zodResolver(contactsFormSchema),
    defaultValues: {
      groups: [],
    },
  });

  const { fields: groupFields, append: appendGroup, remove: removeGroup } = useFieldArray({
    control: contactForm.control,
    name: "groups",
  });

  const { data: groupsData, isLoading, isError } = useQuery<AdminGroup[]>({
    queryKey: ["adminTopicDetails", topic.id],
    queryFn: async () => {
      const groups = await getGroupsByTopicId(topic.id);
      const groupsWithContacts = await Promise.all(
        groups.map(async (group) => {
          const contacts = await getContactsByGroupId(group.id);
          const contactsWithTemplates = await Promise.all(
            contacts.map(async (contact) => {
              const templates = await getEmailTemplatesByContactId(contact.id);
              return { ...contact, emailTemplates: templates };
            }),
          );
          return { ...group, contacts: contactsWithTemplates };
        }),
      );
      return groupsWithContacts;
    },
    enabled: isOpen,
    refetchOnWindowFocus: false,
  });

  const normalizedGroups = useMemo<ContactsFormValues>(() => {
    if (!groupsData) {
      return { groups: [] };
    }

    const groups = groupsData.map((group) => {
      const contactIdToIndex = new Map(group.contacts.map((contact, index) => [contact.id, index]));
      const contacts = group.contacts.length
        ? group.contacts.map((contact) => ({
            contactId: contact.id,
            contactName: contact.name,
            contactEmoji: contact.emoji ?? "",
            templateSourceContactIndex: (() => {
              if (!contact.emailTemplates.length) return undefined;
              const ownerIds = new Set(
                contact.emailTemplates
                  .map((template) => template.contact_id)
                  .filter((id): id is string => Boolean(id)),
              );
              if (ownerIds.size !== 1) return undefined;
              const [ownerId] = Array.from(ownerIds);
              if (!ownerId || ownerId === contact.id) return undefined;
              const sourceIndex = contactIdToIndex.get(ownerId);
              return typeof sourceIndex === "number" ? sourceIndex : undefined;
            })(),
            contactEmail: (() => {
              if (contact.cc_emails?.length) {
                return joinEmailList(contact.email, contact.cc_emails);
              }
              const parsedEmails = parseEmailList(contact.email);
              const primaryEmail = parsedEmails[0] ?? contact.email;
              const ccEmails = buildCcEmails(parsedEmails, primaryEmail);
              return joinEmailList(primaryEmail, ccEmails);
            })(),
            contactPrimaryEmail: (() => {
              if (contact.cc_emails?.length) {
                return contact.email;
              }
              const parsedEmails = parseEmailList(contact.email);
              return parsedEmails[0] ?? contact.email;
            })(),
            contactLanguages: contact.languages?.length ? contact.languages : ["en"],
            emailTemplates: contact.emailTemplates.length
              ? contact.emailTemplates.map((template) => ({
                  templateId: template.id,
                  emailLanguage: template.language,
                  emailSubject: template.subject,
                  emailBody: template.body,
                }))
              : [blankEmailTemplate()],
          }))
        : [blankContact()];

      return {
        groupId: group.id,
        groupName: group.name,
        contacts,
      };
    });

    return { groups };
  }, [groupsData]);

  useEffect(() => {
    if (!isOpen || !groupsData) return;
    contactForm.reset(normalizedGroups);
  }, [contactForm, groupsData, isOpen, normalizedGroups]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      contactForm.reset({ groups: [] });
    }
  };

  const handleSave = async (values: ContactsFormValues) => {
    setIsSaving(true);
    try {
      for (const groupEntry of values.groups) {
        let groupId = groupEntry.groupId;

        if (groupId) {
          await updateGroup(groupId, { name: groupEntry.groupName });
        } else {
          const createdGroup = await createGroup({
            topic_id: topic.id,
            name: groupEntry.groupName,
            description: "",
          });
          groupId = createdGroup.id;
        }

        const templateIdsByContactIndex = new Map<number, string[]>();

        for (let contactIndex = 0; contactIndex < groupEntry.contacts.length; contactIndex += 1) {
          const contactEntry = groupEntry.contacts[contactIndex];
          const emails = parseEmailList(contactEntry.contactEmail);
          const primaryEmail = selectPrimaryEmail(emails, contactEntry.contactPrimaryEmail);
          const ccEmails = buildCcEmails(emails, primaryEmail);

          let contactId = contactEntry.contactId;
          const contactPayload = {
            name: contactEntry.contactName,
            emoji: contactEntry.contactEmoji || "👤",
            email: primaryEmail,
            cc_emails: ccEmails,
            languages: contactEntry.contactLanguages,
          };

          if (contactId) {
            await updateContact(contactId, contactPayload);
          } else {
            const createdContact = await createContact({
              group_id: groupId,
              organization: null,
              location: null,
              ...contactPayload,
            });
            contactId = createdContact.id;
          }

          const createOrUpdateTemplates = async (): Promise<string[]> => {
            const templateIds: string[] = [];
            for (const templateEntry of contactEntry.emailTemplates) {
              const templatePayload = {
                language: templateEntry.emailLanguage,
                subject: templateEntry.emailSubject,
                body: templateEntry.emailBody,
              };

              if (templateEntry.templateId) {
                await updateEmailTemplate(templateEntry.templateId, templatePayload);
                templateIds.push(templateEntry.templateId);
              } else {
                const createdTemplate = await createEmailTemplate({
                  contact_id: contactId,
                  ...templatePayload,
                });
                templateIds.push(createdTemplate.id);
              }
            }
            return templateIds;
          };

          const sourceIndex = contactEntry.templateSourceContactIndex;
          if (
            typeof sourceIndex === "number" &&
            Number.isInteger(sourceIndex) &&
            sourceIndex >= 0 &&
            sourceIndex < contactIndex
          ) {
            const sourceTemplateIds = templateIdsByContactIndex.get(sourceIndex) ?? [];
            if (sourceTemplateIds.length > 0) {
              await setContactEmailTemplates(contactId, sourceTemplateIds);
              templateIdsByContactIndex.set(contactIndex, sourceTemplateIds);
            } else {
              const createdTemplateIds = await createOrUpdateTemplates();
              await setContactEmailTemplates(contactId, createdTemplateIds);
              templateIdsByContactIndex.set(contactIndex, createdTemplateIds);
            }
          } else {
            const createdTemplateIds = await createOrUpdateTemplates();
            await setContactEmailTemplates(contactId, createdTemplateIds);
            templateIdsByContactIndex.set(contactIndex, createdTemplateIds);
          }
        }
      }

      showSuccess("Topic contacts updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["groups", topic.id] });
      queryClient.invalidateQueries({ queryKey: ["contactsByGroups"] });
      queryClient.invalidateQueries({ queryKey: ["emailTemplates"] });
      queryClient.invalidateQueries({ queryKey: ["adminTopicDetails", topic.id] });
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to update topic contacts:", error);
      showError("Failed to update topic contacts. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-lg">
          Edit Groups & Emails
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[860px] rounded-xl p-6 bg-card text-card-foreground overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">
            Edit {topic.name}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Update groups, contacts, and email templates or add new entries.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="grid gap-3 py-4">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="rounded-lg border border-border p-4">
                <Skeleton className="h-5 w-40 mb-2 rounded-md" />
                <Skeleton className="h-4 w-28 rounded-md" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            Failed to load groups and contacts. Please check your Supabase connection and schema.
          </div>
        ) : (
          <>
            <Separator className="my-4 bg-border rounded-full" />
            <Form {...contactForm}>
              <form onSubmit={contactForm.handleSubmit(handleSave)} className="grid gap-4">
                {groupFields.length === 0 && (
                  <div className="rounded-lg border border-border bg-secondary/10 p-4 text-sm text-muted-foreground">
                    No groups found for this topic yet. Add your first group below.
                  </div>
                )}
                {groupFields.map((groupField, groupIndex) => {
                  const groupName = contactForm.watch(`groups.${groupIndex}.groupName`);
                  const groupId = contactForm.watch(`groups.${groupIndex}.groupId`);
                  const canRemoveGroup = groupFields.length > 1 && !groupId;

                  return (
                    <Collapsible key={groupField.id} defaultOpen={groupIndex === 0} className="relative border border-border rounded-xl p-6 mb-6 bg-secondary/10">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between cursor-pointer py-2 -mx-2 px-2 rounded-md hover:bg-secondary/20 transition-colors">
                          <h3 className="text-xl font-bold text-foreground">
                            Group #{groupIndex + 1}: {groupName || "New Group"}
                          </h3>
                          <div className="flex items-center gap-2">
                            {canRemoveGroup && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  removeGroup(groupIndex);
                                }}
                                className="text-destructive hover:bg-destructive/10 rounded-full h-8 w-8"
                              >
                                <XCircle className="h-5 w-5" />
                                <span className="sr-only">Remove Group</span>
                              </Button>
                            )}
                            <ChevronDown className="h-5 w-5 transition-transform rotate-0" />
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="grid gap-4 pt-4">
                        <h4 className="text-lg font-semibold text-foreground mt-2 mb-2">Group Details</h4>
                        <div className="grid gap-2">
                          <label className="text-sm font-medium text-foreground">Group Name</label>
                          <Input
                            className="rounded-lg border-border bg-input text-foreground"
                            {...contactForm.register(`groups.${groupIndex}.groupName`)}
                            placeholder="Government Officials"
                          />
                          {contactForm.formState.errors.groups?.[groupIndex]?.groupName && (
                            <p className="text-xs text-destructive">
                              {contactForm.formState.errors.groups?.[groupIndex]?.groupName?.message}
                            </p>
                          )}
                        </div>

                        <Separator className="my-6 bg-border rounded-full" />

                        <h4 className="text-lg font-semibold text-foreground mb-2">Contacts in this Group</h4>
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
                                  if (typeof sourceIndex !== "number") {
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
                              allowRemoveExisting={false}
                              enableTemplateReuse
                            />
                          ))}
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const currentContacts = contactForm.getValues(`groups.${groupIndex}.contacts`);
                            contactForm.setValue(`groups.${groupIndex}.contacts`, [...currentContacts, blankContact()]);
                          }}
                          className="w-full rounded-lg border-primary text-primary hover:bg-primary/10 dark:hover:bg-primary/20 text-base py-3 mt-4"
                        >
                          <Plus className="mr-2 h-4 w-4" /> Add Another Contact to this Group
                        </Button>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => appendGroup(blankGroup())}
                  className="w-full rounded-lg border-accent text-accent hover:bg-accent/10 dark:hover:bg-accent/20 text-base py-3 mt-4"
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Another Group
                </Button>

                <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                    className="w-full sm:w-auto rounded-lg border-secondary text-secondary-foreground hover:bg-secondary/80 text-base py-3"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="w-full sm:w-auto rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-base py-3"
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                    <Save className="ml-2 h-4 w-4" />
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
