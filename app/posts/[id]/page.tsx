'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { submitBidAction, awardAndContractAction } from '../../actions';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function PostDetailPage({ params }: { params: { id: string } }) {
  const [post, setPost] = useState<any>(null);
  const [bids, setBids] = useState<any[]>([]);
  const [lowestPrice, setLowestPrice] = useState<number | null>(null);
  const [contract, setContract] = useState<any>(null);

  const [bidderName, setBidderName] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBid, setSelectedBid] = useState<any>(null);
  const [inputPassword, setInputPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadInitialData();

    const channel = supabase
      .channel(`realtime-bids-${params.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bids', filter: `post_id=eq.${params.id}` },
        (payload) => {
          const newBid = payload.new;
          setBids((prev) => [newBid, ...prev]);
          setLowestPrice((prev) => (prev === null ? newBid.unit_price : Math.min(prev, newBid.unit_price)));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [params.id]);

  async function loadInitialData() {
    const { data: postData } = await supabase.from('posts').select('*').eq('id', params.id).single();
    const { data: bidData } = await supabase.from('bids').select('*').eq('post_id', params.id).order('unit_price', { ascending: true });
    const { data: contractData } = await supabase.from('contracts').select('*').eq('post_id', params.id).single();

    setPost(postData);
    if (bidData && bidData.length > 0) {
      setBids(bidData);
      setLowestPrice(bidData[0].unit_price);
    }
    if (contractData) {
      setContract(contractData);
    }
  }

  const handleBidSubmit = async () => {
    if (!bidderName || !unitPrice) return alert('성명과 단가를 입력하세요.');
    setIsSubmitting(true);
    const res = await submitBidAction(params.id, bidderName, Number(unitPrice));
    setIsSubmitting(false);

    if (res.success) {
      setBidderName('');
      setUnitPrice('');
      alert('응찰서가 정상 제출되었습니다.');
      loadInitialData();
    } else {
      alert('오류: ' + res.message);
    }
  };

  const handleAward = async () => {
    if (!bids || bids.length === 0) {
      return alert('현재 등록된 응찰 내역이 없습니다.');
    }
    if (!selectedBid) {
      return alert('낙찰시킬 응찰 항목을 선택해주세요.');
    }
    if (!inputPassword) return alert('게시자 비밀번호를 입력하세요.');

    setIsSubmitting(true);
    const res = await awardAndContractAction(params.id, selectedBid.id, inputPassword);
    setIsSubmitting(false);

    if (res.success) {
      alert('낙찰 처리 및 전자계약서가 정상적으로 발급되었습니다.');
      setIsModalOpen(false);
      setInputPassword('');
      setContract(res.contract);
      setPost((prev: any) => ({ ...prev, status: 'closed' }));
    } else {
      alert('낙찰 실패: ' + res.message);
    }
  };

  if (!post) return <div style={{ padding: '20px', fontFamily: 'Malgun Gothic' }}>데이터를 불러오는 중입니다...</div>;

  const isActive = post.status === 'active';

  return (
    <div style={{ fontFamily: 'Malgun Gothic, sans-serif', fontSize: '12px', backgroundColor: '#f4f6f9', minHeight: '100vh', paddingBottom: '40px' }}>
      {/* 상단 헤더 */}
      <header style={{ backgroundColor: '#1a3863', color: '#fff', padding: '12px 20px', borderBottom: '3px solid #0b2242', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>전자입찰 및 계약관리시스템</h1>
        <span style={{ fontSize: '11px', color: '#b0c4de' }}>보안등급: HIGH-TRUST-SSL</span>
      </header>

      {/* 메인 콘텐트 (2단 분할 레이아웃) */}
      <div style={{ maxWidth: '1200px', margin: '20px auto', padding: '0 15px', display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
        
        {/* [좌측 본문] 공고 내용, 응찰서 제출, 계약서 */}
        <div>
          {/* 공고 제목 및 상태 */}
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1a3863', borderLeft: '4px solid #1a3863', paddingLeft: '8px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>[입찰 공고] {post.title}</span>
            <span style={{ backgroundColor: isActive ? '#28a745' : '#6c757d', color: '#fff', padding: '3px 8px', fontSize: '11px', borderRadius: '2px' }}>
              {isActive ? '입찰 진행 중' : '낙찰 및 계약 완료'}
            </span>
          </div>

          {/* 공고 물품 세부 정보 */}
          <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: '2px solid #1a3863', backgroundColor: '#fff', marginBottom: '20px' }}>
            <tbody>
              <tr>
                <th style={thStyle}>입찰 물품명</th><td style={tdStyle}>{post.item_name}</td>
                <th style={thStyle}>제조 업체</th><td style={tdStyle}>{post.manufacturer}</td>
              </tr>
              <tr>
                <th style={thStyle}>사양 및 제원</th><td style={tdStyle}>{post.spec}</td>
                <th style={thStyle}>공급 예상량</th><td style={tdStyle}>{post.monthly_volume}</td>
              </tr>
              <tr>
                <th style={thStyle}>현재 최저 입찰 단가</th>
                <td colSpan={3} style={tdStyle}>
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#d9534f', fontFamily: 'monospace' }}>
                    {lowestPrice ? `${Number(lowestPrice).toLocaleString()} 원 / 개` : '응찰 내역 없음'}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* 전자 응찰서 제출 폼 (입찰 진행 중일 때만 노출) */}
          {isActive && (
            <>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1a3863', borderLeft: '4px solid #1a3863', paddingLeft: '8px', marginBottom: '10px' }}>전자 응찰서 제출</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: '2px solid #555', backgroundColor: '#fff', marginBottom: '20px' }}>
                <tbody>
                  <tr>
                    <th style={thStyle}>공급 업체/유저명</th>
                    <td style={tdStyle}><input type="text" value={bidderName} onChange={(e) => setBidderName(e.target.value)} style={inputStyle} placeholder="업체명 입력" /></td>
                  </tr>
                  <tr>
                    <th style={thStyle}>제시 공급 단가(개당)</th>
                    <td style={tdStyle}>
                      <input type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} style={inputStyle} placeholder="단가 입력" /> 원
                      <button onClick={handleBidSubmit} disabled={isSubmitting} style={{ ...btnCourtStyle, marginLeft: '10px' }}>
                        {isSubmitting ? '제출 중...' : '응찰서 제출'}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </>
          )}

          {/* 발급된 전자 계약서 (낙찰 완료 시 노출) */}
          {contract && (
            <div style={{ backgroundColor: '#fff', border: '2px solid #1a3863', padding: '25px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <h2 style={{ textAlign: 'center', fontSize: '18px', color: '#1a3863', textDecoration: 'underline', marginBottom: '20px' }}>
                {post.item_name} 지속 공급 계약서
              </h2>
              <p style={{ lineHeight: '1.6', marginBottom: '12px' }}>
                수요자(이하 "발주자")와 공급자 <strong>{contract.supplier_name}</strong>(이하 "공급자")는 다음과 같이 물품 공급 계약을 체결한다.
              </p>
              <div style={{ marginBottom: '12px', lineHeight: '1.5' }}>
                <strong>제1조 (공급 물품 및 단가)</strong><br />
                1. 물품명: {post.item_name} ({post.spec})<br />
                2. 확정 공급 단가: <strong>개당 {Number(contract.unit_price).toLocaleString()}원 (VAT 포함)</strong>
              </div>
              <div style={{ marginBottom: '12px', lineHeight: '1.5' }}>
                <strong>제2조 (계약 기간)</strong><br />
                본 계약의 기간은 <strong>{contract.start_date} ~ {contract.end_date}</strong> 까지로 한다.
              </div>
              <div style={{ marginBottom: '20px', lineHeight: '1.5' }}>
                <strong>제3조 (위약금 조항)</strong><br />
                귀책사유로 계약 해지 시, 귀책 당사자는 상대방에게 <strong>위약금 {Number(contract.penalty_amount).toLocaleString()}원</strong>을 지급한다.
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
                <tbody>
                  <tr>
                    <td style={{ border: '1px solid #aaa', padding: '10px', width: '50%', backgroundColor: '#fdfdfd' }}>
                      <strong>[발주자 (게시자)]</strong><br />
                      전자서명: <span style={{ color: 'green', fontWeight: 'bold' }}>[인증완료]</span>
                    </td>
                    <td style={{ border: '1px solid #aaa', padding: '10px', width: '50%', backgroundColor: '#fdfdfd' }}>
                      <strong>[공급자 (낙찰자)]</strong><br />
                      성명/상호: {contract.supplier_name}<br />
                      전자서명: <span style={{ color: 'green', fontWeight: 'bold' }}>[인증완료]</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* [우측 사이드바] 실시간 응찰 목록 및 낙찰 결정 */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px', height: 'fit-content', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ backgroundColor: '#1a3863', color: '#fff', padding: '10px 12px', fontWeight: 'bold', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>실시간 응찰 현황</span>
            <span style={{ fontSize: '11px', backgroundColor: '#0b2242', padding: '2px 6px', borderRadius: '10px' }}>총 {bids.length}건</span>
          </div>

          <div style={{ padding: '10px', maxHeight: '550px', overflowY: 'auto' }}>
            {bids.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: '#777' }}>등록된 응찰 내역이 없습니다.</div>
            ) : (
              bids.map((b, index) => (
                <div key={b.id} style={{ borderBottom: '1px solid #eee', padding: '10px 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#333' }}>
                      {index === 0 && <span style={{ color: '#d9534f', marginRight: '4px' }}>[최저가]</span>}
                      {b.bidder_name}
                    </span>
                    <span style={{ fontWeight: 'bold', color: '#d9534f', fontSize: '13px', fontFamily: 'monospace' }}>
                      {Number(b.unit_price).toLocaleString()}원
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#888' }}>
                    <span>{new Date(b.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
                    {isActive && (
                      <button 
                        onClick={() => { setSelectedBid(b); setIsModalOpen(true); }} 
                        style={btnActionStyle}
                      >
                        낙찰 선택
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* 비밀번호 검증 모달 */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', border: '2px solid #1a3863', width: '360px', padding: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
            <h3 style={{ background: '#1a3863', color: '#fff', padding: '8px 10px', margin: '-15px -15px 15px -15px', fontSize: '13px' }}>
              게시자 비밀번호 검증
            </h3>
            <p style={{ marginBottom: '12px', lineHeight: '1.4' }}>
              <strong>{selectedBid?.bidder_name}</strong>님의 <strong>{Number(selectedBid?.unit_price).toLocaleString()}원</strong> 응찰건을 낙찰 처리하시겠습니까?
            </p>
            <input 
              type="password" 
              placeholder="글 관리 비밀번호 입력" 
              value={inputPassword} 
              onChange={(e) => setInputPassword(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleAward()}
              style={{ ...inputStyle, width: '100%', marginBottom: '15px', padding: '8px' }} 
              autoFocus
            />
            <div style={{ textAlign: 'right' }}>
              <button onClick={handleAward} disabled={isSubmitting} style={btnCourtStyle}>
                {isSubmitting ? '처리 중...' : '확인 및 낙찰 체결'}
              </button>
              <button onClick={() => { setIsModalOpen(false); setInputPassword(''); }} style={{ ...btnCourtStyle, backgroundColor: '#7f8c8d', marginLeft: '5px' }}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle = { backgroundColor: '#f0f4f8', border: '1px solid #d0d7de', padding: '8px', textAlign: 'left' as const, width: '22%' };
const tdStyle = { border: '1px solid #d0d7de', padding: '8px', backgroundColor: '#fff' };
const inputStyle = { border: '1px solid #abb8c3', padding: '6px', fontSize: '12px', width: '200px' };
const btnCourtStyle = { backgroundColor: '#1a3863', color: '#fff', border: 'none', padding: '6px 12px', cursor: 'pointer', fontWeight: 'bold' as const };
const btnActionStyle = { backgroundColor: '#28a745', color: '#fff', border: 'none', padding: '3px 8px', fontSize: '11px', cursor: 'pointer', borderRadius: '2px', fontWeight: 'bold' as const };