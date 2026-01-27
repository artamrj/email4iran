"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Locale = "en" | "fa";

type TranslationParams = Record<string, string | number>;

const STORAGE_KEY = "email4iran-language";

const translations = {
  en: {
    toggleTheme: "Toggle theme",
    toggleLanguage: "Switch to {{language}}",
    languageEnglish: "English",
    languagePersian: "Persian",
    languageLocalDynamic: "Local (dynamic)",
    controlPanel: "Control Panel",
    addTopic: "Add Topic",
    addNewTopic: "Add New Topic",
    enterPassword: "Enter Password",
    topicControlPanel: "Topic Control Panel",
    addTopics: "Add Topics",
    passwordRequiredManage: "A password is required to manage topics.",
    addTopicsOrActivate: "Add new topics or activate/deactivate existing ones.",
    addTopicsAdminRequired:
      "Add new topics. Editing existing topics requires the admin password.",
    manageTopics: "Manage Topics",
    manageVisibility: "Manage Visibility",
    newTopicsActiveByDefault:
      "New topics are active by default. Toggle a switch to deactivate old topics.",
    toggleTopicsActiveInactive:
      "Toggle topics active/inactive. Editing groups and emails requires the admin password.",
    failedUpdateTopicStatus:
      "Failed to update topic status. Please try again.",
    failedDeleteTopic: "Failed to delete topic. Please try again.",
    topicDeleted: "Topic deleted.",
    topicActivated: "Topic activated.",
    topicDeactivated: "Topic deactivated.",
    deleteConfirm: "Delete \"{{topicName}}\"? This cannot be undone.",
    activeStatus: "Active",
    inactiveStatus: "Inactive",
    deleteAction: "Delete",
    adminEnvTooltip:
      "Please set `NEXT_PUBLIC_ADMIN_PASSWORD` or `NEXT_PUBLIC_ADD_TOPIC_PASSWORD` in your .env.local file to enable this feature.",
    failedLoadTopics:
      "Failed to load topics. Please check your Supabase connection and schema.",
    noTopicsFound: "No topics found yet. Add your first topic to get started.",
    heroTitle: "Send the emails that move #FreeIran forward",
    heroSubtitle:
      "Discover verified domains and key contacts, send faster with ready templates, and turn small wins into unstoppable momentum for #IranRevolution2026.",
    lionSunAlt: "Lion and Sun emblem",
    getStarted: "Get Started",
    errorLoadingTopics: "Error Loading Topics",
    errorLoadingTopicsBody:
      "Could not fetch advocacy topics. Please check your Supabase connection and environment variables.",
    sortOldestToNewest: "Oldest → Newest",
    sortNewestToOldest: "Newest → Oldest",
    noActiveTopics: "No active topics yet. Check back soon.",
    noTemplateAvailableTitle: "No template available",
    noTemplateAvailableBody: "No email template found for this contact.",
    noEmailTemplateAvailable: "No email template available.",
    noPrimaryEmailAvailable: "No primary email address available.",
    noEmailContentToCopy: "No email content available to copy.",
    failedCopyEmailContent: "Failed to copy email content.",
    emailCopied: "Email content copied to clipboard!",
    emailLabel: "Email",
    noEmailAvailable: "No email available",
    ccLabel: "CC",
    languagesLabel: "Languages",
    sendEmail: "Send Email",
    customize: "Customize",
    customizeEmail: "Customize Email",
    customizeEmailDescription: "Edit the subject and body before sending.",
    subjectLabel: "Subject",
    bodyLabel: "Body",
    openEmailApp: "Open Email App",
    copyToClipboard: "Copy to Clipboard",
    back: "Back",
    backToTopics: "Back to Topics",
    personalizeYourMessage: "Personalize Your Message",
    personalizeDescription:
      "Enter your details to automatically customize email templates for contacts.",
    yourNameRequired: "Your Name (Required)",
    yourCityRequired: "Your City (Required)",
    yourCountryRequired: "Your Country (Required)",
    personalizationChecking: "Checking required personalization fields...",
    personalizationNote:
      "Your personalization details are used to customize email templates and are not stored.",
    keyContacts: "Key Contacts",
    notFoundTitle: "Oops! Page not found",
    returnHome: "Return to Home",
    customizeSubjectPlaceholder: "Regarding the recent events in {{city}}",
    customizeBodyPlaceholder: "Dear {{name}}, I am writing to express my concern...",
    topicDetailsSaved: "Topic details saved! Now add contacts.",
    topicDetailsMissing: "Topic details are missing. Please go back to Step 1.",
    addAllDetailsSuccess:
      "Topic, groups, contacts, and email templates added successfully!",
    addAllDetailsFailed: "Failed to add all details. Please try again.",
    createNewTopicTitle: "Create New Topic",
    addContactDetailsTitle: "Add Contact Details",
    passwordRequiredAddTopics: "A password is required to add new topics.",
    fillTopicDetails: "Fill in the details for your new advocacy topic.",
    addGroupsContactsTemplates:
      "Now, add groups, key contacts, and email templates for this topic.",
    topicNameLabel: "Topic Name",
    topicNamePlaceholder: "Human Rights Advocacy",
    slugLabel: "Slug (URL-friendly)",
    slugPlaceholder: "human-rights-advocacy",
    descriptionLabel: "Description",
    descriptionPlaceholder: "A brief overview of the topic...",
    emojiLabel: "Emoji (e.g., ✊)",
    nextAddContacts: "Next: Add Contacts",
    groupTitle: "Group #{{index}}: {{name}}",
    newGroup: "New Group",
    removeGroup: "Remove Group",
    groupDetails: "Group Details",
    groupNameLabel: "Group Name",
    groupNamePlaceholder: "Government Officials",
    contactsInGroup: "Contacts in this Group",
    addAnotherContact: "Add Another Contact to this Group",
    addAnotherGroup: "Add Another Group",
    backButton: "Back",
    addAllDetails: "Add All Details",
    contactTitle: "Contact #{{index}}: {{name}}",
    contactNumber: "Contact #{{index}}",
    newContact: "New Contact",
    removeContact: "Remove Contact",
    contactDetails: "Contact Details",
    contactNameLabel: "Contact Name",
    contactNamePlaceholder: "Minister of Justice",
    contactEmojiLabel: "Emoji (e.g., 🇮🇷)",
    emailPlaceholder: "contact@example.com, another@example.com",
    multipleEmailsHelp: "Enter multiple emails separated by commas.",
    primaryEmailLabel: "Primary Email (To)",
    selectPrimaryEmail: "Select primary email",
    ccNote: "Other emails will be added as CC.",
    contactLanguagesLabel: "Contact Languages",
    selectLanguage: "Select a language",
    primaryLanguageHelp: "Select the primary language for this contact.",
    emailTemplatesSourceLabel: "Email Templates Source",
    emailTemplatesSourceHelp:
      "Reuse templates from another contact so you don't re-enter the same content.",
    createNewTemplates: "Create new templates",
    templatesLinked:
      "Templates are linked to {{name}}. Edit the source contact to change them.",
    emailTemplatesLabel: "Email Templates",
    addAnotherTemplate: "Add Another Email Template",
    emailTemplateTitle: "Email Template #{{index}}",
    removeEmailTemplate: "Remove Email Template",
    insertVariables: "Insert variables",
    into: "into",
    subjectLower: "subject",
    bodyLower: "body",
    subjectButton: "Subject",
    bodyButton: "Body",
    templateLanguageLabel: "Template Language",
    selectTemplateLanguage: "Select template language",
    subjectHelp:
      "Keep it short and specific—placeholders work here too.",
    bodyHelp: "Aim for a friendly, clear tone and keep paragraphs short.",
    editGroupsEmails: "Edit Groups & Emails",
    editTopicTitle: "Edit {{topicName}}",
    editTopicDescription:
      "Update groups, contacts, and email templates or add new entries.",
    failedLoadGroupsContacts:
      "Failed to load groups and contacts. Please check your Supabase connection and schema.",
    noGroupsFound:
      "No groups found for this topic yet. Add your first group below.",
    saving: "Saving...",
    saveChanges: "Save Changes",
    cancel: "Cancel",
    topicContactsUpdated: "Topic contacts updated successfully!",
    failedUpdateTopicContacts:
      "Failed to update topic contacts. Please try again.",
    passwordRequired: "Password is required.",
    passwordVerified: "Password verified!",
    incorrectPassword: "Incorrect password.",
    passwordNotConfigured:
      "Password not configured. Please set {{envKey}} as a build-time environment variable.",
    passwordLabel: "Password",
    passwordPlaceholder: "Enter password",
    verify: "Verify",
    validationSlugRequired: "Slug is required.",
    validationSlugFormat:
      "Slug must be lowercase, alphanumeric, and use hyphens for spaces.",
    validationTopicNameRequired: "Topic name is required.",
    validationDescriptionRequired: "Description is required.",
    validationEmailTemplateLanguageRequired:
      "Email template language is required.",
    validationEmailSubjectRequired: "Email subject is required.",
    validationEmailBodyRequired: "Email body is required.",
    validationContactNameRequired: "Contact name is required.",
    validationEmailRequired: "Email is required.",
    validationEmailInvalid:
      "Invalid email format. Please enter one or more valid email addresses, separated by commas.",
    validationLanguageRequired: "At least one language is required.",
    validationEmailTemplateRequired:
      "At least one email template is required.",
    validationPrimaryEmailRequired: "Please select a primary email address.",
    validationPrimaryEmailMustBeListed:
      "Primary email must be one of the listed addresses.",
    validationGroupNameRequired: "Group name is required.",
    validationContactRequiredPerGroup:
      "At least one contact is required per group.",
    validationGroupRequired: "At least one group is required.",
  },
  fa: {
    toggleTheme: "تغییر تم",
    toggleLanguage: "تغییر زبان به {{language}}",
    languageEnglish: "انگلیسی",
    languagePersian: "فارسی",
    languageLocalDynamic: "محلی (پویا)",
    controlPanel: "پنل کنترل",
    addTopic: "افزودن موضوع",
    addNewTopic: "افزودن موضوع جدید",
    enterPassword: "وارد کردن گذرواژه",
    topicControlPanel: "پنل کنترل موضوعات",
    addTopics: "افزودن موضوعات",
    passwordRequiredManage: "برای مدیریت موضوعات، گذرواژه لازم است.",
    addTopicsOrActivate:
      "موضوعات جدید را اضافه کنید یا موضوعات موجود را فعال/غیرفعال کنید.",
    addTopicsAdminRequired:
      "موضوعات جدید را اضافه کنید. ویرایش موضوعات موجود به گذرواژه مدیر نیاز دارد.",
    manageTopics: "مدیریت موضوعات",
    manageVisibility: "مدیریت نمایش",
    newTopicsActiveByDefault:
      "موضوعات جدید به صورت پیش فرض فعال هستند. برای غیرفعال کردن موضوعات قدیمی، کلید را تغییر دهید.",
    toggleTopicsActiveInactive:
      "موضوعات را فعال/غیرفعال کنید. ویرایش گروه ها و ایمیل ها به گذرواژه مدیر نیاز دارد.",
    failedUpdateTopicStatus:
      "به روزرسانی وضعیت موضوع ناموفق بود. دوباره تلاش کنید.",
    failedDeleteTopic: "حذف موضوع ناموفق بود. دوباره تلاش کنید.",
    topicDeleted: "موضوع حذف شد.",
    topicActivated: "موضوع فعال شد.",
    topicDeactivated: "موضوع غیرفعال شد.",
    deleteConfirm: "موضوع «{{topicName}}» حذف شود؟ این کار قابل بازگشت نیست.",
    activeStatus: "فعال",
    inactiveStatus: "غیرفعال",
    deleteAction: "حذف",
    adminEnvTooltip:
      "برای فعال سازی این قابلیت، `NEXT_PUBLIC_ADMIN_PASSWORD` یا `NEXT_PUBLIC_ADD_TOPIC_PASSWORD` را در فایل .env.local تنظیم کنید.",
    failedLoadTopics:
      "بارگذاری موضوعات ناموفق بود. اتصال Supabase و ساختار پایگاه داده را بررسی کنید.",
    noTopicsFound:
      "هنوز موضوعی ثبت نشده است. برای شروع، اولین موضوع را اضافه کنید.",
    heroTitle: "ایمیل هایی بفرستید که #FreeIran را جلو می برد",
    heroSubtitle:
      "دامنه های تأیید شده و مخاطبان کلیدی را پیدا کنید، با قالب های آماده سریع تر ارسال کنید، و پیروزی های کوچک را به شتابی توقف ناپذیر برای #IranRevolution2026 تبدیل کنید.",
    lionSunAlt: "نشان شیر و خورشید",
    getStarted: "شروع کنید",
    errorLoadingTopics: "خطا در بارگذاری موضوعات",
    errorLoadingTopicsBody:
      "امکان دریافت موضوعات کنشگری وجود ندارد. اتصال Supabase و متغیرهای محیطی را بررسی کنید.",
    sortOldestToNewest: "قدیمی → جدید",
    sortNewestToOldest: "جدید → قدیمی",
    noActiveTopics: "هنوز موضوع فعالی وجود ندارد. بعداً دوباره سر بزنید.",
    noTemplateAvailableTitle: "قالبی در دسترس نیست",
    noTemplateAvailableBody: "هیچ قالب ایمیلی برای این مخاطب پیدا نشد.",
    noEmailTemplateAvailable: "قالب ایمیل در دسترس نیست.",
    noPrimaryEmailAvailable: "هیچ آدرس ایمیل اصلی در دسترس نیست.",
    noEmailContentToCopy: "محتوای ایمیلی برای کپی وجود ندارد.",
    failedCopyEmailContent: "کپی کردن محتوای ایمیل ناموفق بود.",
    emailCopied: "محتوای ایمیل در کلیپ برد کپی شد!",
    emailLabel: "ایمیل",
    noEmailAvailable: "ایمیلی موجود نیست",
    ccLabel: "CC",
    languagesLabel: "زبان ها",
    sendEmail: "ارسال ایمیل",
    customize: "سفارشی سازی",
    customizeEmail: "سفارشی سازی ایمیل",
    customizeEmailDescription: "قبل از ارسال، موضوع و متن ایمیل را ویرایش کنید.",
    subjectLabel: "موضوع",
    bodyLabel: "متن",
    openEmailApp: "باز کردن برنامه ایمیل",
    copyToClipboard: "کپی در کلیپ برد",
    back: "بازگشت",
    backToTopics: "بازگشت به موضوعات",
    personalizeYourMessage: "شخصی سازی پیام",
    personalizeDescription:
      "جزئیات خود را وارد کنید تا قالب های ایمیل به صورت خودکار برای مخاطبان شخصی سازی شوند.",
    yourNameRequired: "نام شما (الزامی)",
    yourCityRequired: "شهر شما (الزامی)",
    yourCountryRequired: "کشور شما (الزامی)",
    personalizationChecking: "در حال بررسی فیلدهای شخصی سازی موردنیاز...",
    personalizationNote:
      "جزئیات شما فقط برای شخصی سازی قالب ها استفاده می شود و ذخیره نمی شود.",
    keyContacts: "مخاطبان کلیدی",
    notFoundTitle: "اوه! صفحه پیدا نشد",
    returnHome: "بازگشت به صفحه اصلی",
    customizeSubjectPlaceholder: "درباره رویدادهای اخیر در {{city}}",
    customizeBodyPlaceholder: "سرکار/جناب {{name}}، برای ابراز نگرانی خود می نویسم...",
    topicDetailsSaved: "جزئیات موضوع ذخیره شد! حالا مخاطبان را اضافه کنید.",
    topicDetailsMissing: "جزئیات موضوع موجود نیست. لطفاً به مرحله ۱ برگردید.",
    addAllDetailsSuccess:
      "موضوع، گروه ها، مخاطبان و قالب های ایمیل با موفقیت اضافه شدند!",
    addAllDetailsFailed: "افزودن همه جزئیات ناموفق بود. دوباره تلاش کنید.",
    createNewTopicTitle: "ایجاد موضوع جدید",
    addContactDetailsTitle: "افزودن جزئیات مخاطبان",
    passwordRequiredAddTopics: "برای افزودن موضوعات جدید، گذرواژه لازم است.",
    fillTopicDetails: "جزئیات موضوع کنشگری جدید خود را وارد کنید.",
    addGroupsContactsTemplates:
      "اکنون گروه ها، مخاطبان کلیدی و قالب های ایمیل را برای این موضوع اضافه کنید.",
    topicNameLabel: "نام موضوع",
    topicNamePlaceholder: "حمایت از حقوق بشر",
    slugLabel: "شناسه (مناسب URL)",
    slugPlaceholder: "human-rights-advocacy",
    descriptionLabel: "توضیحات",
    descriptionPlaceholder: "نمای کلی کوتاهی از موضوع...",
    emojiLabel: "ایموجی (مثلاً ✊)",
    nextAddContacts: "بعدی: افزودن مخاطبان",
    groupTitle: "گروه شماره {{index}}: {{name}}",
    newGroup: "گروه جدید",
    removeGroup: "حذف گروه",
    groupDetails: "جزئیات گروه",
    groupNameLabel: "نام گروه",
    groupNamePlaceholder: "مقامات دولتی",
    contactsInGroup: "مخاطبان این گروه",
    addAnotherContact: "افزودن مخاطب دیگر به این گروه",
    addAnotherGroup: "افزودن گروه دیگر",
    backButton: "بازگشت",
    addAllDetails: "افزودن همه جزئیات",
    contactTitle: "مخاطب شماره {{index}}: {{name}}",
    contactNumber: "مخاطب شماره {{index}}",
    newContact: "مخاطب جدید",
    removeContact: "حذف مخاطب",
    contactDetails: "جزئیات مخاطب",
    contactNameLabel: "نام مخاطب",
    contactNamePlaceholder: "وزیر دادگستری",
    contactEmojiLabel: "ایموجی (مثلاً 🇮🇷)",
    emailPlaceholder: "contact@example.com, another@example.com",
    multipleEmailsHelp: "برای چند ایمیل، آن ها را با ویرگول جدا کنید.",
    primaryEmailLabel: "ایمیل اصلی (To)",
    selectPrimaryEmail: "ایمیل اصلی را انتخاب کنید",
    ccNote: "سایر ایمیل ها به CC اضافه می شوند.",
    contactLanguagesLabel: "زبان های مخاطب",
    selectLanguage: "یک زبان انتخاب کنید",
    primaryLanguageHelp: "زبان اصلی این مخاطب را انتخاب کنید.",
    emailTemplatesSourceLabel: "منبع قالب های ایمیل",
    emailTemplatesSourceHelp:
      "برای جلوگیری از ورود دوباره محتوا، قالب ها را از مخاطب دیگری استفاده کنید.",
    createNewTemplates: "ایجاد قالب های جدید",
    templatesLinked:
      "قالب ها به {{name}} متصل هستند. برای تغییر، مخاطب منبع را ویرایش کنید.",
    emailTemplatesLabel: "قالب های ایمیل",
    addAnotherTemplate: "افزودن قالب ایمیل دیگر",
    emailTemplateTitle: "قالب ایمیل شماره {{index}}",
    removeEmailTemplate: "حذف قالب ایمیل",
    insertVariables: "درج متغیرها",
    into: "در",
    subjectLower: "موضوع",
    bodyLower: "متن",
    subjectButton: "موضوع",
    bodyButton: "متن",
    templateLanguageLabel: "زبان قالب",
    selectTemplateLanguage: "زبان قالب را انتخاب کنید",
    subjectHelp: "کوتاه و دقیق باشد—جایگزین ها اینجا هم کار می کنند.",
    bodyHelp: "لحن دوستانه و روشن باشد و پاراگراف ها کوتاه بمانند.",
    editGroupsEmails: "ویرایش گروه ها و ایمیل ها",
    editTopicTitle: "ویرایش {{topicName}}",
    editTopicDescription:
      "گروه ها، مخاطبان و قالب های ایمیل را به روزرسانی کنید یا موارد جدید اضافه کنید.",
    failedLoadGroupsContacts:
      "بارگذاری گروه ها و مخاطبان ناموفق بود. اتصال Supabase و ساختار پایگاه داده را بررسی کنید.",
    noGroupsFound:
      "هنوز گروهی برای این موضوع ثبت نشده است. اولین گروه را در پایین اضافه کنید.",
    saving: "در حال ذخیره...",
    saveChanges: "ذخیره تغییرات",
    cancel: "انصراف",
    topicContactsUpdated: "مخاطبان موضوع با موفقیت به روزرسانی شدند!",
    failedUpdateTopicContacts:
      "به روزرسانی مخاطبان موضوع ناموفق بود. دوباره تلاش کنید.",
    passwordRequired: "گذرواژه الزامی است.",
    passwordVerified: "گذرواژه تأیید شد!",
    incorrectPassword: "گذرواژه نادرست است.",
    passwordNotConfigured:
      "گذرواژه تنظیم نشده است. لطفاً {{envKey}} را به عنوان متغیر محیطی در زمان ساخت تنظیم کنید.",
    passwordLabel: "گذرواژه",
    passwordPlaceholder: "گذرواژه را وارد کنید",
    verify: "تأیید",
    validationSlugRequired: "شناسه الزامی است.",
    validationSlugFormat:
      "شناسه باید حروف کوچک، شامل حروف/اعداد باشد و برای فاصله از خط تیره استفاده کند.",
    validationTopicNameRequired: "نام موضوع الزامی است.",
    validationDescriptionRequired: "توضیحات الزامی است.",
    validationEmailTemplateLanguageRequired: "زبان قالب ایمیل الزامی است.",
    validationEmailSubjectRequired: "موضوع ایمیل الزامی است.",
    validationEmailBodyRequired: "متن ایمیل الزامی است.",
    validationContactNameRequired: "نام مخاطب الزامی است.",
    validationEmailRequired: "ایمیل الزامی است.",
    validationEmailInvalid:
      "فرمت ایمیل نامعتبر است. یک یا چند ایمیل معتبر را با ویرگول جدا کنید.",
    validationLanguageRequired: "حداقل یک زبان لازم است.",
    validationEmailTemplateRequired: "حداقل یک قالب ایمیل لازم است.",
    validationPrimaryEmailRequired: "لطفاً ایمیل اصلی را انتخاب کنید.",
    validationPrimaryEmailMustBeListed:
      "ایمیل اصلی باید یکی از آدرس های فهرست شده باشد.",
    validationGroupNameRequired: "نام گروه الزامی است.",
    validationContactRequiredPerGroup:
      "حداقل یک مخاطب برای هر گروه لازم است.",
    validationGroupRequired: "حداقل یک گروه لازم است.",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

type Translator = (key: TranslationKey, params?: TranslationParams) => string;

type LanguageContextValue = {
  locale: Locale;
  dir: "ltr" | "rtl";
  setLocale: (locale: Locale) => void;
  t: Translator;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const normalizeLocale = (value: string | null | undefined): Locale =>
  value === "fa" ? "fa" : "en";

const interpolate = (text: string, params?: TranslationParams) => {
  if (!params) return text;
  return text.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) =>
    params[key] !== undefined ? String(params[key]) : "",
  );
};

const createTranslator = (locale: Locale): Translator => (key, params) => {
  const template = translations[locale][key] ?? translations.en[key] ?? key;
  return interpolate(template, params);
};

const getDisplayNames = (locale: Locale) => {
  if (typeof Intl === "undefined" || typeof Intl.DisplayNames === "undefined") {
    return null;
  }
  try {
    return new Intl.DisplayNames(locale, { type: "language" });
  } catch {
    return null;
  }
};

export const getLanguageLabel = (
  code: string,
  locale: Locale,
  t: Translator,
  fallback?: string,
) => {
  if (code === "local") {
    return t("languageLocalDynamic");
  }
  const displayNames = getDisplayNames(locale);
  const label = displayNames?.of(code);
  return label ?? fallback ?? code.toUpperCase();
};

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedRaw = window.localStorage.getItem(STORAGE_KEY);
    if (storedRaw === "en" || storedRaw === "fa") {
      setLocaleState(storedRaw);
      return;
    }
    const navigatorLocale = normalizeLocale(navigator.language?.slice(0, 2));
    setLocaleState(navigatorLocale);
  }, []);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, nextLocale);
    }
  }, []);

  const dir: LanguageContextValue["dir"] = locale === "fa" ? "rtl" : "ltr";
  const t = useMemo(() => createTranslator(locale), [locale]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = locale;
    // Keep layout LTR; apply RTL only on specific text elements if needed.
    document.documentElement.dir = "ltr";
  }, [locale]);

  const value = useMemo(
    () => ({ locale, dir, setLocale, t }),
    [dir, locale, setLocale, t],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return context;
};
