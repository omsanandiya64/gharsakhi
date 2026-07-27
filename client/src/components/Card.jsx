export function Card({ children, className = '', ...props }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gs-teal-100 p-4 ${className}`} {...props}>
      {children}
    </div>
  );
}
