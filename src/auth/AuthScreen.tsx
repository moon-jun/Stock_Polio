import React from 'react';
import { useAuth } from './AuthProvider';
import '../app/styles.css';
import jaeyoungAvatar from '../../picture/재영.png';
import hyunsikAvatar from '../../picture/현식.png';
import haeukAvatar from '../../picture/해욱.png';
import byeonghunAvatar from '../../picture/병훈.png';
import jaehyungAvatar from '../../picture/재형.png';
import taesuAvatar from '../../picture/태수.png';
import junhyunAvatar from '../../picture/준현.png';

export const FRIENDS = [
  { id: 'jaehyung', name: '재형', avatar: jaehyungAvatar, avatarPosition: 'center 53%', avatarTransform: 'translateX(4%)' },
  { id: 'junhyun', name: '준현', avatar: junhyunAvatar, avatarPosition: 'center bottom' },
  { id: 'haeuk', name: '해욱', avatar: haeukAvatar, avatarPosition: 'center 32%', avatarTransform: 'translateX(-3%)' },
  { id: 'byeonghun', name: '병훈', avatar: byeonghunAvatar, avatarPosition: 'center 99%', avatarTransform: 'translateX(-3%)' },
  { id: 'taesu', name: '태수', avatar: taesuAvatar, avatarPosition: 'center 32%' },
  { id: 'hyunsik', name: '현식', avatar: hyunsikAvatar, avatarPosition: 'center bottom', avatarTransform: 'translateX(7%)' },
  { id: 'jaeyoung', name: '재영', avatar: jaeyoungAvatar, avatarPosition: 'center bottom' },
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
