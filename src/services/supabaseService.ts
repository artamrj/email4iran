import { supabase } from '@/lib/supabase';
import { Topic, Group, Contact, EmailTemplate } from '@/types/supabase'; // Updated import for Group

export const getTopics = async (): Promise<Topic[]> => {
  const { data, error } = await supabase
    .from('topics')
    .select('id, slug, name, description, emoji, is_active'); // Removed default_language
  if (error) throw error;
  return data;
};

export const getTopicBySlug = async (slug: string): Promise<Topic | null> => {
  const { data, error } = await supabase
    .from('topics')
    .select('id, slug, name, description, emoji, is_active') // Removed default_language
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
    .select('id, group_id, name, organization, location, emoji, email, languages') // Updated column names
    .eq('group_id', groupId); // Updated column name
  if (error) throw error;
  return data;
};

export const getEmailTemplatesByContactId = async (contactId: string): Promise<EmailTemplate[]> => {
  const { data, error } = await supabase
    .from('email_templates')
    .select('id, contact_id, language, subject, body') // Updated column names
    .eq('contact_id', contactId); // Updated column name
  if (error) throw error;
  return data;
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

export const createEmailTemplate = async (templateData: Omit<EmailTemplate, 'id'>): Promise<EmailTemplate> => {
  const { data, error } = await supabase
    .from('email_templates')
    .insert([templateData])
    .select()
    .single();
  if (error) throw error;
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
  updates: Partial<Pick<Contact, 'name' | 'emoji' | 'email' | 'languages'>>,
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
