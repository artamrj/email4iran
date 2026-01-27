import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  getTopicBySlug,
  getGroupsByTopicId,
  getContactsByGroupId,
  getEmailTemplatesByContactId,
} from '@/services/supabaseService';
import { Topic, Group, Contact, EmailTemplate } from '@/types/supabase';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Mail, Copy, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { showSuccess, showError } from '@/utils/toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { MadeWithDyad } from "@/components/made-with-dyad";

interface Personalization {
  name: string;
  city: string;
  country: string;
  alwaysUseEnglish: boolean;
}

const replacePlaceholders = (text: string, personalization: Personalization) => {
  let result = text;
  result = result.replace(/{{name}}/g, personalization.name || '').trim();
  result = result.replace(/{{city}}/g, personalization.city || '').trim();
  result = result.replace(/{{country}}/g, personalization.country || '').trim();

  // Clean up empty lines left by removed placeholders
  result = result.split('\n').filter(line => line.trim() !== '').join('\n');

  return result;
};

const getEmailBody = (
  templates: EmailTemplate[],
  personalization: Personalization,
  contactLanguages: string[]
) => {
  let template: EmailTemplate | undefined;

  if (personalization.alwaysUseEnglish) {
    template = templates.find(t => t.language === 'en');
  } else {
    // Try to find a local template matching contact's languages
    template = templates.find(t => contactLanguages.includes(t.language) && t.language !== 'en');
    if (!template) {
      // Fallback to 'local' if no specific language match
      template = templates.find(t => t.language === 'local');
    }
    if (!template) {
      // Fallback to English if no local or specific language template found
      template = templates.find(t => t.language === 'en');
    }
  }

  if (!template) {
    return { subject: 'No template available', body: 'No email template found for this contact.' };
  }

  return {
    subject: replacePlaceholders(template.subject, personalization),
    body: replacePlaceholders(template.body, personalization),
  };
};

const ContactCard: React.FC<{ contact: Contact; personalization: Personalization }> = ({ contact, personalization }) => {
  const { data: templates, isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['emailTemplates', contact.id],
    queryFn: () => getEmailTemplatesByContactId(contact.id),
  });

  const { subject, body } = useMemo(() => {
    if (!templates) return { subject: '', body: '' };
    return getEmailBody(templates, personalization, contact.languages);
  }, [templates, personalization, contact.languages]);

  const handleSendRecommendedEmail = () => {
    if (!subject || !body) {
      showError('No email template available.');
      return;
    }
    const mailtoLink = `mailto:${contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
  };

  const handleCopyEmail = () => {
    if (!subject || !body) {
      showError('No email template available to copy.');
      return;
    }
    const emailContent = `Subject: ${subject}\n\n${body}`;
    navigator.clipboard.writeText(emailContent)
      .then(() => showSuccess('Email content copied to clipboard!'))
      .catch(() => showError('Failed to copy email content.'));
  };

  if (isLoadingTemplates) {
    return (
      <Card className="rounded-xl shadow-md border-none bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 p-4 flex flex-col justify-between h-full">
        <Skeleton className="h-6 w-3/4 mb-2 rounded-md" />
        <Skeleton className="h-4 w-1/2 mb-4 rounded-md" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </Card>
    );
  }

  return (
    <Card className="rounded-xl shadow-md border-none bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 p-4 flex flex-col justify-between h-full">
      <CardHeader className="p-0 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">{contact.emoji}</span>
          <CardTitle className="text-lg font-semibold text-foreground leading-tight truncate">
            {contact.name}
          </CardTitle>
        </div>
        <CardDescription className="text-sm text-muted-foreground truncate">
          {contact.organization && `${contact.organization}, `}
          {contact.location && `${contact.location}`}
        </CardDescription>
        <p className="text-xs text-muted-foreground mt-1 truncate">
          {contact.email}
        </p>
      </CardHeader>
      <CardContent className="p-0 flex-grow flex items-end">
        <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
          Languages: {contact.languages.join(', ').toUpperCase()}
        </div>
      </CardContent>
      <CardFooter className="p-0 pt-4 flex flex-col sm:flex-row gap-2">
        <Button
          onClick={handleSendRecommendedEmail}
          className="w-full sm:w-auto flex-grow rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm py-2 px-3"
          disabled={!subject || !body}
        >
          <Mail className="mr-2 h-4 w-4" /> Send Recommended
        </Button>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto flex-grow rounded-lg border-accent text-accent hover:bg-accent/10 dark:hover:bg-accent/20 text-sm py-2 px-3">
              <ExternalLink className="mr-2 h-4 w-4" /> Customize
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-xl p-6 bg-card text-card-foreground">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-foreground">Customize Email</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Edit the subject and body before sending.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="subject" className="text-sm font-medium text-foreground">Subject</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => { /* In a real app, you might manage this state */ }}
                  className="rounded-lg border-border bg-input text-foreground"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="body" className="text-sm font-medium text-foreground">Body</Label>
                <Textarea
                  id="body"
                  value={body}
                  onChange={(e) => { /* In a real app, you might manage this state */ }}
                  rows={10}
                  className="rounded-lg border-border bg-input text-foreground"
                />
              </div>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                onClick={() => {
                  const mailtoLink = `mailto:${contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                  window.location.href = mailtoLink;
                }}
                className="w-full sm:w-auto rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm py-2 px-3"
                disabled={!subject || !body}
              >
                <Mail className="mr-2 h-4 w-4" /> Open Email App
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCopyEmail}
                className="w-full sm:w-auto rounded-lg border-accent text-accent hover:bg-accent/10 dark:hover:bg-accent/20 text-sm py-2 px-3"
                disabled={!subject || !body}
              >
                <Copy className="mr-2 h-4 w-4" /> Copy to Clipboard
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
};

const TopicDetail = () => {
  const { topicSlug } = useParams<{ topicSlug: string }>();
  const navigate = useNavigate();

  const [personalization, setPersonalization] = useState<Personalization>({
    name: '',
    city: '',
    country: '',
    alwaysUseEnglish: false,
  });

  const { data: topic, isLoading: isLoadingTopic, isError: isErrorTopic } = useQuery<Topic | null>({
    queryKey: ['topic', topicSlug],
    queryFn: () => getTopicBySlug(topicSlug!),
    enabled: !!topicSlug,
  });

  const { data: groups, isLoading: isLoadingGroups } = useQuery<Group[]>({
    queryKey: ['groups', topic?.id],
    queryFn: () => getGroupsByTopicId(topic!.id),
    enabled: !!topic?.id,
  });

  const { data: contactsByGroup, isLoading: isLoadingContacts } = useQuery<Record<string, Contact[]>>({
    queryKey: ['contactsByGroups', groups?.map(c => c.id)],
    queryFn: async () => {
      if (!groups) return {};
      const contactsMap: Record<string, Contact[]> = {};
      for (const group of groups) {
        contactsMap[group.id] = await getContactsByGroupId(group.id);
      }
      return contactsMap;
    },
    enabled: !!groups,
  });

  useEffect(() => {
    if (!isLoadingTopic && !topic && !isErrorTopic) {
      navigate('/404');
    }
  }, [topic, isLoadingTopic, isErrorTopic, navigate]);

  const handleCopyAllEmails = async () => {
    if (!contactsByGroup || Object.keys(contactsByGroup).length === 0) {
      showError('No contacts available to copy emails from.');
      return;
    }

    const allEmails = new Set<string>();
    for (const groupId in contactsByGroup) {
      contactsByGroup[groupId].forEach(contact => {
        allEmails.add(contact.email);
      });
    }

    if (allEmails.size === 0) {
      showError('No emails found to copy.');
      return;
    }

    const emailString = Array.from(allEmails).join('; ');
    navigator.clipboard.writeText(emailString)
      .then(() => showSuccess('All unique contact emails copied to clipboard!'))
      .catch(() => showError('Failed to copy emails.'));
  };

  if (isLoadingTopic || isLoadingGroups || isLoadingContacts) {
    return (
      <div className="min-h-screen flex flex-col bg-background p-4 sm:p-8">
        <div className="container mx-auto max-w-6xl py-8">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 rounded-lg text-muted-foreground hover:bg-secondary">
            <ArrowLeft className="mr-2 h-5 w-5" /> Back
          </Button>
          <Skeleton className="h-12 w-3/4 mb-2 rounded-lg" />
          <Skeleton className="h-6 w-1/2 mb-4 rounded-lg" />
          <Skeleton className="h-4 w-1/4 mb-8 rounded-lg" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Skeleton className="h-48 w-full rounded-xl mb-8" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
            <div className="lg:col-span-1">
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
          </div>
          <div className="mt-12">
            <Skeleton className="h-8 w-1/3 mb-6 rounded-lg" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-48 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!topic) {
    return null; // Should be handled by redirect to 404
  }

  // Set SEO metadata (using topic.name and topic.description)
  document.title = topic.name;
  document.querySelector('meta[name="description"]')?.setAttribute('content', topic.description);

  return (
    <div className="min-h-screen flex flex-col bg-background p-4 sm:p-8">
      <div className="container mx-auto max-w-6xl py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={() => navigate(-1)} className="rounded-lg text-muted-foreground hover:bg-secondary">
            <ArrowLeft className="mr-2 h-5 w-5" /> Back to Topics
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Topic Overview Card */}
          <Card className="lg:col-span-2 rounded-xl shadow-lg border-none bg-card p-6">
            <CardHeader className="p-0 pb-4">
              <div className="flex items-center gap-3 mb-2">
                {topic.emoji && <span className="text-5xl sm:text-6xl leading-none">{topic.emoji}</span>}
                <CardTitle className="text-4xl sm:text-5xl font-extrabold text-foreground leading-tight">
                  {topic.name}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0 prose dark:prose-invert max-w-none text-foreground mt-4">
              <MarkdownRenderer content={topic.description} />
            </CardContent>
          </Card>

          {/* Personalization Panel */}
          <Card className="lg:col-span-1 rounded-xl shadow-lg border-none bg-card p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-2xl font-bold text-foreground">Personalize Your Message</CardTitle>
            </CardHeader>
            <CardContent className="p-0 grid gap-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium text-foreground">Your Name</Label>
                <Input
                  id="name"
                  value={personalization.name}
                  onChange={(e) => setPersonalization({ ...personalization, name: e.target.value })}
                  placeholder="John Doe"
                  className="rounded-lg border-border bg-input text-foreground"
                />
              </div>
              <div>
                <Label htmlFor="city" className="text-sm font-medium text-foreground">Your City (Optional)</Label>
                <Input
                  id="city"
                  value={personalization.city}
                  onChange={(e) => setPersonalization({ ...personalization, city: e.target.value })}
                  placeholder="New York"
                  className="rounded-lg border-border bg-input text-foreground"
                />
              </div>
              <div>
                <Label htmlFor="country" className="text-sm font-medium text-foreground">Your Country (Optional)</Label>
                <Input
                  id="country"
                  value={personalization.country}
                  onChange={(e) => setPersonalization({ ...personalization, country: e.target.value })}
                  placeholder="USA"
                  className="rounded-lg border-border bg-input text-foreground"
                />
              </div>
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="always-english" className="text-sm font-medium text-foreground">Always use English</Label>
                <Switch
                  id="always-english"
                  checked={personalization.alwaysUseEnglish}
                  onCheckedChange={(checked) => setPersonalization({ ...personalization, alwaysUseEnglish: checked })}
                  className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-secondary"
                />
              </div>
              <Button
                onClick={handleCopyAllEmails}
                className="w-full rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-base py-3 mt-4"
              >
                <Copy className="mr-2 h-5 w-5" /> Copy All Emails
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Your personalization details are used to customize email templates and are not stored.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Groups & Contacts */}
        <div className="mt-12">
          <h2 className="text-3xl font-bold text-foreground mb-6">Key Contacts</h2>
          {groups?.map((group) => (
            <div key={group.id} className="mb-10">
              <h3 className="text-2xl font-semibold text-primary mb-4">
                {group.name}
              </h3>
              <p className="text-foreground mb-6">{group.description}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {contactsByGroup?.[group.id]?.map((contact) => (
                  <ContactCard key={contact.id} contact={contact} personalization={personalization} />
                ))}
              </div>
              <Separator className="my-8 bg-border rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full py-6 text-center text-muted-foreground text-sm mt-auto">
        <p>&copy; {new Date().getFullYear()} Advocacy Campaign App. All rights reserved.</p>
        <MadeWithDyad />
      </footer>
    </div>
  );
};

export default TopicDetail;