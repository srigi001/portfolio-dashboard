import { useState } from 'react';

export default function Tooltip({ content, children }) {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className="relative inline-block z-50"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div className="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-normal text-white bg-black text-sm px-3 py-2 rounded shadow-lg w-max max-w-xs z-50">
          {typeof content === 'string' ? content : <span>{content}</span>}
        </div>
      )}
    </div>
  );
}
