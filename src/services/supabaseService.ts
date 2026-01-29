import { supabase } from '@/lib/supabase';
import { Topic, Group, Contact, EmailTemplate } from '@/types/supabase'; // Updated import for Group

export const getTopics = async (): Promise<Topic[]> => {
  const { data, error } = await supabase
    .from('topics')
    .select('id, slug, name, description, emoji, is_active, featured_order'); // Removed default_language
  if (error) throw error;
  return data;
};

export const getTopicBySlug = async (slug: string): Promise<Topic | null> => {
  const { data, error } = await supabase
    .from('topics')
    .select('id, slug, name, description, emoji, is_active, featured_order') // Removed default_language
    .eq('slug', slug)
    .single();
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "No rows found"
  return data;
};

export const getGroupsByTopicId = async (topicId: string): Promise<Group[]> => { // Renamed function
  const { data, error } = await supabase
    .from('groups') // Changed table name
    .select('id, topic_id, name, description') // Updated column names
    .eq('topic_id', topicId); // Updated column name
  if (error) throw error;
  return data;
};

export const getContactsByGroupId = async (groupId: string): Promise<Contact[]> => { // Renamed function
  const { data, error } = await supabase
    .from('contacts') // Changed table name
    .select('id, group_id, name, organization, location, emoji, email, cc_emails, languages') // Updated column names
    .eq('group_id', groupId); // Updated column name
  if (error) throw error;
  return data;
};

export const getEmailTemplatesByContactId = async (contactId: string): Promise<EmailTemplate[]> => {
  const { data: linkData, error: linkError } = await supabase
    .from('contact_email_templates')
    .select('template_id')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: true });
  if (linkError) throw linkError;

  const templateIds = (linkData ?? [])
    .map((row) => row.template_id)
    .filter((id): id is string => Boolean(id));

  if (templateIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('email_templates')
    .select('id, contact_id, language, subject, body') // Updated column names
    .in('id', templateIds);
  if (error) throw error;
  const templatesById = new Map((data ?? []).map((template) => [template.id, template]));
  return templateIds
    .map((id) => templatesById.get(id))
    .filter((template): template is EmailTemplate => Boolean(template));
};

// --- New functions for creating data ---

export const createTopic = async (topicData: Omit<Topic, 'id'>): Promise<Topic> => {
  const { data, error } = await supabase
    .from('topics')
    .insert([topicData])
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateTopicActive = async (topicId: string, isActive: boolean): Promise<Topic> => {
  const { data, error } = await supabase
    .from('topics')
    .update({ is_active: isActive })
    .eq('id', topicId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const setTopicFeaturedOrder = async (
  slot: 1 | 2,
  topicId: string | null,
): Promise<void> => {
  const { error: clearError } = await supabase
    .from('topics')
    .update({ featured_order: null })
    .eq('featured_order', slot);
  if (clearError) throw clearError;

  if (!topicId) return;

  const { error: setError } = await supabase
    .from('topics')
    .update({ featured_order: slot })
    .eq('id', topicId);
  if (setError) throw setError;
};

export const createGroup = async (groupData: Omit<Group, 'id'>): Promise<Group> => {
  const { data, error } = await supabase
    .from('groups')
    .insert([groupData])
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const createContact = async (contactData: Omit<Contact, 'id'>): Promise<Contact> => {
  const { data, error } = await supabase
    .from('contacts')
    .insert([contactData])
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const linkEmailTemplateToContact = async (contactId: string, templateId: string): Promise<void> => {
  const { error } = await supabase
    .from('contact_email_templates')
    .upsert([{ contact_id: contactId, template_id: templateId }], {
      onConflict: 'contact_id,template_id',
    });
  if (error) throw error;
};

export const setContactEmailTemplates = async (contactId: string, templateIds: string[]): Promise<void> => {
  const { error: deleteError } = await supabase
    .from('contact_email_templates')
    .delete()
    .eq('contact_id', contactId);
  if (deleteError) throw deleteError;

  if (templateIds.length === 0) return;

  const rows = templateIds.map((templateId) => ({
    contact_id: contactId,
    template_id: templateId,
  }));

  const { error: insertError } = await supabase
    .from('contact_email_templates')
    .insert(rows);
  if (insertError) throw insertError;
};

export const createEmailTemplate = async (templateData: Omit<EmailTemplate, 'id'>): Promise<EmailTemplate> => {
  const { data, error } = await supabase
    .from('email_templates')
    .insert([templateData])
    .select()
    .single();
  if (error) throw error;
  if (templateData.contact_id && data?.id) {
    await linkEmailTemplateToContact(templateData.contact_id, data.id);
  }
  return data;
};

export const updateGroup = async (
  groupId: string,
  updates: Partial<Pick<Group, 'name' | 'description'>>,
): Promise<Group> => {
  const { data, error } = await supabase
    .from('groups')
    .update(updates)
    .eq('id', groupId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateContact = async (
  contactId: string,
  updates: Partial<Pick<Contact, 'name' | 'emoji' | 'email' | 'cc_emails' | 'languages'>>,
): Promise<Contact> => {
  const { data, error } = await supabase
    .from('contacts')
    .update(updates)
    .eq('id', contactId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateEmailTemplate = async (
  templateId: string,
  updates: Partial<Pick<EmailTemplate, 'language' | 'subject' | 'body'>>,
): Promise<EmailTemplate> => {
  const { data, error } = await supabase
    .from('email_templates')
    .update(updates)
    .eq('id', templateId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteTopic = async (topicId: string): Promise<void> => {
  const { error } = await supabase
    .from('topics')
    .delete()
    .eq('id', topicId);
  if (error) throw error;
};
