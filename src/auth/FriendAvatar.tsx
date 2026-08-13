import React from 'react';

interface Props {
  name: string;
  src?: string;
  className?: string;
  objectPosition?: string;
  transform?: string;
}

export const FriendAvatar: React.FC<Props> = ({ name, src, className = '', objectPosition, transform }) => {
  const classes = ['friend-avatar', className].filter(Boolean).join(' ');
  if (src) {
    return (
      <span className={classes} aria-hidden="true" title={`${name} 픽`}>
        <img
          src={src}
          alt=""
          style={{
            objectPosition,
            transform,
          }}
        />
      </span>
    );
  }
  return <span className={`${classes} friend-avatar--fallback`} aria-hidden="true">{name.slice(0, 1)}</span>;
};
