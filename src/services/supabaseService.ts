import { supabase } from '@/lib/supabase';
import { Topic, Category, Contact, EmailTemplate } from '@/types/supabase';

export const getTopics = async (): Promise<Topic[]> => {
  const { data, error } = await supabase
    .from('topics')
    .select('*');
  if (error) throw error;
  return data;
};

export const getTopicBySlug = async (slug: string): Promise<Topic | null> => {
  const { data, error } = await supabase
    .from('topics')
    .select('*')
    .eq('slug', slug)
    .single();
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "No rows found"
  return data;
};

export const getCategoriesByTopicId = async (topicId: string): Promise<Category[]> => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('topicId', topicId);
  if (error) throw error;
  return data;
};

export const getContactsByCategoryId = async (categoryId: string): Promise<Contact[]> => {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('categoryId', categoryId);
  if (error) throw error;
  return data;
};

export const getEmailTemplatesByContactId = async (contactId: string): Promise<EmailTemplate[]> => {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('contactId', contactId);
  if (error) throw error;
  return data;
};