"use client";

import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form'; // Import useFieldArray
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, ChevronLeft, CheckCircle2, XCircle } from 'lucide-react'; // Added XCircle for remove button

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
import { Separator } from '@/components/ui/separator'; // Added Separator

// --- Step 1: Topic Schema ---
const topicFormSchema = z.object({
  slug: z.string().min(1, { message: "Slug is required." }).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "Slug must be lowercase, alphanumeric, and use hyphens for spaces.",
  }),
  name: z.string().min(1, { message: "Topic name is required." }),
  description: z.string().min(1, { message: "Description is required." }),
  emoji: z.string().optional(),
  // Removed default_language
});

// --- Step 2: Group, Contact, Email Template Schema for a single entry ---
const contactEntrySchema = z.object({
  groupName: z.string().min(1, { message: "Group name is required." }),
  groupDescription: z.string().optional(),
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

// Schema for the entire Step 2 form, containing an array of contact entries
const contactsFormSchema = z.object({
  contacts: z.array(contactEntrySchema).min(1, { message: "At least one contact is required." }),
});

export const AddTopicDialog: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [newTopicId, setNewTopicId] = useState<string | null>(null);
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
      contacts: [{
        groupName: '',
        groupDescription: '',
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
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: contactForm.control,
    name: "contacts",
  });

  const handleTopicSubmit = async (values: z.infer<typeof topicFormSchema>) => {
    try {
      const createdTopic = await createTopic(values);
      setNewTopicId(createdTopic.id);
      showSuccess('Topic created successfully! Now add contacts.');
      setStep(2);
    } catch (error) {
      console.error('Error creating topic:', error);
      showError('Failed to create topic. Please try again.');
    }
  };

  const handleContactsSubmit = async (values: z.infer<typeof contactsFormSchema>) => {
    if (!newTopicId) {
      showError('Topic ID is missing. Please go back to Step 1.');
      return;
    }

    try {
      for (const contactEntry of values.contacts) {
        // Create Group
        const groupData: Omit<Group, 'id'> = {
          topic_id: newTopicId,
          name: contactEntry.groupName,
          description: contactEntry.groupDescription,
        };
        const createdGroup = await createGroup(groupData);

        // Create Contact
        const contactData: Omit<Contact, 'id'> = {
          group_id: createdGroup.id,
          name: contactEntry.contactName,
          organization: contactEntry.contactOrganization || null,
          location: contactEntry.contactLocation || null,
          emoji: contactEntry.contactEmoji || '👤', // Default emoji if none provided
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

      showSuccess('All contacts and email templates added successfully!');
      queryClient.invalidateQueries({ queryKey: ['topics'] }); // Invalidate topics to refresh the list
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['contactsByGroups'] });
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
      setIsOpen(false);
      setStep(1);
      topicForm.reset();
      contactForm.reset();
      setNewTopicId(null);
    } catch (error) {
      console.error('Error adding group, contact, or email template:', error);
      showError('Failed to add contact details. Please try again.');
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setStep(1);
      topicForm.reset();
      contactForm.reset();
      setNewTopicId(null);
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
              {/* Removed default_language field */}
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
              {fields.map((field, index) => (
                <div key={field.id} className="relative border border-border rounded-xl p-4 mb-4 bg-secondary/10">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Contact Entry #{index + 1}</h3>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      className="absolute top-2 right-2 text-destructive hover:bg-destructive/10 rounded-full"
                    >
                      <XCircle className="h-5 w-5" />
                      <span className="sr-only">Remove Contact</span>
                    </Button>
                  )}

                  {/* Group Details */}
                  <h4 className="text-md font-semibold text-foreground mt-2 mb-2">Group Details</h4>
                  <FormField
                    control={contactForm.control}
                    name={`contacts.${index}.groupName`}
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
                    name={`contacts.${index}.groupDescription`}
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
                  <Separator className="my-4 bg-border rounded-full" />

                  {/* Contact Details */}
                  <h4 className="text-md font-semibold text-foreground mt-4 mb-2">Contact Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <FormField
                      control={contactForm.control}
                      name={`contacts.${index}.contactName`}
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
                      control={contactForm.control}
                      name={`contacts.${index}.contactOrganization`}
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
                      control={contactForm.control}
                      name={`contacts.${index}.contactLocation`}
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
                      control={contactForm.control}
                      name={`contacts.${index}.contactEmoji`}
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
                    control={contactForm.control}
                    name={`contacts.${index}.contactEmail`}
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
                    control={contactForm.control}
                    name={`contacts.${index}.contactLanguages`}
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
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="fa">Farsi</SelectItem>
                            <SelectItem value="local">Local (dynamic)</SelectItem>
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
                  <h4 className="text-md font-semibold text-foreground mt-4 mb-2">Email Template</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <FormField
                      control={contactForm.control}
                      name={`contacts.${index}.emailLanguage`}
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
                              <SelectItem value="en">English</SelectItem>
                              <SelectItem value="fa">Farsi</SelectItem>
                              <SelectItem value="local">Local (dynamic)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={contactForm.control}
                      name={`contacts.${index}.emailSubject`}
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
                    control={contactForm.control}
                    name={`contacts.${index}.emailBody`}
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

              <Button
                type="button"
                variant="outline"
                onClick={() => append({
                  groupName: '',
                  groupDescription: '',
                  contactName: '',
                  contactOrganization: '',
                  contactLocation: '',
                  contactEmoji: '',
                  contactEmail: '',
                  contactLanguages: ['en'],
                  emailLanguage: 'en',
                  emailSubject: '',
                  emailBody: '',
                })}
                className="w-full rounded-lg border-primary text-primary hover:bg-primary/10 dark:hover:bg-primary/20 text-base py-3 mt-4"
              >
                <Plus className="mr-2 h-4 w-4" /> Add Another Contact
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