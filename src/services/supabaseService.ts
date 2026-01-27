import { supabase } from '@/lib/supabase';
import { Topic, Group, Contact, EmailTemplate } from '@/types/supabase'; // Updated import for Group

export const getTopics = async (): Promise<Topic[]> => {
  const { data, error } = await supabase
    .from('topics')
    .select('id, slug, name, description, default_language'); // Updated column names
  if (error) throw error;
  return data;
};

export const getTopicBySlug = async (slug: string): Promise<Topic | null> => {
  const { data, error } = await supabase
    .from('topics')
    .select('id, slug, name, description, default_language') // Updated column names
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