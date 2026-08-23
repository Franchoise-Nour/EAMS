'use server';

import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 설정 (환경 변수 필요 시 설정)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// 1. 경매/포스트 생성 Action
export async function createAuctionAction(formData: FormData) {
  const title = formData.get('title');
  const content = formData.get('content');

  // 필요한 Supabase 저장 로직
  console.log('Post created:', { title, content });
  return { success: true };
}

// 2. 입찰 Action
export async function submitBid(formData: FormData) {
  return { success: true };
}

// 3. 낙찰 Action
export async function selectWinningBid(formData: FormData) {
  return { success: true };
}