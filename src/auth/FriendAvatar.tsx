import React from 'react';

interface Props {
  name: string;
  src?: string;
  className?: string;
  objectPosition?: string;
}

export const FriendAvatar: React.FC<Props> = ({ name, src, className = '', objectPosition }) => {
  const classes = ['friend-avatar', className].filter(Boolean).join(' ');
  if (src) {
    return <img className={classes} src={src} alt="" aria-hidden="true" title={`${name} 픽`} style={{ objectPosition }} />;
  }
  return <span className={`${classes} friend-avatar--fallback`} aria-hidden="true">{name.slice(0, 1)}</span>;
};
