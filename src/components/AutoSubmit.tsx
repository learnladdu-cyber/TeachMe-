"use client";

import { useRef, type ReactNode } from "react";

export function AutoSubmit({
  action,
  children,
  className,
  style,
}: {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      action={action}
      className={className}
      style={style}
      onChange={() => ref.current?.requestSubmit()}
    >
      {children}
    </form>
  );
}
