"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  getTopicBySlug,
  getGroupsByTopicId,
  getContactsByGroupId,
  getEmailTemplatesByContactId,
} from "@/services/supabaseService";
import { Topic, Group, Contact, EmailTemplate } from "@/types/supabase";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Mail, Copy, ExternalLink } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { buildCcEmails, parseEmailList, selectPrimaryEmail } from "@/utils/email";
import { useTranslation } from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

interface Personalization {
  name: string;
  city: string;
  country: string;
}

type Translator = ReturnType<typeof useTranslation>["t"];

const replacePlaceholders = (
  text: string,
  personalization: Personalization,
) => {
  let result = text;
  result = result.replace(/{{name}}/g, personalization.name || "").trim();
  result = result.replace(/{{city}}/g, personalization.city || "").trim();
  result = result.replace(/{{country}}/g, personalization.country || "").trim();
  return result;
};

const detectTemplatePlaceholders = (templates: EmailTemplate[]) => {
  const usage = {
    name: false,
    city: false,
    country: false,
  };

  for (const template of templates) {
    const subject = template.subject ?? "";
    const body = template.body ?? "";
    const content = `${subject} ${body}`;

    if (!usage.name && content.includes("{{name}}")) {
      usage.name = true;
    }
    if (!usage.city && content.includes("{{city}}")) {
      usage.city = true;
    }
    if (!usage.country && content.includes("{{country}}")) {
      usage.country = true;
    }

    if (usage.name && usage.city && usage.country) {
      break;
    }
  }

  return usage;
};

const selectTemplateForContact = (
  templates: EmailTemplate[],
  contactLanguages: string[],
) => {
  let template: EmailTemplate | undefined;

  // Prioritize contact's specific languages (excluding 'en' for initial search)
  for (const lang of contactLanguages) {
    if (lang !== "en") {
      template = templates.find((t) => t.language === lang);
      if (template) break;
    }
  }

  // Fallback to 'local' if no specific language match
  if (!template) {
    template = templates.find((t) => t.language === "local");
  }

  // Fallback to English if no other template found
  if (!template) {
    template = templates.find((t) => t.language === "en");
  }

  return template;
};

const getEmailBody = (
  templates: EmailTemplate[],
  personalization: Personalization,
  contactLanguages: string[],
  t: Translator,
) => {
  const template = selectTemplateForContact(templates, contactLanguages);

  if (!template) {
    return {
      subject: t("noTemplateAvailableTitle"),
      body: t("noTemplateAvailableBody"),
    };
  }

  return {
    subject: replacePlaceholders(template.subject, personalization),
    body: replacePlaceholders(template.body, personalization),
  };
};

const getContactEmails = (contact: Contact) => {
  if (contact.cc_emails && contact.cc_emails.length > 0) {
    return {
      primaryEmail: contact.email,
      ccEmails: contact.cc_emails,
    };
  }

  const parsedEmails = parseEmailList(contact.email);
  const primaryEmail = selectPrimaryEmail(parsedEmails, contact.email);
  const ccEmails = buildCcEmails(parsedEmails, primaryEmail);
  return { primaryEmail, ccEmails };
};

const encodeMailtoValue = (value: string) =>
  encodeURIComponent(value.replace(/\r?\n/g, "\r\n"));

const buildMailtoLink = (
  to: string,
  cc: string[],
  subject: string,
  body: string,
) => {
  const parts: string[] = [];
  if (cc.length) parts.push(`cc=${encodeMailtoValue(cc.join(","))}`);
  if (subject) parts.push(`subject=${encodeMailtoValue(subject)}`);
  if (body) parts.push(`body=${encodeMailtoValue(body)}`);
  const query = parts.join("&");
  return `mailto:${to}${query ? `?${query}` : ""}`;
};

