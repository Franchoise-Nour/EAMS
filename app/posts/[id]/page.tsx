'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { submitBidAction, awardAndContractAction } from '../../actions';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function PostDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [post, setPost] = useState<any>(null);
  const [allPosts, setAllPosts] = useState<any[]>([]);
  const [bids, setBids] = useState<any[]>([]);
  const [lowestPrice, setLowestPrice] = useState<number | null>(null);
  const [contract, setContract] = useState<any>(null);

  // 응찰 입력 State
  const [bidderName, setBidderName] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 낙찰 및 계약 편집 모달 State
  const [selectedBid, setSelectedBid] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState('');

  // 계약서 편집 항목 State
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('2026-12-31');
  const [penaltyAmount, setPenaltyAmount] = useState('10000000');
  const [delayPenaltyRate, setDelayPenaltyRate] = useState('일 0.1%');
  const [warrantyPeriod, setWarrantyPeriod] = useState('검수 완료일로부터 1년');
  const [specialTerms, setSpecialTerms] = useState(
    '1. 모든 납품 물품은 발주자의 품질 검수 기준을 충족해야 한다.\n2. 분쟁 발생 시 발주자 관할 법원을 합의 관할로 한다.'
  );

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

  const openAwardModal = (bid: any) => {
    setSelectedBid(bid);
    setPassword('');
    setShowModal(true);
  };

  const handleAwardAndContract = async () => {
    if (!password) return alert('계약 승인을 위한 비밀번호를 입력하세요.');
    if (!startDate || !endDate) return alert('계약 기간을 입력하세요.');

    setIsSubmitting(true);
    const res = await awardAndContractAction(params.id, selectedBid.id, password, {
      startDate,
      endDate,
      penaltyAmount: Number(penaltyAmount),
      delayPenaltyRate,
      warrantyPeriod,
      specialTerms,
    });
    setIsSubmitting(false);

    if (res.success) {
      alert('계약 조건 변경 및 낙찰 처리가 정상 완료되었습니다.');
      setShowModal(false);
      setContract(res.contract);
      setPost((prev: any) => ({ ...prev, status: 'closed' }));
      fetchAllPosts();
    } else {
      alert('처리 실패: ' + res.message);
    }
  };

  if (!post) return <div style={{ padding: '20px', fontFamily: 'Malgun Gothic' }}>데이터를 불러오는 중입니다...</div>;

  const isActive = post.status === 'active';

  return (
    <div style={{ fontFamily: 'Malgun Gothic, sans-serif', fontSize: '12px', backgroundColor: '#f4f6f9', minHeight: '100vh', paddingBottom: '40px' }}>
      {/* 헤더 */}
      <header style={{ backgroundColor: '#1a3863', color: '#fff', padding: '12px 20px', borderBottom: '3px solid #0b2242', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button 
            onClick={() => router.back()} 
            style={{ backgroundColor: 'transparent', color: '#fff', border: '1px solid #b0c4de', padding: '3px 8px', fontSize: '11px', cursor: 'pointer', borderRadius: '3px' }}
          >
            ← 뒤로가기
          </button>
          <h1 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>전자입찰 및 계약관리시스템</h1>
        </div>
        <span style={{ fontSize: '11px', color: '#b0c4de' }}>보안등급: HIGH-TRUST-SSL</span>
      </header>

      {/* 메인 2단 레이아웃 */}
      <div style={{ maxWidth: '1200px', margin: '20px auto', padding: '0 15px', display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' }}>
        
        {/* [좌측 메인] */}
        <div>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1a3863', borderLeft: '4px solid #1a3863', paddingLeft: '8px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>[입찰 공고] {post.title}</span>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ backgroundColor: isActive ? '#28a745' : '#6c757d', color: '#fff', padding: '3px 8px', fontSize: '11px' }}>
                {isActive ? '입찰 진행 중' : '낙찰 완료'}
              </span>
              <button onClick={() => router.back()} style={{ backgroundColor: '#6c757d', color: '#fff', border: 'none', padding: '3px 8px', fontSize: '11px', cursor: 'pointer' }}>
                이전으로
              </button>
            </div>
          </div>

          {/* 공고 정보 */}
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

          {/* 응찰 양식 */}
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

          {/* 응찰 내역 표 */}
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1a3863', borderLeft: '4px solid #1a3863', paddingLeft: '8px', marginBottom: '10px' }}>현재 공고 응찰 현황</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: '2px solid #555', backgroundColor: '#fff', marginBottom: '30px' }}>
            <thead>
              <tr style={{ backgroundColor: '#e9ecef' }}>
                <th style={gridThStyle}>공급 신청자</th>
                <th style={gridThStyle}>제시 공급 단가</th>
                <th style={gridThStyle}>접수 일시</th>
                <th style={gridThStyle}>낙찰 및 계약 편집</th>
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
                        <button onClick={() => openAwardModal(b)} disabled={isSubmitting} style={btnActionStyle}>
                          낙찰 & 계약 편집
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

          {/* 완료된 전자 계약서 */}
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

              <div style={{ marginBottom: '12px' }}>
                <strong>제3조 (위약금 및 지체상금)</strong><br />
                1. 귀책사유로 계약 해지 시 위약금: <strong>{Number(contract.penalty_amount).toLocaleString()}원</strong><br />
                2. 납품 지연 지체상금율: <strong>{contract.delay_penalty_rate || '일 0.1%'}</strong><br />
                3. 하자보수보증기간: <strong>{contract.warranty_period || '검수 완료일로부터 1년'}</strong>
              </div>

              {contract.special_terms && (
                <div style={{ marginBottom: '20px', backgroundColor: '#fdf8e4', padding: '10px', border: '1px solid #faebcc' }}>
                  <strong>제4조 (특약 사항)</strong>
                  <pre style={{ margin: '5px 0 0 0', fontFamily: 'inherit', whitespace: 'pre-wrap', fontSize: '11px', color: '#555' }}>
                    {contract.special_terms}
                  </pre>
                </div>
              )}

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

        {/* [우측 사이드바] 공개 공고 리스트 */}
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

      {/* [비밀번호 입력 + 계약 조건 & 특약 편집 통합 모달 팝업] */}
      {showModal && selectedBid && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', width: '520px', padding: '20px', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '15px', color: '#1a3863', borderBottom: '2px solid #1a3863', paddingBottom: '8px' }}>
              낙찰 승인 및 계약 조건 편집
            </h3>
            
            {/* 비밀번호 입력란 (상단 배치) */}
            <div style={{ backgroundColor: '#f8f9fa', padding: '10px', border: '1px solid #dee2e6', marginBottom: '15px', borderRadius: '3px' }}>
              <label style={{ fontWeight: 'bold', color: '#d9534f', display: 'block', marginBottom: '5px' }}>
                * 게시자/관리자 비밀번호 확인
              </label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="비밀번호 입력"
                style={{ ...inputStyle, width: '100%', border: '1px solid #d9534f' }}
              />
            </div>

            <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#333' }}>
              낙찰 선정 대상: <strong>{selectedBid.bidder_name}</strong> (제시 단가: {Number(selectedBid.unit_price).toLocaleString()}원)
            </p>

            {/* 계약 내용 편집 테이블 */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px' }}>
              <tbody>
                <tr>
                  <th style={thStyle}>계약 시작일</th>
                  <td style={tdStyle}>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
                  </td>
                </tr>
                <tr>
                  <th style={thStyle}>계약 종료일</th>
                  <td style={tdStyle}>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
                  </td>
                </tr>
                <tr>
                  <th style={thStyle}>위약금(원)</th>
                  <td style={tdStyle}>
                    <input type="number" value={penaltyAmount} onChange={(e) => setPenaltyAmount(e.target.value)} style={inputStyle} />
                  </td>
                </tr>
                <tr>
                  <th style={thStyle}>지체상금율</th>
                  <td style={tdStyle}>
                    <input type="text" value={delayPenaltyRate} onChange={(e) => setDelayPenaltyRate(e.target.value)} style={inputStyle} />
                  </td>
                </tr>
                <tr>
                  <th style={thStyle}>하자보수보증</th>
                  <td style={tdStyle}>
                    <input type="text" value={warrantyPeriod} onChange={(e) => setWarrantyPeriod(e.target.value)} style={inputStyle} />
                  </td>
                </tr>
                <tr>
                  <th style={thStyle}>특약 사항</th>
                  <td style={tdStyle}>
                    <textarea 
                      rows={4} 
                      value={specialTerms} 
                      onChange={(e) => setSpecialTerms(e.target.value)} 
                      style={{ ...inputStyle, width: '100%', height: '70px', resize: 'vertical' }}
                      placeholder="특약 항목 직접 작성"
                    />
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setShowModal(false)} style={{ backgroundColor: '#6c757d', color: '#fff', border: 'none', padding: '6px 12px', cursor: 'pointer' }}>
                취소
              </button>
              <button onClick={handleAwardAndContract} disabled={isSubmitting} style={btnCourtStyle}>
                {isSubmitting ? '승인 중...' : '비밀번호 확인 및 계약서 발급'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const thStyle = { backgroundColor: '#f0f4f8', border: '1px solid #d0d7de', padding: '8px', textAlign: 'left' as const, width: '28%' };
const tdStyle = { border: '1px solid #d0d7de', padding: '8px', backgroundColor: '#fff' };
const gridThStyle = { border: '1px solid #ccc', padding: '8px', textAlign: 'center' as const };
const inputStyle = { border: '1px solid #abb8c3', padding: '5px', fontSize: '12px', width: '200px', boxSizing: 'border-box' as const };
const btnCourtStyle = { backgroundColor: '#1a3863', color: '#fff', border: 'none', padding: '6px 12px', cursor: 'pointer', fontWeight: 'bold' as const };
const btnActionStyle = { backgroundColor: '#d9534f', color: '#fff', border: 'none', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' as const };