export type EmailTemplateFormValue = {
  templateId?: string;
  emailLanguage: string;
  emailSubject: string;
  emailBody: string;
};

export type ContactFormValue = {
  contactId?: string;
  contactName: string;
  contactEmoji?: string;
  templateSourceContactIndex?: number;
  contactEmail: string;
  contactPrimaryEmail?: string;
  contactLanguages: string[];
  emailTemplates: EmailTemplateFormValue[];
};

export type GroupFormValue = {
  groupId?: string;
  groupName: string;
  contacts: ContactFormValue[];
};

export type ContactsFormValues = {
  groups: GroupFormValue[];
};
