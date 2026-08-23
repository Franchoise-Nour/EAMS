'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function PostListPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    // DB에서 최신순으로 공고 목록 조회
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPosts(data);
    }
    setLoading(false);
  }

  return (
    <div style={{ fontFamily: 'Malgun Gothic, sans-serif', fontSize: '12px', backgroundColor: '#f4f6f9', minHeight: '100vh', paddingBottom: '40px' }}>
      {/* 헤더 */}
      <header style={{ backgroundColor: '#1a3863', color: '#fff', padding: '12px 20px', borderBottom: '3px solid #0b2242', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>전자입찰 및 계약관리시스템</h1>
        <span style={{ fontSize: '11px', color: '#b0c4de' }}>보안등급: HIGH-TRUST-SSL</span>
      </header>

      {/* 서브 네비게이션 */}
      <div style={{ backgroundColor: '#e9ecef', borderBottom: '1px solid #ccc', padding: '8px 20px', fontWeight: 'bold', color: '#495057' }}>
        <span>[공고목록조회] 진행 중인 경쟁 입찰 및 물품 공급 공고 목록</span>
      </div>

      <div style={{ maxWidth: '1000px', margin: '20px auto', padding: '0 15px' }}>
        
        {/* 타이틀 및 공고 등록 버튼 */}
        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1a3863', borderLeft: '4px solid #1a3863', paddingLeft: '8px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>전자입찰 공고 목록</span>
          <Link href="/new" style={{ backgroundColor: '#1a3863', color: '#fff', textDecoration: 'none', padding: '6px 12px', fontSize: '12px', fontWeight: 'bold' }}>
            + 신규 입찰 공고 등록
          </Link>
        </div>

        {/* 공고 목록 테이블 */}
        <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: '2px solid #1a3863', backgroundColor: '#fff' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f4f8', color: '#222', borderBottom: '1px solid #d0d7de' }}>
              <th style={thStyle}>진행 상태</th>
              <th style={{ ...thStyle, width: '40%' }}>공고 제목</th>
              <th style={thStyle}>입찰 물품명</th>
              <th style={thStyle}>예상 공급량</th>
              <th style={thStyle}>등록일자</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ ...tdStyle, textAlign: 'center', padding: '20px' }}>공고 목록을 불러오는 중입니다...</td>
              </tr>
            ) : posts.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ ...tdStyle, textAlign: 'center', padding: '20px' }}>등록된 입찰 공고가 없습니다. 우측 상단 버튼을 통해 공고를 등록하세요.</td>
              </tr>
            ) : (
              posts.map((post) => (
                <tr key={post.id} style={{ textAlign: 'center' }}>
                  <td style={tdStyle}>
                    <span style={{ backgroundColor: post.status === 'active' ? '#28a745' : '#6c757d', color: '#fff', padding: '2px 6px', fontSize: '11px', fontWeight: 'bold' }}>
                      {post.status === 'active' ? '입찰 진행 중' : '낙찰 완료'}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 'bold' }}>
                    <Link href={`/posts/${post.id}`} style={{ color: '#1a3863', textDecoration: 'none' }}>
                      {post.title}
                    </Link>
                  </td>
                  <td style={tdStyle}>{post.item_name}</td>
                  <td style={tdStyle}>{post.monthly_volume}</td>
                  <td style={tdStyle}>{new Date(post.created_at).toLocaleDateString('ko-KR')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

      </div>
    </div>
  );
}

const thStyle = { border: '1px solid #d0d7de', padding: '8px 12px', textAlign: 'center' as const, fontWeight: 'bold' };
const tdStyle = { border: '1px solid #d0d7de', padding: '8px 12px', backgroundColor: '#fff' };