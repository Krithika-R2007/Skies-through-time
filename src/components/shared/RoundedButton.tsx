import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface RoundedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-cyan text-void shadow-[0_0_20px_rgba(90,217,230,0.2)] hover:bg-soft-white',
  accent: 'bg-neon text-void shadow-[0_0_20px_rgba(255,176,46,0.28)] hover:bg-soft-white',
  secondary:
    'bg-white/5 text-lavender border border-white/15 backdrop-blur-md hover:bg-white/10 hover:border-white/25',
  ghost: 'bg-transparent text-lavender/80 hover:text-soft-white hover:bg-white/5',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3.5 py-2 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3 text-base',
}

export const RoundedButton = forwardRef<HTMLButtonElement, RoundedButtonProps>(
  function RoundedButton({ className, variant = 'primary', size = 'md', ...props }, ref) {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-xl font-heading font-medium tracking-wide',
          'transition-all duration-300 ease-space',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60 focus-visible:ring-offset-2 focus-visible:ring-offset-void',
          'disabled:opacity-50 disabled:pointer-events-none',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    )
  },
)
