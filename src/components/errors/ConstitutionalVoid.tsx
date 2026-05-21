import type { ComponentPropsWithoutRef, ReactNode } from "react";

type Props = {
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<"div">, "children">;

/**
 * Full-viewport constitutional breach shell — locks the entire browser surface above normal app chrome.
 */
export default function ConstitutionalVoid({ children, className = "", ...rest }: Props) {
  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col overflow-hidden bg-black/90 backdrop-blur-sm ${className}`.trim()}
      {...rest}
    >
      {children}
    </div>
  );
}
