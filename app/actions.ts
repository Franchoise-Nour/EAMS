'use server';

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 1. 공고 생성 (초기 데이터 등록용)
export async function createAuctionAction(formData: {
  title: string;
  itemName: string;
  manufacturer: string;
  spec: string;
  monthlyVolume: string;
  password: string;
}) {
  const passwordHash = await bcrypt.hash(formData.password, 10);

  const { data, error } = await supabase
    .from('posts')
    .insert([
      {
        title: formData.title,
        item_name: formData.itemName,
        manufacturer: formData.manufacturer,
        spec: formData.spec,
        monthly_volume: formData.monthlyVolume,
        password_hash: passwordHash,
        status: 'active',
      },
    ])
    .select()
    .single();

  if (error) return { success: false, message: error.message };
  return { success: true, postId: data.id };
}

// 2. 입찰서 제출
export async function submitBidAction(postId: string, bidderName: string, unitPrice: number) {
  const { error } = await supabase
    .from('bids')
    .insert([{ post_id: postId, bidder_name: bidderName, unit_price: unitPrice }]);

  if (error) return { success: false, message: error.message };
  return { success: true };
}

// 3. 낙찰 승인 및 계약서 자동 생성
export async function awardAndContractAction(postId: string, bidId: string, password: string) {
  const { data: post } = await supabase
    .from('posts')
    .select('password_hash, status')
    .eq('id', postId)
    .single();

  if (!post || post.status !== 'active') {
    return { success: false, message: '진행 중인 경매가 아닙니다.' };
  }

  const isValid = await bcrypt.compare(password, post.password_hash);
  if (!isValid) {
    return { success: false, message: '관리 비밀번호가 일치하지 않습니다.' };
  }

  const { data: bid } = await supabase
    .from('bids')
    .select('*')
    .eq('id', bidId)
    .single();

  if (!bid) return { success: false, message: '입찰 정보를 찾을 수 없습니다.' };

  await supabase.from('posts').update({ status: 'closed' }).eq('id', postId);

  const startDate = new Date().toISOString().split('T')[0];
  const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data: contract, error: contractErr } = await supabase
    .from('contracts')
    .insert([
      {
        post_id: postId,
        bid_id: bidId,
        supplier_name: bid.bidder_name,
        unit_price: bid.unit_price,
        penalty_amount: 100000,
        start_date: startDate,
        end_date: endDate,
      },
    ])
    .select()
    .single();

  if (contractErr) return { success: false, message: contractErr.message };

  return { success: true, contract };
}