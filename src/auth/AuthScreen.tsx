import React from 'react';
import { useAuth } from './AuthProvider';
import '../app/styles.css';

const USERS = [
  { id: 'jaehyung', name: '재형' },
  { id: 'junhyun', name: '준현' },
  { id: 'byeonghun', name: '지갑' }, // Previously byeonghun, asked to be renamed '지갑'
  { id: 'user4', name: '친구4' },
  { id: 'user5', name: '친구5' },
  { id: 'user6', name: '친구6' },
  { id: 'user7', name: '친구7' },
];

export const AuthScreen: React.FC = () => {
  const { login } = useAuth();

  return (
    <div className="auth-screen">
      <h1>StockPick 로그인</h1>
      <p>본인의 이름을 선택해주세요 (신뢰 기반)</p>
      <div className="user-grid">
        {USERS.map(u => (
          <button 
            key={u.id} 
            className="user-btn"
            onClick={() => login(u.id, u.name)}
          >
            {u.name}
          </button>
        ))}
      </div>
    </div>
  );
};
