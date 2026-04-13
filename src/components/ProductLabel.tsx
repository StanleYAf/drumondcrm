import { forwardRef, useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import logoDsh from "@/assets/logo-dsh.png";
import logoDmedical from "@/assets/logo-dmedical.png";

export interface ProductLabelData {
  produto: string;
  nome_comercial?: string | null;
  fabricante?: string | null;
  lote?: string | null;
  registro_anvisa?: string | null;
  validade?: string | null;
  codigo_barras?: string | null;
  estoque: "dsh" | "dmedical";
}

const ProductLabel = forwardRef<HTMLDivElement, { data: ProductLabelData }>(
  ({ data }, ref) => {
    const barcodeRef = useRef<SVGSVGElement>(null);
    const [logoError, setLogoError] = useState(false);

    useEffect(() => {
      setLogoError(false);
    }, [data.estoque]);

    useEffect(() => {
      if (barcodeRef.current && data.codigo_barras) {
        try {
          const isInternal = data.codigo_barras.startsWith("INT");
          JsBarcode(barcodeRef.current, data.codigo_barras, {
            format: "CODE128",
            width: 1.2,
            height: 22,
            displayValue: !isInternal,
            fontSize: 7,
            font: "Arial, sans-serif",
            margin: 0,
            textMargin: 1,
          });
        } catch {
          // invalid barcode
        }
      }
    }, [data.codigo_barras]);

    const logo = data.estoque === "dmedical" ? logoDmedical : logoDsh;
    const empresa = data.estoque === "dmedical" ? "DMedical Life" : "Drumond Soluções Hospitalares";

    const formatVal = (v?: string | null) => {
      if (!v) return "—";
      const parts = v.split("-");
      if (parts.length !== 3) return v;
      return parts[2] + "/" + parts[1] + "/" + parts[0];
    };

    return (
      <div
        ref={ref}
        style={{
          width: "100mm",
          height: "50mm",
          padding: "2.5mm 3mm",
          fontFamily: "Arial, sans-serif",
          fontSize: "7pt",
          color: "#000",
          background: "#fff",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact" as any,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "2.5mm",
            borderBottom: "0.5pt solid #000",
            paddingBottom: "1.5mm",
            marginBottom: "1.5mm",
            flexShrink: 0,
          }}
        >
          {!logoError ? (
            <img
              src={logo}
              alt={empresa}
              style={{ height: "12mm", maxWidth: "26mm", objectFit: "contain" }}
              onError={() => setLogoError(true)}
            />
          ) : (
            <span style={{ fontSize: "7pt", fontWeight: 700 }}>[{empresa}]</span>
          )}
          <span style={{ fontSize: "8pt", fontWeight: 700, letterSpacing: "0.2px" }}>
            {empresa}
          </span>
        </div>

        {/* Data grid */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            flex: 1,
            tableLayout: "fixed",
          }}
        >
          <tbody>
            <tr>
              <LabelCell label="Produto" value={data.produto} />
              <LabelCell label="Nome Comercial" value={data.nome_comercial} />
            </tr>
            <tr>
              <LabelCell label="Fabricante" value={data.fabricante} />
              <LabelCell label="Lote" value={data.lote} />
            </tr>
            <tr>
              <LabelCell label="Registro ANVISA" value={data.registro_anvisa} />
              <LabelCell label="Validade" value={formatVal(data.validade)} />
            </tr>
          </tbody>
        </table>

        {/* Barcode */}
        {data.codigo_barras && (
          <div
            style={{
              textAlign: "center",
              marginTop: "1mm",
              flexShrink: 0,
              overflow: "hidden",
              maxHeight: "13mm",
            }}
          >
            <svg ref={barcodeRef} style={{ maxWidth: "100%", height: "auto" }} />
            {data.codigo_barras.startsWith("INT") && (
              <div
                style={{
                  fontSize: "7pt",
                  fontWeight: 700,
                  color: "#FF0000",
                  marginTop: "0.3mm",
                  letterSpacing: "0.5px",
                }}
              >
                USO INTERNO
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

ProductLabel.displayName = "ProductLabel";

function LabelCell({ label, value }: { label: string; value?: string | null }) {
  return (
    <td
      style={{
        padding: "0.3mm 1mm",
        verticalAlign: "top",
        overflow: "hidden",
        width: "50%",
      }}
    >
      <div
        style={{
          fontSize: "6pt",
          fontWeight: 700,
          color: "#444",
          textTransform: "uppercase",
          lineHeight: 1.2,
          letterSpacing: "0.3px",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "7.5pt",
          fontWeight: 500,
          color: "#000",
          lineHeight: 1.3,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value || "—"}
      </div>
    </td>
  );
}

export default ProductLabel;
