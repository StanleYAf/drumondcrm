import { useRef, useCallback } from "react";
import { useReactToPrint } from "react-to-print";

export function useLabelPrint() {
  const labelRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: labelRef,
    pageStyle: `
      @page { size: 100mm 50mm; margin: 0; }
      @media print {
        html, body { margin: 0; padding: 0; }
        header, footer, nav { display: none !important; }
      }
    `,
  });

  const triggerPrint = useCallback(() => {
    setTimeout(() => { handlePrint(); }, 300);
  }, [handlePrint]);

  return { labelRef, triggerPrint };
}
