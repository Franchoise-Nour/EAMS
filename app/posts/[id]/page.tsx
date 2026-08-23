'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { submitBidAction, awardAndContractAction } from '../../actions';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function PostDetailPage({ params }: { params: { id: string } }) {
  const [post, setPost] = useState<any>(null);
  const [allPosts, setAllPosts] = useState<any[]>([]); // 사이드바용 공개 입찰 공고 목록
  const [bids, setBids] = useState<any[]>([]);
  const [lowestPrice, setLowestPrice] = useState<number | null>(null);
  const [contract, setContract] = useState<any>(null);

  const [bidderName, setBidderName] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadInitialData();
    fetchAllPosts();

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

  // 사이드바용 전체 공개 입찰 공고 가져오기
  async function fetchAllPosts() {
    const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
    if (data) setAllPosts(data);
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

  // 비밀번호 없이 즉시 낙찰 처리
  const handleAwardDirect = async (bid: any) => {
    if (!confirm(`'${bid.bidder_name}'님 (${Number(bid.unit_price).toLocaleString()}원) 입찰건으로 즉시 낙찰 결정하시겠습니까?`)) {
      return;
    }

    setIsSubmitting(true);
    // 패스워드 인자 자리에 빈 값을 넘깁니다.
    const res = await awardAndContractAction(params.id, bid.id, '');
    setIsSubmitting(false);

    if (res.success) {
      alert('낙찰 결정 및 전자계약서가 즉시 발급되었습니다.');
      setContract(res.contract);
      setPost((prev: any) => ({ ...prev, status: 'closed' }));
      fetchAllPosts();
    } else {
      alert('낙찰 실패: ' + res.message);
    }
  };

  if (!post) return <div style={{ padding: '20px', fontFamily: 'Malgun Gothic' }}>데이터를 불러오는 중입니다...</div>;

  const isActive = post.status === 'active';

  return (
    <div style={{ fontFamily: 'Malgun Gothic, sans-serif', fontSize: '12px', backgroundColor: '#f4f6f9', minHeight: '100vh', paddingBottom: '40px' }}>
      {/* 헤더 */}
      <header style={{ backgroundColor: '#1a3863', color: '#fff', padding: '12px 20px', borderBottom: '3px solid #0b2242', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>전자입찰 및 계약관리시스템</h1>
        <span style={{ fontSize: '11px', color: '#b0c4de' }}>보안등급: HIGH-TRUST-SSL</span>
      </header>

      {/* 2단 메인 레이아웃 */}
      <div style={{ maxWidth: '1200px', margin: '20px auto', padding: '0 15px', display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' }}>
        
        {/* [좌측 본문] 공고 상세 내용 & 응찰 현황 & 계약서 */}
        <div>
          {/* 공고 제목 */}
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1a3863', borderLeft: '4px solid #1a3863', paddingLeft: '8px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>[입찰 공고] {post.title}</span>
            <span style={{ backgroundColor: isActive ? '#28a745' : '#6c757d', color: '#fff', padding: '3px 8px', fontSize: '11px' }}>
              {isActive ? '입찰 진행 중' : '낙찰 완료'}
            </span>
          </div>

          {/* 공고 물품 상세 */}
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

          {/* 전자 응찰서 제출 */}
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

          {/* 본문 응찰 내역 표 (바로 낙찰 결정) */}
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1a3863', borderLeft: '4px solid #1a3863', paddingLeft: '8px', marginBottom: '10px' }}>현재 공고 응찰 현황</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: '2px solid #555', backgroundColor: '#fff', marginBottom: '30px' }}>
            <thead>
              <tr style={{ backgroundColor: '#e9ecef' }}>
                <th style={gridThStyle}>공급 신청자</th>
                <th style={gridThStyle}>제시 공급 단가</th>
                <th style={gridThStyle}>접수 일시</th>
                <th style={gridThStyle}>낙찰 실행</th>
              </tr>
            </thead>
            <tbody>
              {bids.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ ...tdStyle, textAlign: 'center', padding: '15px', color: '#777' }}>등록된 응찰 내역이 없습니다.</td>
                </tr>
              ) : (
                bids.map((b) => (
                  <tr key={b.id} style={{ textAlign: 'center' }}>
                    <td style={tdStyle}>{b.bidder_name}</td>
                    <td style={{ ...tdStyle, fontWeight: 'bold', color: '#d9534f' }}>{Number(b.unit_price).toLocaleString()} 원</td>
                    <td style={tdStyle}>{new Date(b.created_at).toLocaleString('ko-KR')}</td>
                    <td style={tdStyle}>
                      {isActive ? (
                        <button onClick={() => handleAwardDirect(b)} disabled={isSubmitting} style={btnActionStyle}>
                          바로 낙찰
                        </button>
                      ) : (
                        <span style={{ color: '#888' }}>마감됨</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* 전자 계약서 */}
          {contract && (
            <div style={{ backgroundColor: '#fff', border: '2px solid #1a3863', padding: '25px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <h2 style={{ textAlign: 'center', fontSize: '18px', color: '#1a3863', textDecoration: 'underline', marginBottom: '20px' }}>
                {post.item_name} 지속 공급 계약서
              </h2>
              <p style={{ lineHeight: '1.6', marginBottom: '12px' }}>
                수요자(이하 "발주자")와 공급자 <strong>{contract.supplier_name}</strong>(이하 "공급자")는 다음과 같이 물품 공급 계약을 체결한다.
              </p>
              <div style={{ marginBottom: '12px' }}>
                <strong>제1조 (공급 물품 및 단가)</strong><br />
                1. 물품명: {post.item_name} ({post.spec})<br />
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
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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

        {/* [우측 사이드바] 공개 입찰 공고 목록 */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px', height: 'fit-content', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ backgroundColor: '#1a3863', color: '#fff', padding: '10px 12px', fontWeight: 'bold', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>공개 입찰 공고 목록</span>
            <Link href="/new" style={{ color: '#fff', fontSize: '11px', textDecoration: 'none', backgroundColor: '#28a745', padding: '2px 6px', borderRadius: '2px' }}>+ 등록</Link>
          </div>

          <div style={{ padding: '10px', maxHeight: '600px', overflowY: 'auto' }}>
            {allPosts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#777' }}>등록된 공고가 없습니다.</div>
            ) : (
              allPosts.map((p) => {
                const isCurrent = p.id === params.id;
                return (
                  <div key={p.id} style={{ borderBottom: '1px solid #eee', padding: '8px 0', backgroundColor: isCurrent ? '#f0f4f8' : 'transparent', paddingLeft: isCurrent ? '5px' : '0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '10px', backgroundColor: p.status === 'active' ? '#28a745' : '#6c757d', color: '#fff', padding: '1px 4px', borderRadius: '2px' }}>
                        {p.status === 'active' ? '진행중' : '완료'}
                      </span>
                      <span style={{ fontSize: '11px', color: '#888' }}>{new Date(p.created_at).toLocaleDateString('ko-KR')}</span>
                    </div>
                    <Link href={`/posts/${p.id}`} style={{ fontWeight: isCurrent ? 'bold' : 'normal', color: '#1a3863', textDecoration: 'none', fontSize: '12px' }}>
                      {p.title}
                    </Link>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

const thStyle = { backgroundColor: '#f0f4f8', border: '1px solid #d0d7de', padding: '8px', textAlign: 'left' as const, width: '22%' };
const tdStyle = { border: '1px solid #d0d7de', padding: '8px', backgroundColor: '#fff' };
const gridThStyle = { border: '1px solid #ccc', padding: '8px', textAlign: 'center' as const };
const inputStyle = { border: '1px solid #abb8c3', padding: '6px', fontSize: '12px', width: '180px' };
const btnCourtStyle = { backgroundColor: '#1a3863', color: '#fff', border: 'none', padding: '6px 12px', cursor: 'pointer', fontWeight: 'bold' as const };
const btnActionStyle = { backgroundColor: '#d9534f', color: '#fff', border: 'none', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' as const };