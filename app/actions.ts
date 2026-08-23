'use server';

import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// 1. 공고 생성 Action
export async function createAuctionAction(form: any) {
  try {
    const hashedPassword = await bcrypt.hash(form.password, 10);

    const { data, error } = await supabase
      .from('posts')
      .insert([
        {
          title: form.title,
          item_name: form.itemName,
          manufacturer: form.manufacturer,
          spec: form.spec,
          monthly_volume: form.monthlyVolume,
          delivery_place: form.deliveryPlace,
          end_date: form.endDate,
          password_hash: hashedPassword,
          status: 'open'
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase Error:', error);
      return { success: false, message: error.message };
    }

    return { 
      success: true, 
      postId: data.id, 
      message: '등록 성공' 
    };
  } catch (err: any) {
    console.error('Action Error:', err);
    return { success: false, message: err.message || '서버 오류 발생' };
  }
}

// 2. 입찰 제출 Action
export async function submitBidAction(postId: any, bidderName: any, unitPrice: any) {
  return { success: true, message: '' };
}

// 3. 낙찰 처리 Action
export async function awardAndContractAction(postId: any, bidId: any, password: any) {
  return { 
    success: true, 
    message: '',
    contract: {} 
  };
}