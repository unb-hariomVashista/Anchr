import { useState, useRef } from "react";
import { UploadCloud, FileSpreadsheet, X, AlertTriangle, CheckCircle2 } from "lucide-react";

export function FileDropzone({
  name = "file",
  accept = ".csv",
  maxSizeMB = 1,
  onFileSelect,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const validateAndSetFile = (file) => {
    setError(null);
    if (!file) return;

    // Check extension strictly
    const isCsvExtension = file.name.toLowerCase().endsWith(".csv");
    if (!isCsvExtension) {
      setError("Invalid file type. Only CSV files (.csv) are supported.");
      setSelectedFile(null);
      if (inputRef.current) inputRef.current.value = "";
      if (onFileSelect) onFileSelect(null);
      return;
    }

    // Check size limit (default 1MB)
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      setError(`File size exceeds limit (${maxSizeMB} MB). Please choose a smaller CSV file.`);
      setSelectedFile(null);
      if (inputRef.current) inputRef.current.value = "";
      if (onFileSelect) onFileSelect(null);
      return;
    }

    setSelectedFile(file);
    if (onFileSelect) onFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      // Sync with native input element files if dataTransfer allows
      const container = new DataTransfer();
      container.items.add(file);
      if (inputRef.current) inputRef.current.files = container.files;
      validateAndSetFile(file);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleRemove = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
    if (onFileSelect) onFileSelect(null);
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="file-dropzone-container">
      {/* Hidden file input for standard form submission */}
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={accept}
        required={!selectedFile}
        onChange={handleFileChange}
        style={{ display: "none" }}
        id={`file-input-${name}`}
      />

      {!selectedFile ? (
        <label
          htmlFor={`file-input-${name}`}
          className={`dropzone-box ${isDragging ? "dragging" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="dropzone-icon-circle">
            <UploadCloud size={32} color="#059669" />
          </div>
          <div className="dropzone-text-group">
            <span className="dropzone-main-text">
              <strong>Click to upload</strong> or drag and drop your CSV file here
            </span>
            <span className="dropzone-sub-text">
              Supports .CSV spreadsheets up to {maxSizeMB}MB
            </span>
          </div>
        </label>
      ) : (
        <div className="selected-file-card">
          <div className="selected-file-icon">
            <FileSpreadsheet size={24} color="#047857" />
          </div>
          <div className="selected-file-details">
            <div className="selected-file-name-row">
              <span className="selected-file-name">{selectedFile.name}</span>
              <span className="selected-file-badge">
                <CheckCircle2 size={12} /> Ready
              </span>
            </div>
            <span className="selected-file-size">{formatSize(selectedFile.size)}</span>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="btn-remove-file"
            title="Remove selected file"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="dropzone-error-banner">
          <AlertTriangle size={15} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
