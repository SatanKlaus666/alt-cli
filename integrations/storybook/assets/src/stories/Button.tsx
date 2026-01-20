interface ButtonProps {
  variant?: 'primary' | 'secondary'
  children: React.ReactNode
  onClick?: () => void
}

export function Button({
  variant = 'primary',
  children,
  onClick,
}: ButtonProps) {
  const baseStyles = 'px-4 py-2 rounded font-medium transition-colors'
  const variantStyles = {
    primary: 'bg-blue-500 text-white hover:bg-blue-600',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
  }

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
