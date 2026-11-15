import { describe, it, expect } from 'vitest'
import { render, screen, renderHook } from '@testing-library/react'
import { RoundedButton } from '../components/shared/RoundedButton'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { palette, fontFamilyStack } from '../styles/theme'

describe('theme tokens', () => {
  it('exposes the full vibrant space palette', () => {
    expect(palette.void).toBeTruthy()
    expect(palette.magenta).toBeTruthy()
    expect(palette.coral).toBeTruthy()
    expect(palette.orange).toBeTruthy()
    expect(palette.cyan).toBeTruthy()
    expect(palette.lavender).toBeTruthy()
    expect(palette['soft-white']).toBeTruthy()
  })

  it('exposes the three-font typography stack', () => {
    expect(fontFamilyStack.display[0]).toContain('Prosto One')
    expect(fontFamilyStack.heading[0]).toContain('Sora')
    expect(fontFamilyStack.body[0]).toContain('Figtree')
  })
})

describe('useReducedMotion', () => {
  it('defaults to false when not requested', () => {
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
  })
})

describe('RoundedButton', () => {
  it('renders a rounded-rectangle button, never a pill', () => {
    render(<RoundedButton>Play</RoundedButton>)
    const btn = screen.getByRole('button', { name: /play/i })
    expect(btn.className).not.toMatch(/rounded-full/)
    expect(btn.className).toMatch(/rounded-/)
  })

  it('applies variant classes', () => {
    const { container } = render(<RoundedButton variant="secondary">Back</RoundedButton>)
    const btn = container.querySelector('button')!
    expect(btn.className).toContain('rounded-')
    expect(btn.className).toContain('border')
  })
})
