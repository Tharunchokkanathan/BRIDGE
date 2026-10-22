import React from 'react';

export interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height,
}) => {
  return (
    <div
      className={`animate-pulse bg-[var(--surface-sunken)] rounded-[2px] border border-[var(--border)]/40 ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
      aria-hidden="true"
    />
  );
};

export default Skeleton;
