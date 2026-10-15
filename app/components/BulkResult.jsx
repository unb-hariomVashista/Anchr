import { Link } from "react-router";
import { Tag, Layers, FileSpreadsheet, CheckCircle2, AlertCircle, FileCheck, XCircle } from "lucide-react";

/** Shows the outcome of a bulk generate / CSV import / dry run with rich styling matching the app. */
export function BulkResult({ result, noun = "Code / Title" }) {
  if (!result) return null;

  if (result.error) {
    return (
      <div className="alert-card warning" style={{ backgroundColor: "#fef2f2", borderColor: "#fecaca", color: "#991b1b", marginBottom: 20 }}>
        <div className="alert-card-icon">
          <XCircle size={20} color="#dc2626" />
        </div>
        <div className="alert-card-info">
          <span className="alert-card-title">Bulk operation failed</span>
          <span className="alert-card-text">{result.error}</span>
        </div>
      </div>
    );
  }

  const dry = result.mode === "validate";
  const hasFailures = result.failed > 0;
  const allSuccessful = result.created > 0 && result.failed === 0;

  return (
    <div className="form-card bulk-result-card" style={{ marginBottom: 24 }}>
      <div className="bulk-result-header">
        <div className="bulk-result-title-row">
          <div className="bulk-result-icon-circle" style={{ backgroundColor: allSuccessful ? "#ecfdf5" : hasFailures ? "#fffbebe" : "#f0f9ff" }}>
            {allSuccessful ? (
              <CheckCircle2 size={20} color="#059669" />
            ) : hasFailures ? (
              <AlertCircle size={20} color="#d97706" />
            ) : (
              <FileCheck size={20} color="#0284c7" />
            )}
          </div>
          <div>
            <h3 className="bulk-result-heading">
              {dry ? "Validation Summary" : "Bulk Generation Summary"}
            </h3>
            <p className="bulk-result-subheading">
              {dry
                ? `${result.created} valid row${result.created === 1 ? "" : "s"}, ${result.failed} issue${result.failed === 1 ? "" : "s"} found.`
                : `Successfully processed: ${result.created} created, ${result.failed} failed.`}
            </p>
          </div>
        </div>

        <div className="bulk-stats-pills">
          <span className="stat-pill success">
            <strong>{result.created}</strong> {dry ? "Valid" : "Created"}
          </span>
          {result.failed > 0 && (
            <span className="stat-pill failed">
              <strong>{result.failed}</strong> Failed
            </span>
          )}
        </div>
      </div>

      {result.rows && result.rows.length > 0 && (
        <div className="bulk-table-container">
          <table className="bulk-result-table">
            <thead>
              <tr>
                <th style={{ width: "60px" }}>Row</th>
                <th>{noun}</th>
                <th style={{ width: "120px" }}>Status</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((r) => (
                <tr key={r.line} className={r.ok ? "row-ok" : "row-bad"}>
                  <td className="row-num">#{r.line}</td>
                  <td className="row-label">
                    <code>{r.label}</code>
                  </td>
                  <td>
                    {r.ok ? (
                      <span className="bulk-status-badge ok">
                        <CheckCircle2 size={12} /> {dry ? "Valid" : "Created"}
                      </span>
                    ) : (
                      <span className="bulk-status-badge bad">
                        <XCircle size={12} /> Failed
                      </span>
                    )}
                  </td>
                  <td className="row-details">{r.ok ? "Ready for use" : r.error || "Validation error"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const TAB_ICONS = {
  normal: Tag,
  bulk: Layers,
  import: FileSpreadsheet,
};

export function BulkTabs({ base, tab, labels }) {
  return (
    <div className="segmented-tabs-wrapper">
      <div className="segmented-tabs-container">
        {Object.entries(labels).map(([key, label]) => {
          const IconComponent = TAB_ICONS[key] || Tag;
          const isActive = tab === key;
          return (
            <Link
              key={key}
              to={`${base}?tab=${key}`}
              className={`segmented-tab-btn ${isActive ? "active" : ""}`}
            >
              <IconComponent size={15} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
