const LoadingSpinner = ({ size = 'md', className = '', text = 'Loading...' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-5 h-5 border-2',
    lg: 'w-6 h-6 border-2'
  };

  return (
    <span className={`inline-flex items-center justify-center ${className}`}>
      <div
        className={`animate-spin rounded-full ${sizeClasses[size]} border-t-transparent border-l-transparent border-r-transparent border-b-indigo-600`}
      ></div>
      <span className="ml-2">{text}</span>
    </span>
  );
};

export default LoadingSpinner;
