"use client";

import { forwardRef, useEffect, useMemo, useState } from "react";
import type { ReactNode, SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  placeholder?: string;
  placeholderClassName?: string;
  children: ReactNode;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    className,
    children,
    value,
    defaultValue,
    onChange,
    placeholder,
    placeholderClassName,
    required,
    ...props
  },
  ref
) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(String(defaultValue ?? ""));

  useEffect(() => {
    if (defaultValue !== undefined) {
      setInternalValue(String(defaultValue));
    }
  }, [defaultValue]);

  const currentValue = isControlled ? String(value ?? "") : internalValue;
  const hasPlaceholder = Boolean(placeholder);

  const optionChildren = useMemo(() => {
    if (!hasPlaceholder) {
      return children;
    }

    return (
      <>
        <option value="" disabled={required}>
          {placeholder}
        </option>
        {children}
      </>
    );
  }, [children, hasPlaceholder, placeholder, required]);

  return (
    <select
      ref={ref}
      value={isControlled ? value : undefined}
      defaultValue={isControlled ? undefined : defaultValue}
      onChange={(event) => {
        if (!isControlled) {
          setInternalValue(event.target.value);
        }

        onChange?.(event);
      }}
      className={cn(
        "h-12 w-full rounded-2xl border border-slate-200 px-4 pr-10 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100",
        currentValue
          ? "bg-white text-slate-900"
          : cn("bg-slate-50 text-slate-400", placeholderClassName),
        className
      )}
      required={required}
      {...props}
    >
      {optionChildren}
    </select>
  );
});
