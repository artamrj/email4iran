"use client";

import React, { useState } from 'react';
import { useForm, useFieldArray, useFormContext, Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, ChevronLeft, CheckCircle2, XCircle, ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Form,
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
import { showSuccess, showError } from '@/utils/toast';
import { createTopic, createGroup, createContact, createEmailTemplate } from '@/services/supabaseService';
import { Topic, Group, Contact, EmailTemplate } from '@/types/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { ContactForm } from './ContactForm';
import { PasswordPrompt } from './PasswordPrompt';

// --- Language List ---
const languages = [
  { value: 'sq', label: 'Albanian' },
  { value: 'ar', label: 'Arabic' },
  { value: 'be', label: 'Belarusian' },
  { value: 'bn', label: 'Bengali' },
  { value: 'bs', label: 'Bosnian' },
  { value: 'bg', label: 'Bulgarian' },
  { value: 'ca', label: 'Catalan' },
  { value: 'zh', label: 'Chinese (Mandarin)' },
  { value: 'hr', label: 'Croatian' },
  { value: 'cs', label: 'Czech' },
  { value: 'da', label: 'Danish' },
  { value: 'nl', label: 'Dutch' },
  { value: 'en', label: 'English' },
  { value: 'et', label: 'Estonian' },
  { value: 'fa', label: 'Farsi' },
  { value: 'fi', label: 'Finnish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'el', label: 'Greek' },
  { value: 'hi', label: 'Hindi' },
  { value: 'hu', label: 'Hungarian' },
  { value: 'is', label: 'Icelandic' },
  { value: 'ga', label: 'Irish' },
  { value: 'it', label: 'Italian' },
  { value: 'lv', label: 'Latvian' },
  { value: 'lt', label: 'Lithuanian' },
  { value: 'mk', label: 'Macedonian' },
  { value: 'mt', label: 'Maltese' },
  { value: 'no', label: 'Norwegian' },
  { value: 'pl', label: 'Polish' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ro', label: 'Romanian' },
  { value: 'ru', label: 'Russian' },
  { value: 'sr', label: 'Serbian' },
  { value: 'sk', label: 'Slovak' },
  { value: 'sl', label: 'Slovenian' },
  { value: 'es', label: 'Spanish' },
  { value: 'sv', label: 'Swedish' },
  { value: 'tr', label: 'Turkish' },
  { value: 'uk', label: 'Ukrainian' },
  { value: 'ur', label: 'Urdu' },
  { value: 'cy', label: 'Welsh' },
  { value: 'local', label: 'Local (dynamic)' },
].sort((a, b) => a.label.localeCompare(b.label));

// --- Step 1: Topic Schema ---
const topicFormSchema = z.object({
  slug: z.string().min(1, { message: "Slug is required." }).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "Slug must be lowercase, alphanumeric, and use hyphens for spaces.",
  }),
  name: z.string().min(1, { message: "Topic name is required." }),
  description: z.string().min(1, { message: "Description is required." }),
  emoji: z.string().optional(),
});

// --- Step 2: Nested Schemas ---
const emailTemplateSchema = z.object({
  emailLanguage: z.string().min(1, { message: "Email template language is required." }),
  emailSubject: z.string().min(1, { message: "Email subject is required." }),
  emailBody: z.string().min(1, { message: "Email body is required." }),
});

const contactSchema = z.object({
  contactName: z.string().min(1, { message: "Contact name is required." }),
  // contactOrganization: z.string().optional(), // Removed for simplification
  // contactLocation: z.string().optional(), // Removed for simplification
  contactEmoji: z.string().optional(),
  contactEmail: z.string().min(1, { message: "Email is required." }).refine(
    (val) => {
      const emails = val.split(',').map(email => email.trim()).filter(Boolean);
      if (emails.length === 0) return false; // Must have at least one email
      return emails.every(email => z.string().email().safeParse(email).success);
    },
    { message: "Invalid email format. Please enter one or more valid email addresses, separated by commas." }
  ),
  contactLanguages: z.array(z.string()).min(1, { message: "At least one language is required." }),
  emailTemplates: z.array(emailTemplateSchema).min(1, { message: "At least one email template is required." }),
});

const groupEntrySchema = z.object({
  groupName: z.string().min(1, { message: "Group name is required." }),
  // groupDescription: z.string().optional(), // Removed for simplification
  contacts: z.array(contactSchema).min(1, { message: "At least one contact is required per group." }),
});

const contactsFormSchema = z.object({
  groups: z.array(groupEntrySchema).min(1, { message: "At least one group is required." }),
});

export const AddTopicDialog: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [tempTopicData, setTempTopicData] = useState<Omit<Topic, 'id'> | null>(null);
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const queryClient = useQueryClient();

  const hasPasswordConfigured = !!import.meta.env.VITE_ADD_TOPIC_PASSWORD;

  const topicForm = useForm<z.infer<typeof topicFormSchema>>({
    resolver: zodResolver(topicFormSchema),
    defaultValues: {
      slug: '',
      name: '',
      description: '',
      emoji: '',
    },
  });

  const contactForm = useForm<z.infer<typeof contactsFormSchema>>({
    resolver: zodResolver(contactsFormSchema),
    defaultValues: {
      groups: [{
        groupName: '',
        contacts: [{
          contactName: '',
          contactEmoji: '',
          contactEmail: '',
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

  const handleTopicSubmit = async (values: z.infer<typeof topicFormSchema>) => {
    setTempTopicData(values);
    showSuccess('Topic details saved! Now add contacts.');
    setStep(2);
  };

  const handleContactsSubmit = async (values: z.infer<typeof contactsFormSchema>) => {
    if (!tempTopicData) {
      showError('Topic details are missing. Please go back to Step 1.');
      return;
    }

    try {
      // First, create the topic in the database
      const createdTopic = await createTopic(tempTopicData);
      const newTopicId = createdTopic.id;

      for (const groupEntry of values.groups) {
        // Create Group
        const groupData: Omit<Group, 'id'> = {
          topic_id: newTopicId,
          name: groupEntry.groupName,
          // description: groupEntry.groupDescription,
        };
        const createdGroup = await createGroup(groupData);

        for (const contactEntry of groupEntry.contacts) {
          // Create Contact
          const contactData: Omit<Contact, 'id'> = {
            group_id: createdGroup.id,
            name: contactEntry.contactName,
            organization: null,
            location: null,
            emoji: contactEntry.contactEmoji || '👤',
            email: contactEntry.contactEmail,
            languages: contactEntry.contactLanguages,
          };
          const createdContact = await createContact(contactData);

          // Create Email Templates for this contact
          for (const templateEntry of contactEntry.emailTemplates) {
            const emailTemplateData: Omit<EmailTemplate, 'id'> = {
              contact_id: createdContact.id,
              language: templateEntry.emailLanguage,
              subject: templateEntry.emailSubject,
              body: templateEntry.emailBody,
            };
            await createEmailTemplate(emailTemplateData);
          }
        }
      }

      showSuccess('Topic, groups, contacts, and email templates added successfully!');
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['contactsByGroups'] });
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
      setIsOpen(false);
      setStep(1);
      topicForm.reset();
      contactForm.reset();
      setTempTopicData(null);
    } catch (error) {
      console.error('Error adding all details:', error);
      showError('Failed to add all details. Please try again.');
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setStep(1);
      topicForm.reset();
      contactForm.reset();
      setTempTopicData(null);
      setIsPasswordVerified(false);
    }
  };

  const handlePasswordSuccess = () => {
    setIsPasswordVerified(true);
    setStep(1);
  };

  const handlePasswordCancel = () => {
    setIsOpen(false);
    setIsPasswordVerified(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Button
            onClick={() => setIsOpen(true)}
            variant="ghost"
            className="rounded-full px-4 py-2 text-foreground hover:bg-secondary transition-colors duration-300 ease-in-out flex items-center gap-2"
            disabled={!hasPasswordConfigured}
          >
            <Plus className="h-5 w-5" />
            <span>Add New Topic</span>
          </Button>
        </TooltipTrigger>
        {!hasPasswordConfigured && (
          <TooltipContent className="rounded-lg bg-card text-card-foreground border-border shadow-md">
            <p>Please set `VITE_ADD_TOPIC_PASSWORD` in your .env file to enable this feature.</p>
          </TooltipContent>
        )}
      </Tooltip>
      <DialogContent className="sm:max-w-[700px] rounded-xl p-6 bg-card text-card-foreground overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">
            {!isPasswordVerified ? 'Enter Password' : (step === 1 ? 'Create New Topic' : 'Add Contact Details')}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {!isPasswordVerified
              ? 'A password is required to add new topics.'
              : (step === 1
                ? 'Fill in the details for your new advocacy topic.'
                : 'Now, add groups, key contacts, and email templates for this topic.')}
          </DialogDescription>
        </DialogHeader>

        {!isPasswordVerified ? (
          <PasswordPrompt onSuccess={handlePasswordSuccess} onCancel={handlePasswordCancel} />
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
                        <FormLabel className="text-sm font-medium text-foreground">Topic Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Human Rights Advocacy" className="rounded-lg border-border bg-input text-foreground" {...field} />
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
                        <FormLabel className="text-sm font-medium text-foreground">Slug (URL-friendly)</FormLabel>
                        <FormControl>
                          <Input placeholder="human-rights-advocacy" className="rounded-lg border-border bg-input text-foreground" {...field} />
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
                        <FormLabel className="text-sm font-medium text-foreground">Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="A brief overview of the topic..." rows={4} className="rounded-lg border-border bg-input text-foreground" {...field} />
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
                        <FormLabel className="text-sm font-medium text-foreground">Emoji (e.g., ✊)</FormLabel>
                        <FormControl>
                          <Input placeholder="✊" className="rounded-lg border-border bg-input text-foreground" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter className="pt-4">
                    <Button type="submit" className="w-full rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-base py-3">
                      Next: Add Contacts <CheckCircle2 className="ml-2 h-4 w-4" />
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
                            Group #{groupIndex + 1}: {contactForm.watch(`groups.${groupIndex}.groupName`) || 'New Group'}
                          </h3>
                          <div className="flex items-center gap-2">
                            {groupFields.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeGroup(groupIndex);
                                }}
                                className="text-destructive hover:bg-destructive/10 rounded-full h-8 w-8"
                              >
                                <XCircle className="h-5 w-5" />
                                <span className="sr-only">Remove Group</span>
                              </Button>
                            )}
                            <ChevronDown className={cn("h-5 w-5 transition-transform", contactForm.watch(`groups.${groupIndex}.isOpen`) ? "rotate-180" : "rotate-0")} />
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="grid gap-4 pt-4">
                        {/* Group Details */}
                        <h4 className="text-lg font-semibold text-foreground mt-2 mb-2">Group Details</h4>
                        <FormField
                          control={contactForm.control}
                          name={`groups.${groupIndex}.groupName`}
                          render={({ field }) => (
                            <FormItem className="mb-2">
                              <FormLabel className="text-sm font-medium text-foreground">Group Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Government Officials" className="rounded-lg border-border bg-input text-foreground" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {/* Removed groupDescription field */}
                        <Separator className="my-6 bg-border rounded-full" />

                        {/* Contacts Field Array */}
                        <h4 className="text-lg font-semibold text-foreground mb-2">Contacts in this Group</h4>
                        <div className="grid gap-4">
                          {contactForm.watch(`groups.${groupIndex}.contacts`)?.map((contactField, contactIndex) => (
                            <ContactForm
                              key={contactField.id}
                              groupIndex={groupIndex}
                              contactIndex={contactIndex}
                              languages={languages}
                              removeContact={() => contactForm.setValue(`groups.${groupIndex}.contacts`, contactForm.getValues(`groups.${groupIndex}.contacts`).filter((_, i) => i !== contactIndex))}
                              totalContacts={contactForm.getValues(`groups.${groupIndex}.contacts`).length}
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
                                // contactOrganization: '',
                                // contactLocation: '',
                                contactEmoji: '',
                                contactEmail: '',
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
                          <Plus className="mr-2 h-4 w-4" /> Add Another Contact to this Group
                        </Button>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => appendGroup({
                      groupName: '',
                      // groupDescription: '',
                      contacts: [{
                        contactName: '',
                        // contactOrganization: '',
                        // contactLocation: '',
                        contactEmoji: '',
                        contactEmail: '',
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
                    <Plus className="mr-2 h-4 w-4" /> Add Another Group
                  </Button>

                  <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="w-full sm:w-auto rounded-lg border-secondary text-secondary-foreground hover:bg-secondary/80 text-base py-3"
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button type="submit" className="w-full sm:w-auto rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-base py-3">
                      Add All Details <CheckCircle2 className="ml-2 h-4 w-4" />
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