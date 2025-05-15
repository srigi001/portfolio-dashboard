export function Button({ children, onClick, variant = 'primary', className = '', ...props }) {
  const base = 'px-4 py-2 rounded font-medium focus:outline-none';
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
    green: 'bg-green-600 hover:bg-green-700 text-white',
  };
  return (
    <button onClick={onClick} className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
