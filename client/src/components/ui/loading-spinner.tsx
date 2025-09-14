import { cn } from "@/lib/utils";
import { FileText, MessageCircle, Download, Check } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  variant?: "default" | "pdf" | "whatsapp" | "download";
  className?: string;
  message?: string;
}

export function LoadingSpinner({ 
  size = "md", 
  variant = "default", 
  className, 
  message 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6", 
    lg: "w-8 h-8"
  };

  const iconSizeClasses = {
    sm: 16,
    md: 20,
    lg: 24
  };

  const getIcon = () => {
    switch (variant) {
      case "pdf":
        return <FileText size={iconSizeClasses[size]} className="text-red-500" />;
      case "whatsapp":
        return <MessageCircle size={iconSizeClasses[size]} className="text-green-500" />;
      case "download":
        return <Download size={iconSizeClasses[size]} className="text-blue-500" />;
      default:
        return null;
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "pdf":
        return "border-red-200 border-t-red-500";
      case "whatsapp":
        return "border-green-200 border-t-green-500";
      case "download":
        return "border-blue-200 border-t-blue-500";
      default:
        return "border-gray-200 border-t-blue-500";
    }
  };

  return (
    <div className={cn("flex flex-col items-center space-y-3", className)}>
      <div className="relative">
        {/* Outer spinning ring */}
        <div 
          className={cn(
            "animate-spin rounded-full border-2",
            sizeClasses[size],
            getVariantStyles()
          )}
        />
        
        {/* Inner icon with pulse animation */}
        {variant !== "default" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-pulse">
              {getIcon()}
            </div>
          </div>
        )}
      </div>

      {/* Animated message with typing effect */}
      {message && (
        <div className="text-center">
          <p className="text-sm text-slate-600 animate-pulse">
            {message}
          </p>
          <div className="flex justify-center mt-1">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
              <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
              <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ProcessingModalProps {
  isOpen: boolean;
  variant: "pdf" | "whatsapp";
  message?: string;
  progress?: number;
}

export function ProcessingModal({ isOpen, variant, message, progress }: ProcessingModalProps) {
  if (!isOpen) return null;

  const getTitle = () => {
    switch (variant) {
      case "pdf":
        return "Generating PDF Agreement";
      case "whatsapp":
        return "Preparing WhatsApp Message";
      default:
        return "Processing...";
    }
  };

  const getDefaultMessage = () => {
    switch (variant) {
      case "pdf":
        return "Creating your professional rental agreement...";
      case "whatsapp":
        return "Preparing your WhatsApp message with PDF link...";
      default:
        return "Please wait...";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass rounded-2xl p-8 max-w-md w-full animate-scale-in">
        <div className="text-center">
          <LoadingSpinner 
            size="lg" 
            variant={variant} 
            className="mb-6"
          />
          
          <h3 className="text-xl font-semibold text-slate-800 mb-2">
            {getTitle()}
          </h3>
          
          <p className="text-slate-600 mb-4">
            {message || getDefaultMessage()}
          </p>

          {/* Progress bar if progress is provided */}
          {progress !== undefined && (
            <div className="w-full bg-slate-200 rounded-full h-2 mb-4">
              <div 
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  variant === "pdf" ? "bg-gradient-to-r from-red-400 to-red-500" : 
                  variant === "whatsapp" ? "bg-gradient-to-r from-green-400 to-green-500" :
                  "bg-gradient-to-r from-blue-400 to-blue-500"
                )}
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          )}

          {/* Animated steps for PDF generation */}
          {variant === "pdf" && (
            <div className="space-y-2 text-left">
              <div className="flex items-center space-x-2 text-sm">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-slate-600">Processing customer information</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-slate-600">Adding vehicle photos and details</span>
              </div>
              <div className="flex items-center space-x-2 text-sm opacity-50">
                <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />
                <span className="text-slate-400">Finalizing agreement document</span>
              </div>
            </div>
          )}

          {/* Animated steps for WhatsApp */}
          {variant === "whatsapp" && (
            <div className="space-y-2 text-left">
              <div className="flex items-center space-x-2 text-sm">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-slate-600">Validating customer phone number</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-slate-600">Creating WhatsApp message link</span>
              </div>
              <div className="flex items-center space-x-2 text-sm opacity-50">
                <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />
                <span className="text-slate-400">Opening WhatsApp application</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoadingSpinner;