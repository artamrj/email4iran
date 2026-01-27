import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  getTopicBySlug,
  getCategoriesByTopicId,
  getContactsByCategoryId,
  getEmailTemplatesByContactId,
} from '@/services/supabaseService';
import { Topic, Category, Contact, EmailTemplate } from '@/types/supabase';
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

  // This useMemo computes the *recommended* email based on personalization logic
  // This will be used for the "Customize" dialog
  const { subject: recommendedSubject, body: recommendedBody } = useMemo(() => {
    if (!templates) return { subject: '', body: '' };
    return getEmailBody(templates, personalization, contact.languages);
  }, [templates, personalization, contact.languages]);

  // This useMemo prepares all available email contents by language for the direct send buttons
  const emailContentsByLanguage = useMemo(() => {
    const contents = new Map<string, { subject: string, body: string }>();
    if (templates) {
      const uniqueLanguages = new Set(templates.map(t => t.language));
      uniqueLanguages.forEach(lang => {
        const template = templates.find(t => t.language === lang);
        if (template) {
          contents.set(lang, {
            subject: replacePlaceholders(template.subject, personalization),
            body: replacePlaceholders(template.body, personalization),
          });
        }
      });
    }
    return contents;
  }, [templates, personalization]);

  const handleCopyEmail = () => {
    if (!recommendedSubject || !recommendedBody) {
      showError('No email template available to copy.');
      return;
    }
    const emailContent = `Subject: ${recommendedSubject}\n\n${recommendedBody}`;
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
    <Card className="rounded-xl shadow-md border-none bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 p-4 flex flex-col justify-between h-full">
      <CardHeader className="p-0 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">{contact.flag}</span>
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white leading-tight">
            {contact.name}
          </CardTitle>
        </div>
        <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
          {contact.title} ({contact.country})
        </CardDescription>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          {contact.email}
        </p>
      </CardHeader>
      <CardContent className="p-0 flex-grow flex items-end">
        <div className="flex flex-wrap gap-1 text-xs text-gray-500 dark:text-gray-400">
          Languages: {contact.languages.join(', ').toUpperCase()}
        </div>
      </CardContent>
      <CardFooter className="p-0 pt-4 flex flex-col gap-2">
        {emailContentsByLanguage.size > 0 && (
          <div className="flex flex-col gap-2 p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Send in:</p>
            <div className="grid grid-cols-2 gap-2">
              {Array.from(emailContentsByLanguage.keys()).map(lang => {
                const content = emailContentsByLanguage.get(lang);
                const langDisplayName = lang === 'en' ? 'English' : (lang === 'local' ? 'Local' : lang.toUpperCase());

                return (
                  <Button
                    key={lang}
                    onClick={() => {
                      if (content?.subject && content?.body) {
                        const mailtoLink = `mailto:${contact.email}?subject=${encodeURIComponent(content.subject)}&body=${encodeURIComponent(content.body)}`;
                        window.location.href = mailtoLink;
                      } else {
                        showError(`No email template available for ${langDisplayName}.`);
                      }
                    }}
                    className="w-full rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm py-2 px-3"
                    disabled={!content?.subject || !content?.body}
                  >
                    <Mail className="mr-2 h-4 w-4" /> {langDisplayName}
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full rounded-lg border-purple-600 text-purple-600 hover:bg-purple-50 dark:border-purple-400 dark:text-purple-400 dark:hover:bg-gray-700 text-sm py-2 px-3">
              <ExternalLink className="mr-2 h-4 w-4" /> Customize
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-xl p-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">Customize Email</DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-400">
                Edit the subject and body before sending.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="subject" className="text-sm font-medium text-gray-700 dark:text-gray-300">Subject</Label>
                <Input
                  id="subject"
                  value={recommendedSubject}
                  onChange={(e) => { /* In a real app, you might manage this state */ }}
                  className="rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="body" className="text-sm font-medium text-gray-700 dark:text-gray-300">Body</Label>
                <Textarea
                  id="body"
                  value={recommendedBody}
                  onChange={(e) => { /* In a real app, you might manage this state */ }}
                  rows={10}
                  className="rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                onClick={() => {
                  const mailtoLink = `mailto:${contact.email}?subject=${encodeURIComponent(recommendedSubject)}&body=${encodeURIComponent(recommendedBody)}`;
                  window.location.href = mailtoLink;
                }}
                className="w-full sm:w-auto rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-3"
                disabled={!recommendedSubject || !recommendedBody}
              >
                <Mail className="mr-2 h-4 w-4" /> Open Email App
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCopyEmail}
                className="w-full sm:w-auto rounded-lg border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-gray-700 text-sm py-2 px-3"
                disabled={!recommendedSubject || !recommendedBody}
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

  const { data: categories, isLoading: isLoadingCategories } = useQuery<Category[]>({
    queryKey: ['categories', topic?.id],
    queryFn: () => getCategoriesByTopicId(topic!.id),
    enabled: !!topic?.id,
  });

  const { data: contactsByCategory, isLoading: isLoadingContacts } = useQuery<Record<string, Contact[]>>({
    queryKey: ['contactsByCategories', categories?.map(c => c.id)],
    queryFn: async () => {
      if (!categories) return {};
      const contactsMap: Record<string, Contact[]> = {};
      for (const category of categories) {
        contactsMap[category.id] = await getContactsByCategoryId(category.id);
      }
      return contactsMap;
    },
    enabled: !!categories,
  });

  useEffect(() => {
    if (!isLoadingTopic && !topic && !isErrorTopic) {
      navigate('/404'); // Redirect to 404 if topic not found
    }
  }, [topic, isLoadingTopic, isErrorTopic, navigate]);

  const handleCopyAllEmails = async () => {
    if (!contactsByCategory || Object.keys(contactsByCategory).length === 0) {
      showError('No contacts available to copy emails from.');
      return;
    }

    const allEmails = new Set<string>();
    for (const categoryId in contactsByCategory) {
      contactsByCategory[categoryId].forEach(contact => {
        allEmails.add(contact.email);
      });
    }

    if (allEmails.size === 0) {
      showError('No emails found to copy.');
      return;
    }

    const emailString = Array.from(allEmails).join('; '); // Using semicolon as separator
    navigator.clipboard.writeText(emailString)
      .then(() => showSuccess('All unique contact emails copied to clipboard!'))
      .catch(() => showError('Failed to copy emails.'));
  };

  if (isLoadingTopic || isLoadingCategories || isLoadingContacts) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-950 dark:to-gray-900 p-4 sm:p-8">
        <div className="container mx-auto max-w-6xl py-8">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
            <ArrowLeft className="mr-2 h-5 w-5" /> Back
          </Button>
          <Skeleton className="h-12 w-3/4 mb-2 rounded-md" />
          <Skeleton className="h-6 w-1/2 mb-4 rounded-md" />
          <Skeleton className="h-4 w-1/4 mb-8 rounded-md" />

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
            <Skeleton className="h-8 w-1/3 mb-6 rounded-md" />
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

  // Set SEO metadata
  document.title = topic.metaPageTitle || topic.title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', topic.metaPageDescription || topic.shortDescription);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-950 dark:to-gray-900 p-4 sm:p-8">
      <div className="container mx-auto max-w-6xl py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={() => navigate(-1)} className="rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
            <ArrowLeft className="mr-2 h-5 w-5" /> Back to Topics
          </Button>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white mb-2 leading-tight">
          {topic.title}
        </h1>
        <p className="text-lg sm:text-xl text-gray-700 dark:text-gray-300 mb-4">
          {topic.shortDescription}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          Last updated: {format(new Date(topic.lastUpdated), 'PPP')}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Topic Context Block */}
          <Card className="lg:col-span-2 rounded-xl shadow-lg border-none bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">Context</CardTitle>
            </CardHeader>
            <CardContent className="p-0 prose dark:prose-invert max-w-none text-gray-800 dark:text-gray-200">
              <MarkdownRenderer content={topic.longDescription} />
            </CardContent>
          </Card>

          {/* Personalization Panel */}
          <Card className="lg:col-span-1 rounded-xl shadow-lg border-none bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">Personalize Your Message</CardTitle>
            </CardHeader>
            <CardContent className="p-0 grid gap-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300">Your Name</Label>
                <Input
                  id="name"
                  value={personalization.name}
                  onChange={(e) => setPersonalization({ ...personalization, name: e.target.value })}
                  placeholder="John Doe"
                  className="rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <Label htmlFor="city" className="text-sm font-medium text-gray-700 dark:text-gray-300">Your City (Optional)</Label>
                <Input
                  id="city"
                  value={personalization.city}
                  onChange={(e) => setPersonalization({ ...personalization, city: e.target.value })}
                  placeholder="New York"
                  className="rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <Label htmlFor="country" className="text-sm font-medium text-gray-700 dark:text-gray-300">Your Country (Optional)</Label>
                <Input
                  id="country"
                  value={personalization.country}
                  onChange={(e) => setPersonalization({ ...personalization, country: e.target.value })}
                  placeholder="USA"
                  className="rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="always-english" className="text-sm font-medium text-gray-700 dark:text-gray-300">Always use English</Label>
                <Switch
                  id="always-english"
                  checked={personalization.alwaysUseEnglish}
                  onCheckedChange={(checked) => setPersonalization({ ...personalization, alwaysUseEnglish: checked })}
                  className="data-[state=checked]:bg-purple-600 data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-gray-600"
                />
              </div>
              <Button
                onClick={handleCopyAllEmails}
                className="w-full rounded-lg bg-green-600 hover:bg-green-700 text-white text-base py-3 mt-4"
              >
                <Copy className="mr-2 h-5 w-5" /> Copy All Emails
              </Button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Your personalization details are used to customize email templates and are not stored.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Categories & Contacts */}
        <div className="mt-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Key Contacts</h2>
          {categories?.map((category) => (
            <div key={category.id} className="mb-10">
              <h3 className="text-2xl font-semibold text-purple-800 dark:text-purple-300 mb-4">
                {category.name}
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-6">{category.description}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {contactsByCategory?.[category.id]?.map((contact) => (
                  <ContactCard key={contact.id} contact={contact} personalization={personalization} />
                ))}
              </div>
              <Separator className="my-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full py-6 text-center text-gray-600 dark:text-gray-400 text-sm mt-auto">
        <p>&copy; {new Date().getFullYear()} Advocacy Campaign App. All rights reserved.</p>
        <MadeWithDyad />
      </footer>
    </div>
  );
};

export default TopicDetail;