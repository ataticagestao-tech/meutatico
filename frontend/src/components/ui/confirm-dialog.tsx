'use client'

import { createContext, useCallback, useContext, useState, ReactNode } from 'react'
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@/components/ui/modal'

interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'destructive'
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

export function useConfirm(): ConfirmFn {
  const fn = useContext(ConfirmContext)
  if (!fn) throw new Error('useConfirm must be used within ConfirmDialogProvider')
  return fn
}

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions>({ title: '' })
  const [resolve, setResolve] = useState<((v: boolean) => void) | null>(null)

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts)
    setOpen(true)
    return new Promise<boolean>((res) => {
      setResolve(() => res)
    })
  }, [])

  const handleConfirm = () => {
    setOpen(false)
    resolve?.(true)
  }

  const handleCancel = () => {
    setOpen(false)
    resolve?.(false)
  }

  const destructive = options.variant === 'destructive'

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal open={open} onOpenChange={(v) => { if (!v) handleCancel() }}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>{options.title}</ModalTitle>
            {options.description && (
              <ModalDescription>{options.description}</ModalDescription>
            )}
          </ModalHeader>
          <ModalFooter>
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground-primary hover:bg-background-tertiary transition-colors"
            >
              {options.cancelLabel || 'Voltar'}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className={
                destructive
                  ? 'px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors'
                  : 'px-4 py-2 rounded-lg text-sm font-medium text-white bg-brand-primary hover:bg-brand-secondary transition-colors'
              }
            >
              {options.confirmLabel || 'Confirmar'}
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </ConfirmContext.Provider>
  )
}
