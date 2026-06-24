import { createElement, type ElementType, type ReactNode, type HTMLAttributes } from "react";

interface NoTranslateProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  children: ReactNode;
}

/**
 * Wraps text that must NEVER be translated by Google Translate, Chrome's
 * built-in translator, or third-party translation extensions.
 *
 * Applies the official `translate="no"` attribute AND the `notranslate`
 * className (legacy Google Translate signal) for maximum coverage.
 *
 * Usage:
 *   <NoTranslate>DSH Hub</NoTranslate>
 *   <NoTranslate as="h1" className="font-bold">Dashboard</NoTranslate>
 */
export function NoTranslate({
  as = "span",
  children,
  className,
  ...rest
}: NoTranslateProps) {
  const composed = ["notranslate", className].filter(Boolean).join(" ");
  return createElement(
    as,
    { translate: "no", lang: "pt-BR", className: composed, ...rest },
    children,
  );
}

export default NoTranslate;