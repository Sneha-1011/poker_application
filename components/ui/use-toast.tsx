"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

type ToastProps = {
  title?: string
  description?: string
  variant?: "default" | "destructive"
  duration?: number
  onClose?: () => void
}

type ToastContextType = {
  toast: (props: ToastProps) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<(ToastProps & { id: string })[]>([])

  const toast = React.useCallback((props: ToastProps) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { ...props, id }])

    if (props.duration !== 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, props.duration || 3000)
    }
  }, [])

  const handleClose = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-0 right-0 p-4 space-y-2 z-50">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "p-4 rounded-md shadow-md transition-all transform translate-y-0 opacity-100",
              "bg-white text-gray-900 border border-gray-200",
              t.variant === "destructive" && "bg-red-600 text-white border-red-800",
            )}
          >
            <div className="flex justify-between items-start">
              <div>
                {t.title && <div className="font-medium">{t.title}</div>}
                {t.description && <div className="text-sm mt-1">{t.description}</div>}
              </div>
              <button onClick={() => handleClose(t.id)} className="ml-4 text-gray-500 hover:text-gray-700">
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

export const toast = (props: ToastProps) => {
  if (typeof window !== "undefined") {
    // Create a custom event to trigger the toast
    const event = new CustomEvent("toast", { detail: props })
    window.dispatchEvent(event)
  }
}

// Add event listener to handle toast events
if (typeof window !== "undefined") {
  window.addEventListener("toast", ((e: CustomEvent<ToastProps>) => {
    const toastContainer = document.querySelector("[data-toast-container]")
    if (toastContainer) {
      const toast = document.createElement("div")
      toast.className = cn(
        "p-4 rounded-md shadow-md mb-2 transition-all transform translate-y-0 opacity-100",
        "bg-white text-gray-900 border border-gray-200",
        e.detail.variant === "destructive" && "bg-red-600 text-white border-red-800",
      )

      const content = document.createElement("div")

      if (e.detail.title) {
        const title = document.createElement("div")
        title.className = "font-medium"
        title.textContent = e.detail.title
        content.appendChild(title)
      }

      if (e.detail.description) {
        const description = document.createElement("div")
        description.className = "text-sm mt-1"
        description.textContent = e.detail.description
        content.appendChild(description)
      }

      toast.appendChild(content)
      toastContainer.appendChild(toast)

      setTimeout(() => {
        toast.classList.add("opacity-0", "translate-y-2")
        setTimeout(() => {
          toastContainer.removeChild(toast)
        }, 300)
      }, e.detail.duration || 3000)
    }
  }) as EventListener)
}
