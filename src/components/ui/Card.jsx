export function Card({ children, className = '' }) {
  return <div className={`bg-white shadow-md rounded p-6 ${className}`}>{children}</div>;
}