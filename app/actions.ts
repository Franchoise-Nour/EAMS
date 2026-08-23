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
          delivery_place: form.deliveryPlace || '',
          end_date: form.endDate || '',
          password_hash: hashedPassword,
          status: 'active' // 👈 'open' 대신 'active'로 통일
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase Error:', error);
      return { success: false, message: error.message };
    }

    return { success: true, postId: data.id, message: '등록 성공' };
  } catch (err: any) {
    console.error('Action Error:', err);
    return { success: false, message: err.message || '서버 오류 발생' };
  }
}

// 2. 입찰 제출 Action
export async function submitBidAction(postId: any, bidderName: any, unitPrice: any) {
  try {
    const { data, error } = await supabase
      .from('bids')
      .insert([
        {
          post_id: postId,
          bidder_name: bidderName,
          unit_price: unitPrice
        }
      ])
      .select()
      .single();

    if (error) return { success: false, message: error.message };
    return { success: true, message: '응찰 성공', bid: data };
  } catch (err: any) {
    return { success: false, message: err.message || '서버 오류 발생' };
  }
}

// 비밀번호 확인 및 계약 조건/특약 편집 후 낙찰 실행
export async function awardAndContractAction(
  postId: string,
  bidId: string,
  passwordInput: string,
  contractDetails: {
    startDate: string;
    endDate: string;
    penaltyAmount: number;
    delayPenaltyRate: string;
    warrantyPeriod: string;
    specialTerms: string;
  }
) {
  try {
    // 1. 공고 조회 (비밀번호 검증용)
    const { data: post, error: postErr } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (postErr || !post) return { success: false, message: '공고 정보를 찾을 수 없습니다.' };

    // 공고 작성 시 설정된 비밀번호 검증 (post.password 컬럼이 있는 경우 검사, 없으면 패스)
    if (post.password && post.password !== passwordInput) {
      return { success: false, message: '비밀번호가 일치하지 않습니다.' };
    }

    // 2. 입찰 내역 조회
    const { data: bid, error: bidErr } = await supabase
      .from('bids')
      .select('*')
      .eq('id', bidId)
      .single();

    if (bidErr || !bid) return { success: false, message: '선택한 응찰 내역을 찾을 수 없습니다.' };

    // 3. 공고 상태 '낙찰 완료'로 변경
    await supabase.from('posts').update({ status: 'closed' }).eq('id', postId);

    // 4. 입력된 특약/계약 조건 반영하여 계약서 등록
    const { data: contract, error: contractErr } = await supabase
      .from('contracts')
      .insert([
        {
          post_id: postId,
          supplier_name: bid.bidder_name,
          unit_price: bid.unit_price,
          start_date: contractDetails.startDate,
          end_date: contractDetails.endDate,
          penalty_amount: contractDetails.penaltyAmount,
          delay_penalty_rate: contractDetails.delayPenaltyRate,
          warranty_period: contractDetails.warrantyPeriod,
          special_terms: contractDetails.specialTerms,
        }
      ])
      .select()
      .single();

    if (contractErr) return { success: false, message: contractErr.message };

    return { success: true, message: '낙찰 처리 완료', contract };
  } catch (err: any) {
    return { success: false, message: err.message || '서버 오류 발생' };
  }
}