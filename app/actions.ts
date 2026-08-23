'use server';

import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 설정 (환경 변수 필요 시 설정)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function createAuctionAction(form: any) {
  // DB 저장 로직 위치
  console.log('Auction created:', form);
  
  return { 
    success: true, 
    postId: form.id || '1',
    message: '' // 👈 message 속성 추가
  };
}

// 2. 입찰 Action
export async function submitBid(formData: FormData) {
  return { success: true };
}

// 3. 낙찰 Action
export async function selectWinningBid(formData: FormData) {
  return { success: true };
}