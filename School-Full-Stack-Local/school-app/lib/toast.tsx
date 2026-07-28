'use client'

import { createContext, useContext, useRef, useState } from 'react'

type ToastType = 'success' | 'error' | 'warning'

const ToastContext = createContext<(msg: string, type?: ToastType) => void>(() => {})

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ msg: string; type: ToastType; show: boolean }>({
    msg: '',
    type: 'success',
    show: false,
  })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = (msg: string, type: ToastType = 'success') => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast({ msg, type, show: true })
    timerRef.current = setTimeout(() => {
      setToast(t => ({ ...t, show: false }))
    }, 3000)
  }

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className={`toast toast-${toast.type} ${toast.show ? 'show' : ''}`}>{toast.msg}</div>
    </ToastContext.Provider>
  )
}