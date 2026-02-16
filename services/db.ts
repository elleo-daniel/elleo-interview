import { InterviewRecord } from '../types';
import { supabase } from './supabase';

const TABLE_NAME = 'interview_records';

// Helper to map snake_case from DB to camelCase for App
const mapFromDb = (record: any): InterviewRecord => ({
  id: record.id,
  basicInfo: record.basic_info,
  answers: record.answers,
  resume: record.resume,
  aiSummary: record.ai_summary,
  createdAt: new Date(record.created_at).getTime()
});

// Helper to map camelCase from App to snake_case for DB
const mapToDb = (record: InterviewRecord) => ({
  id: record.id,
  basic_info: record.basicInfo,
  answers: record.answers,
  resume: record.resume,
  ai_summary: record.aiSummary,
  created_at: new Date(record.createdAt).toISOString()
});

export const saveRecord = async (record: InterviewRecord): Promise<void> => {
  console.log('Attempting to save record to Supabase:', record.id);
  const dbRecord = mapToDb(record);

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('로그인이 필요합니다.');
  }

  // Check if record exists to maintain original user_id
  const { data: existingRecord } = await supabase
    .from(TABLE_NAME)
    .select('user_id')
    .eq('id', record.id)
    .single();

  const finalUserId = existingRecord?.user_id || user.id;

  let error;

  if (existingRecord) {
    // UPDATE existing record
    // This strictly checks UPDATE policies (which now allow Admins)
    const { error: updateError } = await supabase
      .from(TABLE_NAME)
      .update({ ...dbRecord, user_id: finalUserId })
      .eq('id', record.id);
    error = updateError;
  } else {
    // INSERT new record
    // This checks INSERT policies (standard: auth.uid() = user_id)
    // Since Admin is creating the record, user_id matches, so it passes.
    const { error: insertError } = await supabase
      .from(TABLE_NAME)
      .insert({ ...dbRecord, user_id: finalUserId });
    error = insertError;
  }

  if (error) {
    console.error('❌ Supabase Save Error:', error);
    throw error;
  }
  console.log('✅ Supabase Save Success');
};

export const getRecords = async (): Promise<InterviewRecord[]> => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.warn('No user logged in, returning empty records');
    return [];
  }

  // Fetch user role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  let query = supabase
    .from(TABLE_NAME)
    .select('*');

  // If NOT admin, restrict to own records
  if (profile?.role !== 'admin') {
    query = query.eq('user_id', user.id);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching records from Supabase:', error);
    return [];
  }

  return (data || []).map(mapFromDb);
};

export const deleteRecord = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting record from Supabase:', error);
    throw error;
  }
};

export const getRecordById = async (id: string): Promise<InterviewRecord | undefined> => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching record by ID from Supabase:', error);
    return undefined;
  }

  return data ? mapFromDb(data) : undefined;
};