'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createAuctionAction } from '@/actions';

export default function NewAuctionPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: '<데미소다> 공급 경쟁 입찰 안내',
    itemName: '데미소다',
    manufacturer: '동아오츠카',
    spec: '알루미늄 캔 250ml',
    monthlyVolume: '月 10개 이상 (주당 2개 분량 예상)',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.password) return alert('글 관리 비밀번호를 입력해야 합니다.');

    const res = await createAuctionAction(form);
    if (res.success) {
      alert('공고가 성공적으로 등록되었습니다.');
      router.push(`/posts/${res.postId}`);
    } else {
      alert('등록 실패: ' + res.message);
    }
  };

  return (
    <div style={{ fontFamily: 'Malgun Gothic', padding: '30px', maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ color: '#1a3863', borderBottom: '2px solid #1a3863', paddingBottom: '10px' }}>신규 전자입찰 공고 등록</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <label>공고 제목:</label>
          <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ width: '100%', padding: '5px' }} required />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>물품명:</label>
          <input type="text" value={form.itemName} onChange={(e) => setForm({ ...form, itemName: e.target.value })} style={{ width: '100%', padding: '5px' }} required />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>제조업체:</label>
          <input type="text" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} style={{ width: '100%', padding: '5px' }} required />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>사양 및 제원:</label>
          <input type="text" value={form.spec} onChange={(e) => setForm({ ...form, spec: e.target.value })} style={{ width: '100%', padding: '5px' }} required />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>공급량:</label>
          <input type="text" value={form.monthlyVolume} onChange={(e) => setForm({ ...form, monthlyVolume: e.target.value })} style={{ width: '100%', padding: '5px' }} required />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ color: 'red', fontWeight: 'bold' }}>글 관리 비밀번호:</label>
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} style={{ width: '100%', padding: '5px' }} required />
        </div>
        <button type="submit" style={{ backgroundColor: '#1a3863', color: '#fff', border: 'none', padding: '10px 20px', cursor: 'pointer', fontWeight: 'bold' }}>
          공고 등록하기
        </button>
      </form>
    </div>
  );
}