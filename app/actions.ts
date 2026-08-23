'use server';

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // 서버 전용 관리자 키
);

// 1. 입찰서 제출
export async function submitBidAction(postId: string, bidderName: string, unitPrice: number) {
  const { error } = await supabase
    .from('bids')
    .insert([{ post_id: postId, bidder_name: bidderName, unit_price: unitPrice }]);

  if (error) return { success: false, message: error.message };
  return { success: true };
}

// 2. 게시자 비밀번호 검증 후 낙찰 & 계약서 자동 생성
export async function awardAndContractAction(postId: string, bidId: string, password: string) {
  // 게시물 검증
  const { data: post } = await supabase
    .from('posts')
    .select('password_hash, status')
    .eq('id', postId)
    .single();

  if (!post || post.status !== 'active') {
    return { success: false, message: '진행 중인 경매가 아닙니다.' };
  }

  export async function createAuctionAction(formData: FormData) {
  // DB 저장 logic (Supabase 연동 코드 위치)
  const title = formData.get('title');
  const content = formData.get('content');

  // 필요 시 Supabase insert 로직 작성
  console.log('Post created:', { title, content });
  return { success: true };
}

  // 비밀번호 비교
  const isValid = await bcrypt.compare(password, post.password_hash);
  if (!isValid) {
    return { success: false, message: '관리 비밀번호가 일치하지 않습니다.' };
  }

  // 선택한 입찰 정보 가져오기
  const { data: bid } = await supabase
    .from('bids')
    .select('*')
    .eq('id', bidId)
    .single();

  if (!bid) return { success: false, message: '입찰 정보를 찾을 수 없습니다.' };

  // 게시물 상태를 closed로 변경
  await supabase.from('posts').update({ status: 'closed' }).eq('id', postId);

  // 계약 기간 설정 (오늘부터 1년)
  const startDate = new Date().toISOString().split('T')[0];
  const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // 계약서 DB 생성
  const { data: contract, error: contractErr } = await supabase
    .from('contracts')
    .insert([{
      post_id: postId,
      bid_id: bidId,
      supplier_name: bid.bidder_name,
      unit_price: bid.unit_price,
      penalty_amount: 100000,
      start_date: startDate,
      end_date: endDate
    }])
    .select()
    .single();

  if (contractErr) return { success: false, message: contractErr.message };

  return { success: true, contract };
}