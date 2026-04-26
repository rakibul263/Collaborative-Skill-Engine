import React from "react";
import { cn } from "@/lib/utils";

const Button = React.forwardRef(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    // Base styles for all buttons
    const baseStyles =
      "inline-flex items-center justify-center rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4ED7C] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]";

    // Variant definitions
    const variants = {
      default:
        "bg-[#112D32] text-white shadow-md hover:bg-[#254E58] hover:shadow-lg",
      outline:
        "border-2 border-[#112D32] bg-transparent text-[#112D32] hover:bg-[#112D32]/5",
      ghost: "bg-transparent text-[#112D32] hover:bg-[#112D32]/10",
      link: "text-[#112D32] underline-offset-4 hover:underline",
      // Special 'Lime' variant for your brand
      brand:
        "bg-[#D4ED7C] text-[#112D32] shadow-sm hover:bg-[#c2db6b] hover:shadow-md",
    };

    // Size definitions
    const sizes = {
      default: "h-11 px-5 py-2",
      sm: "h-9 rounded-md px-3 text-xs",
      lg: "h-14 rounded-xl px-10 text-base",
      icon: "h-10 w-10",
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant] || variants.default,
          sizes[size] || sizes.default,
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export { Button };
