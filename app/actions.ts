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

// 3. 낙찰 처리 Action (비밀번호 검증 제외)
export async function awardAndContractAction(postId: any, bidId: any, password: any) {
  try {
    // 입찰 내역 조회
    const { data: bid, error: bidErr } = await supabase
      .from('bids')
      .select('*')
      .eq('id', bidId)
      .single();

    if (bidErr || !bid) return { success: false, message: '선택한 응찰 내역을 찾을 수 없습니다.' };

    // posts 상태를 closed(낙찰 완료)로 변경
    await supabase.from('posts').update({ status: 'closed' }).eq('id', postId);

    // 계약서 생성
    const { data: contract, error: contractErr } = await supabase
      .from('contracts')
      .insert([
        {
          post_id: postId,
          supplier_name: bid.bidder_name,
          unit_price: bid.unit_price,
          start_date: new Date().toISOString().split('T')[0],
          end_date: '2026-12-31',
          penalty_amount: 10000000
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