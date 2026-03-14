import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100vw-2rem)] sm:max-w-[380px]",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  [
    "group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden",
    "rounded-2xl border px-4 py-3.5 shadow-xl shadow-black/20",
    "transition-all duration-300",
    "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-5 data-[state=open]:fade-in-0",
    "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right-full data-[state=closed]:fade-out-0",
    "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none",
    "data-[swipe=end]:animate-out data-[swipe=end]:slide-out-to-right-full",
    "data-[swipe=cancel]:translate-x-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-card border-border/60 text-foreground",
        destructive: "bg-destructive/10 border-destructive/40 text-foreground",
        success: "bg-green-500/10 border-green-500/40 text-foreground",
        warning: "bg-yellow-500/10 border-yellow-500/40 text-foreground",
        info: "bg-blue-500/10 border-blue-500/40 text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const ICONS: Record<string, React.ReactNode> = {
  default: <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />,
  destructive: <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />,
  success: <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />,
  warning: <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />,
  info: <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />,
}

const PROGRESS_COLORS: Record<string, string> = {
  default: "bg-primary",
  destructive: "bg-destructive",
  success: "bg-green-400",
  warning: "bg-yellow-400",
  info: "bg-blue-400",
}

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, children, ...props }, ref) => {
  const v = variant || "default";
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    >
      {ICONS[v as string] || ICONS.default}
      <div className="flex-1 min-w-0">{children}</div>
      <div
        className={cn(
          "absolute bottom-0 left-0 h-[2px] w-full origin-left animate-[shrink_4s_linear_forwards]",
          PROGRESS_COLORS[v as string] || PROGRESS_COLORS.default
        )}
      />
    </ToastPrimitives.Root>
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-7 shrink-0 items-center justify-center rounded-lg border bg-transparent px-3 text-xs font-semibold transition-colors hover:bg-secondary focus:outline-none disabled:pointer-events-none disabled:opacity-50",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "shrink-0 rounded-lg p-1 text-foreground/40 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none group-hover:opacity-100",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-3.5 w-3.5" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-bold leading-tight", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-xs text-muted-foreground mt-0.5 leading-relaxed", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>
type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
