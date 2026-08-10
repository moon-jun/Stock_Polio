import React from 'react';
import { useAuth } from './AuthProvider';
import '../app/styles.css';

export const FRIENDS = [
  { id: 'jaehyung', name: '재형' },
  { id: 'junhyun', name: '준현' },
  { id: 'haeuk', name: '해욱' },
  { id: 'byeonghun', name: '병훈' },
  { id: 'taesu', name: '태수' },
  { id: 'hyunsik', name: '현식' },
  { id: 'jaeyoung', name: '재영' },
];

export const AuthScreen: React.FC<{ onSelected?: () => void }> = ({ onSelected }) => {
  const { login } = useAuth();

  const selectUser = async (id: string, name: string) => {
    try {
      await login(id, name);
      onSelected?.();
    } catch {
      window.alert('사용자 정보를 생성하거나 불러오지 못했습니다.');
    }
  };

  return (
    <div className="auth-screen">
      <h1>워렌 버핏의 어린 시절 투자일기</h1>
      <p>본인의 이름을 선택해주세요</p>
      <div className="user-grid">
        {FRIENDS.map(u => (
          <button 
            key={u.id} 
            className="user-btn"
            onClick={() => void selectUser(u.id, u.name)}
          >
            {u.name}
          </button>
        ))}
      </div>
    </div>
  );
};
