'use server';

import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 설정 (환경 변수 필요 시 설정)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function createAuctionAction(form: any) {
  try {
    // 1. 비밀번호 암호화
    const hashedPassword = await bcrypt.hash(form.password, 10);

    // 2. Supabase 'posts' 테이블에 데이터 저장
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
          password: hashedPassword,
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

export async function submitBidAction(postId: any, bidderName: any, unitPrice: any) {
  // 입찰 저장 로직
  console.log('Bid submitted:', { postId, bidderName, unitPrice });
  return { success: true, message: '' };
}

// 3. 낙찰 Action
export async function selectWinningBid(formData: FormData) {
  return { success: true };
}

export async function awardAndContractAction(postId: any, bidId: any, password: any) {
  // 낙찰 및 계약 처리 로직
  console.log('Award and contract:', { postId, bidId, password });

  return { 
    success: true, 
    message: '',
    contract: {} // 👈 contract 속성 추가 (필요에 따라 객체/문자열 형태로 지정)
  };
}