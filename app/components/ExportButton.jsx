import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

/**
 * Robust CSV Export Button.
 * Uses authenticated fetch to prevent Shopify iframe auth bounce (which downloads HTML as .htm).
 */
export function ExportButton({
  url,
  filename,
  children,
  className = "btn-secondary-link",
  icon = true,
  disabled = false,
}) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (e) => {
    e.preventDefault();
    if (downloading || disabled) return;

    setDownloading(true);
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "text/csv, application/csv, text/plain, */*",
        },
      });

      if (!response.ok) {
        throw new Error(`Export failed (${response.status} ${response.statusText})`);
      }

      const contentType = response.headers.get("content-type") || "";
      // If server somehow returned HTML bounce page, report error instead of saving .htm
      if (contentType.includes("text/html")) {
        throw new Error("Session expired or authentication bounce returned HTML instead of CSV.");
      }

      const blob = await response.blob();
      const csvBlob = new Blob([blob], { type: "text/csv;charset=utf-8;" });
      const objectUrl = window.URL.createObjectURL(csvBlob);

      const safeFilename = filename.toLowerCase().endsWith(".csv") ? filename : `${filename}.csv`;

      const link = document.createElement("a");
      link.href = objectUrl;
      link.setAttribute("download", safeFilename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error("[ExportButton] Download error:", err);
      alert(err.message || "Failed to download CSV file.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={downloading || disabled}
      className={className}
      style={{ cursor: downloading ? "wait" : "pointer" }}
    >
      {downloading ? (
        <>
          <Loader2 size={16} className="spin-icon" style={{ animation: "spin 1s linear infinite" }} />
          <span>Exporting...</span>
        </>
      ) : (
        <>
          {icon && <Download size={16} />}
          <span>{children || "Export CSV"}</span>
        </>
      )}
    </button>
  );
}
