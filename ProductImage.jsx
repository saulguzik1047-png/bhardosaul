import React from 'react';

export function ProductImage({ src, fallbackSrc, alt, ...props }) {
  const source = String(src || fallbackSrc || '');
  const [failedSource, setFailedSource] = React.useState('');
  const displaySource = failedSource === source ? fallbackSrc : source;

  return (
    <img
      {...props}
      src={displaySource}
      alt={alt}
      onError={() => {
        if (source && source !== fallbackSrc) setFailedSource(source);
      }}
    />
  );
}
