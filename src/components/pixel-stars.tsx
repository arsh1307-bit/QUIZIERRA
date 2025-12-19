"use client";
import React, { useEffect, useState } from 'react';

const createShadows = (n: number) => {
  let shadows = '';
  for (let i = 0; i < n; i++) {
    const x = Math.floor(Math.random() * 2000);
    const y = Math.floor(Math.random() * 2000);
    shadows += `${x}px ${y}px var(--star-color), `;
  }
  return shadows.slice(0, -2);
};

export function PixelStars() {
  const [shadows1, setShadows1] = useState('');
  const [shadows2, setShadows2] = useState('');
  const [shadows3, setShadows3] = useState('');

  useEffect(() => {
    // These will only run on the client, after initial hydration
    setShadows1(createShadows(700));
    setShadows2(createShadows(200));
    setShadows3(createShadows(100));
  }, []);

  return (
    <>
      <div id="stars" style={{ '--shadows1': shadows1 } as React.CSSProperties}></div>
      <div id="stars2" style={{ '--shadows2': shadows2 } as React.CSSProperties}></div>
      <div id="stars3" style={{ '--shadows3': shadows3 } as React.CSSProperties}></div>
    </>
  );
}
