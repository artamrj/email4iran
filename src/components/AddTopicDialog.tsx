"use client";

import React, { useState } from 'react';
import { useForm, useFieldArray, useFormContext, Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, ChevronLeft, CheckCircle2, XCircle } from 'lucide-react';

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
const contactSchema = z.object({
  contactName: z.string().min(1, { message: "Contact name is required." }),
  contactOrganization: z.string().optional(),
  contactLocation: z.string().optional(),
  contactEmoji: z.string().optional(),
  contactEmail: z.string().email({ message: "Invalid email address." }),
  contactLanguages: z.array(z.string()).min(1, { message: "At least one language is required." }),
  emailLanguage: z.string().min(1, { message: "Email template language is required." }),
  emailSubject: z.string().min(1, { message: "Email subject is required." }),
  emailBody: z.string().min(1, { message: "Email body is required." }),
});

const groupEntrySchema = z.object({
  groupName: z.string().min(1, { message: "Group name is required." }),
  groupDescription: z.string().optional(),
  contacts: z.array(contactSchema).min(1, { message: "At least one contact is required per group." }),
});

const contactsFormSchema = z.object({
  groups: z.array(groupEntrySchema).min(1, { message: "At least one group is required." }),
});

export const AddTopicDialog: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [tempTopicData, setTempTopicData] = useState<Omit<Topic, 'id'> | null>(null); // Store topic data temporarily
  const queryClient = useQueryClient();

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
        groupDescription: '',
        contacts: [{
          contactName: '',
          contactOrganization: '',
          contactLocation: '',
          contactEmoji: '',
          contactEmail: '',
          contactLanguages: ['en'],
          emailLanguage: 'en',
          emailSubject: '',
          emailBody: '',
        }],
      }],
    },
  });

  const { fields: groupFields, append: appendGroup, remove: removeGroup } = useFieldArray({
    control: contactForm.control,
    name: "groups",
  });

  const handleTopicSubmit = async (values: z.infer<typeof topicFormSchema>) => {
    setTempTopicData(values); // Store topic data
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
          topic_id: newTopicId, // Link to the newly created topic
          name: groupEntry.groupName,
          description: groupEntry.groupDescription,
        };
        const createdGroup = await createGroup(groupData);

        for (const contactEntry of groupEntry.contacts) {
          // Create Contact
          const contactData: Omit<Contact, 'id'> = {
            group_id: createdGroup.id,
            name: contactEntry.contactName,
            organization: contactEntry.contactOrganization || null,
            location: contactEntry.contactLocation || null,
            emoji: contactEntry.contactEmoji || '👤',
            email: contactEntry.contactEmail,
            languages: contactEntry.contactLanguages,
          };
          const createdContact = await createContact(contactData);

          // Create Email Template
          const emailTemplateData: Omit<EmailTemplate, 'id'> = {
            contact_id: createdContact.id,
            language: contactEntry.emailLanguage,
            subject: contactEntry.emailSubject,
            body: contactEntry.emailBody,
          };
          await createEmailTemplate(emailTemplateData);
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
      setTempTopicData(null); // Clear temporary data
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
      setTempTopicData(null); // Clear temporary data on close
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-50 rounded-full w-12 h-12 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-all duration-300 ease-in-out flex items-center justify-center"
        size="icon"
      >
        <Plus className="h-6 w-6" />
        <span className="sr-only">Add New Topic</span>
      </Button>
      <DialogContent className="sm:max-w-[700px] rounded-xl p-6 bg-card text-card-foreground overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">
            {step === 1 ? 'Create New Topic' : 'Add Contact Details'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {step === 1
              ? 'Fill in the details for your new advocacy topic.'
              : 'Now, add groups, key contacts, and email templates for this topic.'}
          </DialogDescription>
        </DialogHeader>

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
                <div key={groupField.id} className="relative border border-border rounded-xl p-6 mb-6 bg-secondary/10">
                  <h3 className="text-xl font-bold text-foreground mb-4">Group #{groupIndex + 1}</h3>
                  {groupFields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeGroup(groupIndex)}
                      className="absolute top-4 right-4 text-destructive hover:bg-destructive/10 rounded-full"
                    >
                      <XCircle className="h-5 w-5" />
                      <span className="sr-only">Remove Group</span>
                    </Button>
                  )}

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
                  <FormField
                    control={contactForm.control}
                    name={`groups.${groupIndex}.groupDescription`}
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel className="text-sm font-medium text-foreground">Group Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Officials responsible for policy making..." rows={2} className="rounded-lg border-border bg-input text-foreground" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Separator className="my-6 bg-border rounded-full" />

                  {/* Inner useFieldArray for contacts within this group */}
                  <ContactsFieldArray groupIndex={groupIndex} control={contactForm.control} languages={languages} />

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const currentContacts = contactForm.getValues(`groups.${groupIndex}.contacts`);
                      contactForm.setValue(`groups.${groupIndex}.contacts`, [
                        ...currentContacts,
                        {
                          contactName: '',
                          contactOrganization: '',
                          contactLocation: '',
                          contactEmoji: '',
                          contactEmail: '',
                          contactLanguages: ['en'],
                          emailLanguage: 'en',
                          emailSubject: '',
                          emailBody: '',
                        }
                      ]);
                    }}
                    className="w-full rounded-lg border-primary text-primary hover:bg-primary/10 dark:hover:bg-primary/20 text-base py-3 mt-4"
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add Another Contact to this Group
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={() => appendGroup({
                  groupName: '',
                  groupDescription: '',
                  contacts: [{
                    contactName: '',
                    contactOrganization: '',
                    contactLocation: '',
                    contactEmoji: '',
                    contactEmail: '',
                    contactLanguages: ['en'],
                    emailLanguage: 'en',
                    emailSubject: '',
                    emailBody: '',
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
      </DialogContent>
    </Dialog>
  );
};

const ContactsFieldArray: React.FC<{ groupIndex: number; control: Control<z.infer<typeof contactsFormSchema>>; languages: { value: string; label: string }[] }> = ({ groupIndex, control, languages }) => {
  const { fields: contactFields, remove: removeContact } = useFieldArray({
    control,
    name: `groups.${groupIndex}.contacts`,
  });

  return (
    <div className="grid gap-4">
      {contactFields.map((contactField, contactIndex) => (
        <div key={contactField.id} className="relative border border-border rounded-lg p-4 bg-card/50">
          <h4 className="text-lg font-semibold text-foreground mb-4">Contact #{contactIndex + 1}</h4>
          {contactFields.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeContact(contactIndex)}
              className="absolute top-2 right-2 text-destructive hover:bg-destructive/10 rounded-full"
            >
              <XCircle className="h-4 w-4" />
              <span className="sr-only">Remove Contact</span>
            </Button>
          )}

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
            <FormField
              control={control}
              name={`groups.${groupIndex}.contacts.${contactIndex}.contactOrganization`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground">Organization (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ministry of Justice" className="rounded-lg border-border bg-input text-foreground" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <FormField
              control={control}
              name={`groups.${groupIndex}.contacts.${contactIndex}.contactLocation`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground">Location (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Tehran, Iran" className="rounded-lg border-border bg-input text-foreground" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
          <FormField
            control={control}
            name={`groups.${groupIndex}.contacts.${contactIndex}.contactEmail`}
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel className="text-sm font-medium text-foreground">Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="contact@example.com" className="rounded-lg border-border bg-input text-foreground" {...field} />
                </FormControl>
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

          {/* Email Template Details */}
          <h5 className="text-md font-semibold text-foreground mt-4 mb-2">Email Template</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <FormField
              control={control}
              name={`groups.${groupIndex}.contacts.${contactIndex}.emailLanguage`}
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
              name={`groups.${groupIndex}.contacts.${contactIndex}.emailSubject`}
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
            name={`groups.${groupIndex}.contacts.${contactIndex}.emailBody`}
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
        </div>
      ))}
    </div>
  );
};