const ContactCard: React.FC<{
  contact: Contact;
  personalization: Personalization;
}> = ({ contact, personalization }) => {
  const { t } = useTranslation();
  const { data: templates, isLoading: isLoadingTemplates } = useQuery({
    queryKey: ["emailTemplates", contact.id],
    queryFn: () => getEmailTemplatesByContactId(contact.id),
  });

  const { subject, body } = useMemo(() => {
    if (!templates) return { subject: "", body: "" };
    return getEmailBody(templates, personalization, contact.languages, t);
  }, [templates, personalization, contact.languages, t]);

  const selectedTemplate = useMemo(() => {
    if (!templates) return undefined;
    return selectTemplateForContact(templates, contact.languages);
  }, [templates, contact.languages]);

  const requiredPlaceholders = useMemo(() => {
    if (!selectedTemplate) {
      return { name: false, city: false, country: false };
    }
    return detectTemplatePlaceholders([selectedTemplate]);
  }, [selectedTemplate]);

  const isMissingRequiredField =
    (requiredPlaceholders.name && !personalization.name.trim()) ||
    (requiredPlaceholders.city && !personalization.city.trim()) ||
    (requiredPlaceholders.country && !personalization.country.trim());

  const isLongTitle = contact.name.trim().length > 32;
  const { primaryEmail, ccEmails } = useMemo(
    () => getContactEmails(contact),
    [contact],
  );

  // State for customized email content
  const [customSubject, setCustomSubject] = useState(subject);
  const [customBody, setCustomBody] = useState(body);

  // Update customSubject and customBody when subject or body change (e.g., personalization changes)
  useEffect(() => {
    setCustomSubject(subject);
    setCustomBody(body);
  }, [subject, body]);

  const handleSendRecommendedEmail = () => {
    if (!subject || !body) {
      showError(t("noEmailTemplateAvailable"));
      return;
    }
    if (!primaryEmail) {
      showError(t("noPrimaryEmailAvailable"));
      return;
    }
    const mailtoLink = buildMailtoLink(primaryEmail, ccEmails, subject, body);
    window.location.href = mailtoLink;
  };

  const handleCopyEmail = (contentSubject: string, contentBody: string) => {
    if (!contentSubject || !contentBody) {
      showError(t("noEmailContentToCopy"));
      return;
    }
    const emailContent = `${t("subjectLabel")}: ${contentSubject}\n\n${contentBody}`;
    navigator.clipboard
      .writeText(emailContent)
      .then(() => showSuccess(t("emailCopied")))
      .catch(() => showError(t("failedCopyEmailContent")));
  };

  if (isLoadingTemplates) {
    return (
      <Card
        className={`rounded-xl shadow-md border-none bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 p-4 flex flex-col justify-between h-full ${
          isLongTitle ? "col-span-full" : ""
        }`}
      >
        <Skeleton className="h-6 w-3/4 mb-2 rounded-md" />
        <Skeleton className="h-4 w-1/2 mb-4 rounded-md" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </Card>
    );
  }

  return (
    <Card
      className={`rounded-xl shadow-md border-none bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 p-4 flex flex-col justify-between h-full ${
        isLongTitle ? "col-span-full" : ""
      }`}
    >
      <CardHeader className="p-0 pb-2 min-w-0">
        <div className="flex items-center gap-2 mb-1 min-w-0">
          <span className="text-2xl">{contact.emoji}</span>
          <CardTitle className="text-lg font-semibold text-foreground leading-snug break-words min-w-0">
            {contact.name}
          </CardTitle>
        </div>
        {(contact.organization || contact.location) && (
          <div className="text-sm text-muted-foreground leading-snug break-words">
            {contact.organization && <div>{contact.organization}</div>}
            {contact.location && <div>{contact.location}</div>}
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0 flex-grow flex flex-col gap-3 pt-2">
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {t("emailLabel")}
          </p>
          <div className="text-sm text-foreground break-all">
            {primaryEmail || t("noEmailAvailable")}
          </div>
          {ccEmails.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 pt-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-1">
                {t("ccLabel")}
              </span>
              {ccEmails.map((email) => (
                <span
                  key={email}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground"
                >
                  {email}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground mr-1">
            {t("languagesLabel")}
          </span>
          {contact.languages.map((lang) => (
            <span
              key={lang}
              className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
            >
              {lang.toUpperCase()}
            </span>
          ))}
        </div>
      </CardContent>
      <CardFooter className="p-0 pt-4 flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button
          onClick={handleSendRecommendedEmail}
          className="w-full min-w-0 flex-1 rounded-lg bg-primary text-primary-foreground text-sm py-2 px-3 hover:bg-primary/90"
          disabled={!subject || !body || isMissingRequiredField}
        >
          <Mail className="mr-2 h-4 w-4" /> {t("sendEmail")}
        </Button>
        <Dialog
          onOpenChange={(open) => {
            if (open) {
              setCustomSubject(subject);
              setCustomBody(body);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full min-w-0 flex-1 rounded-lg border-accent text-accent text-sm py-2 px-3 hover:bg-accent/10 dark:hover:bg-accent/20"
            >
              <ExternalLink className="mr-2 h-4 w-4" /> {t("customize")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-xl p-6 bg-card text-card-foreground">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-foreground">
                {t("customizeEmail")}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {t("customizeEmailDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label
                  htmlFor="subject"
                  className="text-sm font-medium text-foreground"
                >
                  {t("subjectLabel")}
                </Label>
                <Input
                  id="subject"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder={t("customizeSubjectPlaceholder")}
                  className="rounded-lg border-border bg-input text-foreground"
                />
              </div>
              <div className="grid gap-2">
                <Label
                  htmlFor="body"
                  className="text-sm font-medium text-foreground"
                >
                  {t("bodyLabel")}
                </Label>
                <Textarea
                  id="body"
                  value={customBody}
                  onChange={(e) => setCustomBody(e.target.value)}
                  rows={10}
                  placeholder={t("customizeBodyPlaceholder")}
                  className="rounded-lg border-border bg-input text-foreground"
                />
              </div>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                onClick={() => {
                  if (!primaryEmail) {
                    showError(t("noPrimaryEmailAvailable"));
                    return;
                  }
                  const mailtoLink = buildMailtoLink(primaryEmail, ccEmails, customSubject, customBody);
                  window.location.href = mailtoLink;
                }}
                className="w-full sm:w-auto rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm py-2 px-3"
                disabled={!customSubject || !customBody || isMissingRequiredField}
              >
                <Mail className="mr-2 h-4 w-4" /> {t("openEmailApp")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleCopyEmail(customSubject, customBody)}
                className="w-full sm:w-auto rounded-lg border-accent text-accent hover:bg-accent/10 dark:hover:bg-accent/20 text-sm py-2 px-3"
                disabled={!customSubject || !customBody || isMissingRequiredField}
              >
                <Copy className="mr-2 h-4 w-4" /> {t("copyToClipboard")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
};

const NotFoundState = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-4">{t("notFoundTitle")}</p>
        <a href="/" className="text-blue-500 hover:text-blue-700 underline">
          {t("returnHome")}
        </a>
      </div>
    </div>
  );
};

const TopicDetail = () => {
  const { t } = useTranslation();
  const params = useParams<{ topicSlug?: string }>();
  const router = useRouter();
  const topicSlugParam = params?.topicSlug;
  const topicSlug = Array.isArray(topicSlugParam)
    ? topicSlugParam[0]
    : topicSlugParam;

  const handleBackNavigation = () => {
    if (typeof window !== "undefined") {
      const sameOriginReferrer =
        document.referrer &&
        document.referrer.startsWith(window.location.origin);
      if (sameOriginReferrer) {
        router.back();
        return;
      }
    }
    router.push("/");
  };

  const [personalization, setPersonalization] = useState<Personalization>({
    name: "",
    city: "",
    country: "",
  });

  const { data: topic, isLoading: isLoadingTopic, isError: isErrorTopic } =
    useQuery<Topic | null>({
      queryKey: ["topic", topicSlug],
      queryFn: () => getTopicBySlug(topicSlug ?? ""),
      enabled: !!topicSlug,
    });

  const isTopicInactive = topic?.is_active === false;

  const { data: groups, isLoading: isLoadingGroups } = useQuery<Group[]>({
    queryKey: ["groups", topic?.id],
    queryFn: () => getGroupsByTopicId(topic!.id),
    enabled: !!topic?.id && !isTopicInactive,
  });

  const { data: contactsByGroup, isLoading: isLoadingContacts } = useQuery<
    Record<string, Contact[]>
  >({
    queryKey: ["contactsByGroups", groups?.map((c) => c.id)],
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

  const allContacts = useMemo(() => {
    if (!groups || !contactsByGroup) return [];
    return groups.flatMap((group) => contactsByGroup[group.id] ?? []);
  }, [contactsByGroup, groups]);

  const templateQueries = useQueries({
    queries: allContacts.map((contact) => ({
      queryKey: ["emailTemplates", contact.id],
      queryFn: () => getEmailTemplatesByContactId(contact.id),
      enabled: !!contact.id && !isTopicInactive,
    })),
  });

  const placeholderUsage = useMemo(() => {
    const usage = {
      name: false,
      city: false,
      country: false,
    };

    for (const query of templateQueries) {
      const templates = query.data ?? [];
      const detected = detectTemplatePlaceholders(templates);
      usage.name = usage.name || detected.name;
      usage.city = usage.city || detected.city;
      usage.country = usage.country || detected.country;

      if (usage.name && usage.city && usage.country) {
        break;
      }
    }

    return usage;
  }, [templateQueries]);

  const isLoadingPersonalization = templateQueries.some(
    (query) => query.isLoading,
  );

  const hasPersonalizationFields =
    placeholderUsage.name || placeholderUsage.city || placeholderUsage.country;
  const showPersonalizationCard =
    isLoadingPersonalization || hasPersonalizationFields;

  useEffect(() => {
    if (!topic || topic.is_active === false) return;
    document.title = topic.name;
    const metaDescription = document.querySelector('meta[name="description"]');
    metaDescription?.setAttribute("content", topic.description);
  }, [topic]);

  if (!topicSlug) {
    return null;
  }

  if (!isLoadingTopic && (!topic || isTopicInactive) && !isErrorTopic) {
    return <NotFoundState />;
  }

  if (isLoadingTopic || isLoadingGroups || isLoadingContacts) {
    return (
      <div className="min-h-screen flex flex-col bg-background p-4 sm:p-8">
        <div className="container mx-auto max-w-6xl py-8">
          <Button
            variant="ghost"
            onClick={handleBackNavigation}
            className="mb-6 rounded-lg text-muted-foreground hover:bg-secondary"
          >
            <ArrowLeft className="mr-2 h-5 w-5" /> {t("back")}
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
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background p-4 sm:p-8">
      <div className="container mx-auto max-w-6xl py-8">
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={handleBackNavigation}
            className="rounded-lg text-muted-foreground hover:bg-secondary"
          >
            <ArrowLeft className="mr-2 h-5 w-5" /> {t("backToTopics")}
          </Button>
        </div>

        <div
          className={`grid grid-cols-1 gap-8 ${
            showPersonalizationCard ? "lg:grid-cols-3" : "lg:grid-cols-1"
          }`}
        >
          <Card
            className={`rounded-xl shadow-lg border-none bg-card p-6 ${
              showPersonalizationCard ? "lg:col-span-2" : "lg:col-span-1"
            }`}
          >
            <CardHeader className="p-0 pb-4">
              <div className="flex items-center gap-3 mb-2">
                {topic.emoji && (
                  <span className="text-5xl sm:text-6xl leading-none">
                    {topic.emoji}
                  </span>
                )}
                <CardTitle className="text-4xl sm:text-5xl font-extrabold text-foreground leading-tight">
                  {topic.name}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0 prose dark:prose-invert max-w-none text-foreground mt-4">
              <MarkdownRenderer content={topic.description} />
            </CardContent>
          </Card>

          {showPersonalizationCard && (
            <Card className="lg:col-span-1 rounded-xl shadow-lg border-none bg-card p-6">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-2xl font-bold text-foreground">
                  {t("personalizeYourMessage")}
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  {t("personalizeDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 grid gap-4">
                {placeholderUsage.name && (
                  <div>
                    <Label
                      htmlFor="name"
                      className="text-sm font-medium text-foreground"
                    >
                      {t("yourNameRequired")}
                    </Label>
                    <Input
                      id="name"
                      value={personalization.name}
                      onChange={(e) =>
                        setPersonalization({
                          ...personalization,
                          name: e.target.value,
                        })
                      }
                      placeholder="John Doe"
                      className="rounded-lg border-border bg-input text-foreground"
                    />
                  </div>
                )}
                {placeholderUsage.city && (
                  <div>
                    <Label
                      htmlFor="city"
                      className="text-sm font-medium text-foreground"
                    >
                      {t("yourCityRequired")}
                    </Label>
                    <Input
                      id="city"
                      value={personalization.city}
                      onChange={(e) =>
                        setPersonalization({
                          ...personalization,
                          city: e.target.value,
                        })
                      }
                      placeholder="New York"
                      className="rounded-lg border-border bg-input text-foreground"
                    />
                  </div>
                )}
                {placeholderUsage.country && (
                  <div>
                    <Label
                      htmlFor="country"
                      className="text-sm font-medium text-foreground"
                    >
                      {t("yourCountryRequired")}
                    </Label>
                    <Input
                      id="country"
                      value={personalization.country}
                      onChange={(e) =>
                        setPersonalization({
                          ...personalization,
                          country: e.target.value,
                        })
                      }
                      placeholder="USA"
                      className="rounded-lg border-border bg-input text-foreground"
                    />
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {isLoadingPersonalization
                    ? t("personalizationChecking")
                    : t("personalizationNote")}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="mt-12">
          <h2 className="text-3xl font-bold text-foreground mb-6">
            {t("keyContacts")}
          </h2>
          {groups?.map((group) => (
            <div key={group.id} className="mb-10">
              <h3 className="text-2xl font-semibold text-primary mb-4">
                {group.name}
              </h3>
              <p className="text-foreground mb-6">{group.description}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {contactsByGroup?.[group.id]?.map((contact) => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    personalization={personalization}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default TopicDetail;
