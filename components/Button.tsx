'use client'
import { type ButtonHTMLAttributes, type ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  children: ReactNode
}

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: ButtonProps) {
  const base =
    'inline-flex items-center justify-center font-medium rounded-xl transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer'
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2.5 text-sm' }
  const variants = {
    primary: 'bg-amber-600 hover:bg-amber-500 text-stone-950',
    ghost: 'bg-white/5 hover:bg-white/10 text-stone-300 border border-white/10',
    danger: 'bg-red-500/20 hover:bg-red-500/30 text-red-300',
  }
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}
