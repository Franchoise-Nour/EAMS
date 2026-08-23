'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { submitBidAction, selectWinningBid } from '../../actions';

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
    const res = await submitBidAction(params.id, bidderName, Number(unitPrice));
    if (res.success) {
      setBidderName('');
      setUnitPrice('');
      alert('응찰서가 정상 제출되었습니다.');
    } else {
      alert('오류: ' + res.message);
    }
  };

  const handleAward = async () => {
    if (!inputPassword) return alert('비밀번호를 입력하세요.');
    const res = await awardAndContractAction(params.id, selectedBid.id, inputPassword);

    if (res.success) {
      alert('낙찰 처리 및 전자계약서가 발급되었습니다.');
      setIsModalOpen(false);
      setContract(res.contract);
      setPost((prev: any) => ({ ...prev, status: 'closed' }));
    } else {
      alert(res.message);
    }
  };

  if (!post) return <div style={{ padding: '20px', fontFamily: 'Malgun Gothic' }}>데이터를 불러오는 중입니다...</div>;

  return (
    <div style={{ fontFamily: 'Malgun Gothic, sans-serif', fontSize: '12px', backgroundColor: '#f4f6f9', minHeight: '100vh', paddingBottom: '40px' }}>
      <header style={{ backgroundColor: '#1a3863', color: '#fff', padding: '12px 20px', borderBottom: '3px solid #0b2242', display: 'flex', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>대한민국 법원 전자소송 연계 - 전자입찰 및 계약관리시스템</h1>
        <span style={{ fontSize: '11px', color: '#b0c4de' }}>보안등급: HIGH-TRUST-SSL</span>
      </header>

      <div style={{ maxWidth: '1000px', margin: '20px auto', padding: '0 15px' }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1a3863', borderLeft: '4px solid #1a3863', paddingLeft: '8px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
          <span>[입찰 공고] {post.title}</span>
          <span style={{ backgroundColor: post.status === 'active' ? '#28a745' : '#6c757d', color: '#fff', padding: '2px 6px', fontSize: '11px' }}>
            {post.status === 'active' ? '입찰 진행 중' : '낙찰 및 계약 완료'}
          </span>
        </div>

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

        {post.status === 'active' && (
          <>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1a3863', borderLeft: '4px solid #1a3863', paddingLeft: '8px', marginBottom: '10px' }}>전자 응찰서 제출</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: '2px solid #555', backgroundColor: '#fff', marginBottom: '20px' }}>
              <tbody>
                <tr>
                  <th style={thStyle}>공급 업체/유저명</th>
                  <td style={tdStyle}><input type="text" value={bidderName} onChange={(e) => setBidderName(e.target.value)} style={inputStyle} /></td>
                  <th style={thStyle}>제시 공급 단가(개당)</th>
                  <td style={tdStyle}>
                    <input type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} style={inputStyle} /> 원
                    <button onClick={handleBidSubmit} style={btnCourtStyle}>응찰서 제출</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </>
        )}

        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1a3863', borderLeft: '4px solid #1a3863', paddingLeft: '8px', marginBottom: '10px' }}>응찰 현황 및 낙찰 결정</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: '2px solid #555', backgroundColor: '#fff', marginBottom: '30px' }}>
          <thead>
            <tr style={{ backgroundColor: '#e9ecef' }}>
              <th style={gridThStyle}>공급 신청자</th>
              <th style={gridThStyle}>제시 공급 단가</th>
              <th style={gridThStyle}>접수 일시</th>
              <th style={gridThStyle}>게시자 권한</th>
            </tr>
          </thead>
          <tbody>
            {bids.map((b) => (
              <tr key={b.id} style={{ textAlign: 'center' }}>
                <td style={tdStyle}>{b.bidder_name}</td>
                <td style={{ ...tdStyle, fontWeight: 'bold', color: '#d9534f' }}>{Number(b.unit_price).toLocaleString()} 원</td>
                <td style={tdStyle}>{new Date(b.created_at).toLocaleString()}</td>
                <td style={tdStyle}>
                  {post.status === 'active' && (
                    <button onClick={() => { setSelectedBid(b); setIsModalOpen(true); }} style={btnActionStyle}>
                      낙찰 및 계약서 작성
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {contract && (
          <div style={{ backgroundColor: '#fff', border: '2px solid #1a3863', padding: '30px', boxShadow: '0 0 10px rgba(0,0,0,0.1)' }}>
            <h2 style={{ textAlign: 'center', fontSize: '18px', color: '#1a3863', textDecoration: 'underline', marginBottom: '20px' }}>데미소다 물품 지속 공급 계약서</h2>
            <p style={{ lineHeight: '1.6', marginBottom: '12px' }}>
              수요자(이하 "발주자")와 공급자 <strong>{contract.supplier_name}</strong>(이하 "공급자")는 다음과 같이 <strong>데미소다 물품 공급 계약</strong>을 체결한다.
            </p>
            <div style={{ marginBottom: '12px' }}>
              <strong>제1조 (공급 물품 및 단가)</strong><br />
              1. 물품명: 데미소다 (알루미늄 캔 250ml)<br />
              2. 확정 공급 단가: <strong>개당 {Number(contract.unit_price).toLocaleString()}원 (VAT 포함)</strong>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <strong>제2조 (계약 기간)</strong><br />
              본 계약의 기간은 <strong>{contract.start_date} ~ {contract.end_date}</strong> 까지로 한다.
            </div>
            <div style={{ marginBottom: '20px' }}>
              <strong>제3조 (위약금 조항)</strong><br />
              귀책사유로 계약 해지 시, 귀책 당사자는 상대방에게 <strong>위약금 {Number(contract.penalty_amount).toLocaleString()}원</strong>을 지급한다.
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #aaa', padding: '10px', width: '50%' }}>
                    <strong>[발주자 (게시자)]</strong><br />
                    전자서명: <span style={{ color: 'green', fontWeight: 'bold' }}>[인증완료]</span>
                  </td>
                  <td style={{ border: '1px solid #aaa', padding: '10px', width: '50%' }}>
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

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: '#fff', border: '2px solid #1a3863', width: '360px', padding: '15px' }}>
            <h3 style={{ background: '#1a3863', color: '#fff', padding: '5px', margin: '-15px -15px 15px -15px', fontSize: '13px' }}>게시자 비밀번호 검증</h3>
            <p style={{ marginBottom: '10px' }}><strong>{selectedBid?.bidder_name}</strong> ({Number(selectedBid?.unit_price).toLocaleString()}원) 입찰건으로 낙찰합니까?</p>
            <input type="password" placeholder="비밀번호 입력" value={inputPassword} onChange={(e) => setInputPassword(e.target.value)} style={{ ...inputStyle, width: '100%', marginBottom: '15px' }} />
            <div style={{ textAlign: 'right' }}>
              <button onClick={handleAward} style={btnCourtStyle}>낙찰 및 계약서 체결</button>
              <button onClick={() => setIsModalOpen(false)} style={{ ...btnCourtStyle, backgroundColor: '#7f8c8d' }}>취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle = { backgroundColor: '#f0f4f8', border: '1px solid #d0d7de', padding: '8px', textAlign: 'left' as const, width: '20%' };
const tdStyle = { border: '1px solid #d0d7de', padding: '8px', backgroundColor: '#fff' };
const gridThStyle = { border: '1px solid #ccc', padding: '8px', textAlign: 'center' as const };
const inputStyle = { border: '1px solid #abb8c3', padding: '5px', fontSize: '12px' };
const btnCourtStyle = { backgroundColor: '#34495e', color: '#fff', border: 'none', padding: '5px 10px', marginLeft: '5px', cursor: 'pointer', fontWeight: 'bold' as const };
const btnActionStyle = { backgroundColor: '#0056b3', color: '#fff', border: 'none', padding: '3px 8px', fontSize: '11px', cursor: 'pointer' };