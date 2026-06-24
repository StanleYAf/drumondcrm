import { forwardRef, createElement, type ElementType, type ReactNode } from "react";

type NoTranslateProps = {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  [key: string]: unknown;
};

/**
 * Wraps text that must NEVER be translated by Google Translate, Chrome's
 * built-in translator, or third-party translation extensions.
 *
 * Applies the official `translate="no"` attribute AND the `notranslate`
 * className (legacy Google Translate signal) for maximum coverage.
 *
 * Usage:
 *   <NoTranslate>DSH Hub</NoTranslate>
 *   <NoTranslate as="span" className="font-bold">Dashboard</NoTranslate>
 */
export const NoTranslate = forwardRef<HTMLElement, NoTranslateProps>(
  ({ as = "span", children, className, ...rest }, ref) => {
    const composed = ["notranslate", className].filter(Boolean).join(" ");
    return createElement(
      as,
      { ref, translate: "no", lang: "pt-BR", className: composed, ...rest },
      children,
    );
  }
);

NoTranslate.displayName = "NoTranslate";

export default NoTranslate;