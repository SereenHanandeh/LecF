import React, { useRef, useState } from "react";

import { uploadExcel, uploadExcelFromUrl } from "../api";

import "../assets/FileUplod.css";

export default function FileUploader({ onUploaded }) {
  const inputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [url, setUrl] = useState("");

  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("file");
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");

  // =====================================================
  // اختيار ملف من الجهاز
  // =====================================================

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];

    if (!selectedFile) return;

    const extension = selectedFile.name
      .split(".")
      .pop()
      ?.toLowerCase();

    if (!["xlsx", "xls"].includes(extension)) {
      setError("يرجى اختيار ملف Excel بصيغة XLSX أو XLS.");

      if (inputRef.current) {
        inputRef.current.value = "";
      }

      return;
    }

    setError("");
    setFile(selectedFile);
    setUrl("");
  };

  // =====================================================
  // Drag & Drop
  // =====================================================

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    setDragActive(false);

    if (loading) return;

    const droppedFile = e.dataTransfer.files?.[0];

    if (!droppedFile) return;

    const extension = droppedFile.name
      .split(".")
      .pop()
      ?.toLowerCase();

    if (!["xlsx", "xls"].includes(extension)) {
      setError("يرجى اختيار ملف Excel بصيغة XLSX أو XLS.");
      return;
    }

    setError("");
    setFile(droppedFile);
    setUrl("");
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!loading) {
      setDragActive(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();

    setDragActive(false);
  };

  // =====================================================
  // حذف الملف
  // =====================================================

  const removeFile = () => {
    if (loading) return;

    setFile(null);
    setError("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  // =====================================================
  // تغيير طريقة الرفع
  // =====================================================

  const switchMode = (newMode) => {
    if (loading) return;

    setMode(newMode);
    setError("");

    if (newMode === "file") {
      setUrl("");
    } else {
      setFile(null);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  // =====================================================
  // رفع الملف
  // =====================================================

  const handleUpload = async () => {
    if (mode === "file" && !file) {
      setError("اختاري ملف Excel أولاً.");
      return;
    }

    if (mode === "url" && !url.trim()) {
      setError("أدخلي رابط ملف Excel أولاً.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let res;

      // -----------------------------------------------
      // رفع ملف من الجهاز
      // -----------------------------------------------

      if (mode === "file") {
        const formData = new FormData();

        formData.append("file", file);

        res = await uploadExcel(formData);
      }

      // -----------------------------------------------
      // رفع ملف من رابط
      // -----------------------------------------------

      else {
        res = await uploadExcelFromUrl({
          url: url.trim(),
        });
      }

      console.log("📥 Upload response:", res);

      if (!res || !res.data) {
        throw new Error("No response received from server");
      }

      const responseData = res.data;

      console.log("📦 Full response data:", responseData);

      // =================================================
      // Excel Batch ID
      // =================================================

      const excelBatchId =
        responseData.excel_batch_id ||
        responseData.excelBatchId ||
        responseData.batchId ||
        responseData.batch_id ||
        responseData.data?.excel_batch_id ||
        responseData.data?.excelBatchId ||
        responseData.data?.batchId ||
        responseData.data?.batch_id ||
        null;

      console.log("🆔 Excel Batch ID:", excelBatchId);

      // =================================================
      // Valid Rows
      // =================================================

      const rows = Array.isArray(responseData.data)
        ? responseData.data
        : Array.isArray(responseData.rows)
        ? responseData.rows
        : Array.isArray(responseData.data?.rows)
        ? responseData.data.rows
        : [];

      // =================================================
      // Invalid Rows
      // =================================================

      const invalidRows = Array.isArray(
        responseData.invalidRows
      )
        ? responseData.invalidRows.map((row) => ({
            ...row,
            __invalid: true,
          }))
        : [];

      const finalRows =
        rows.length > 0 ? rows : invalidRows;

      // =================================================
      // Validation
      // =================================================

      if (!excelBatchId) {
        console.error(
          "❌ Excel Batch ID was not returned by Backend"
        );

        console.error(
          "Response structure:",
          responseData
        );

        setError(
          "تم رفع الملف، لكن السيرفر لم يرجع رقم الدفعة."
        );

        return;
      }

      if (finalRows.length === 0) {
        setError(
          "لم يتم العثور على بيانات داخل الملف."
        );

        return;
      }

      console.log("✅ Upload successful");
      console.log("📊 Rows:", finalRows.length);
      console.log("🆔 Batch:", excelBatchId);

      // =================================================
      // Send data to Dashboard
      // =================================================

      if (typeof onUploaded !== "function") {
        console.error(
          "❌ FileUploader: onUploaded is not a function"
        );

        setError(
          "حدث خطأ في ربط رفع الملف مع لوحة التحكم."
        );

        return;
      }

      onUploaded({
        rows: finalRows,
        excelBatchId,
      });

      // =================================================
      // Reset
      // =================================================

      setFile(null);
      setUrl("");

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch (err) {
      console.error(
        "❌ Upload error:",
        err.response || err
      );

      setError(
        err.response?.data?.message ||
          err.message ||
          "حدث خطأ أثناء رفع الملف."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="file-uploader">

      {/* =================================================
          Mode Switch
      ================================================= */}

      <div className="upload-mode-switch">

        {/* رفع ملف */}

        <button
          type="button"
          className={
            mode === "file"
              ? "upload-mode active"
              : "upload-mode"
          }
          onClick={() => switchMode("file")}
          disabled={loading}
        >
          <span className="upload-mode-icon">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M13 3H6C4.9 3 4 3.9 4 5V19C4 20.1 4.9 21 6 21H18C19.1 21 20 20.1 20 19V10L13 3Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />

              <path
                d="M13 3V10H20"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
            </svg>
          </span>

          <span>رفع ملف</span>
        </button>

        {/* من رابط */}

        <button
          type="button"
          className={
            mode === "url"
              ? "upload-mode active"
              : "upload-mode"
          }
          onClick={() => switchMode("url")}
          disabled={loading}
        >
          <span className="upload-mode-icon">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M10 13.5L14 10.5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />

              <path
                d="M7.5 17.5L6.2 18.8C4.43 20.57 1.57 20.57 -0.2 18.8C-1.97 17.03 -1.97 14.17 -0.2 12.4L4.1 8.1C5.87 6.33 8.73 6.33 10.5 8.1"
                transform="translate(2 0)"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />

              <path
                d="M13.5 6.5L14.8 5.2C16.57 3.43 19.43 3.43 21.2 5.2C22.97 6.97 22.97 9.83 21.2 11.6L16.9 15.9C15.13 17.67 12.27 17.67 10.5 15.9"
                transform="translate(-2 0)"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </span>

          <span>من رابط</span>
        </button>
      </div>

      {/* =================================================
          File Mode
      ================================================= */}

      {mode === "file" && (
        <div
          className={`upload-dropzone ${
            dragActive ? "drag-active" : ""
          } ${file ? "has-file" : ""}`}
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => {
            if (!loading) {
              inputRef.current?.click();
            }
          }}
        >
          <input
            ref={inputRef}
            id="excel-file-input"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            disabled={loading}
          />

          <div className="upload-cloud">
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M17.5 19H9C6.239 19 4 16.761 4 14C4 11.414 5.963 9.286 8.507 9.025C9.196 6.716 11.32 5 13.844 5C16.882 5 19.344 7.46 19.344 10.5C19.344 10.67 19.336 10.838 19.321 11.004C20.925 11.24 22.156 12.629 22.156 14.3C22.156 16.36 20.456 18.03 18.397 18.03"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <path
                d="M12 13V20"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />

              <path
                d="M9.5 15.5L12 13L14.5 15.5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {file ? (
            <>
              <strong className="dropzone-title">
                تم اختيار الملف
              </strong>

              <span className="dropzone-file-name">
                {file.name}
              </span>

              <small>
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </small>
            </>
          ) : (
            <>
              <strong className="dropzone-title">
                اسحب ملف Excel إلى هنا
              </strong>

              <span>
                أو اضغط لاختيار الملف من جهازك
              </span>

              <small>
                XLSX أو XLS&nbsp; • &nbsp;حتى 20 MB
              </small>
            </>
          )}
        </div>
      )}

      {/* =================================================
          URL Mode
      ================================================= */}

      {mode === "url" && (
        <div className="url-upload-box">

          <div className="url-input-icon">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M10 13.5L14 10.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />

              <path
                d="M7.5 17.5L6.2 18.8C4.43 20.57 1.57 20.57 -0.2 18.8C-1.97 17.03 -1.97 14.17 -0.2 12.4L4.1 8.1C5.87 6.33 8.73 6.33 10.5 8.1"
                transform="translate(2 0)"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />

              <path
                d="M13.5 6.5L14.8 5.2C16.57 3.43 19.43 3.43 21.2 5.2C22.97 6.97 22.97 9.83 21.2 11.6L16.9 15.9C15.13 17.67 12.27 17.67 10.5 15.9"
                transform="translate(-2 0)"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="url-input-content">

            <label htmlFor="excel-url">
              رابط ملف Excel
            </label>

            <input
              id="excel-url"
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setFile(null);
                setError("");
              }}
              placeholder="https://example.com/lectures.xlsx"
              disabled={loading}
              autoComplete="off"
            />

            <small>
              الصقي هنا الرابط المباشر لملف Excel
            </small>

          </div>
        </div>
      )}

      {/* =================================================
          Selected File
      ================================================= */}

      {file && mode === "file" && (
        <div className="selected-file-card">

          <div className="selected-file-info">

            <div className="excel-file-icon">
              <span>XLS</span>
            </div>

            <div className="selected-file-text">

              <strong title={file.name}>
                {file.name}
              </strong>

              <span>
                ملف Excel&nbsp; • &nbsp;
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>

            </div>
          </div>

          <button
            type="button"
            onClick={removeFile}
            disabled={loading}
            aria-label="إزالة الملف"
            className="remove-file-button"
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M6 6L18 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />

              <path
                d="M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>

        </div>
      )}

      {/* =================================================
          Error
      ================================================= */}

      {error && (
        <div className="file-upload-error">

          <span className="error-icon">
            !
          </span>

          <span>
            {error}
          </span>

        </div>
      )}

      {/* =================================================
          Upload Button
      ================================================= */}

      <button
        type="button"
        className="main-upload-button"
        onClick={handleUpload}
        disabled={
          loading ||
          (mode === "file" && !file) ||
          (mode === "url" && !url.trim())
        }
      >
        {loading ? (
          <>
            جاري تحليل الملف...
          </>
        ) : (
          <>
            <span className="upload-button-icon">

              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M12 16V4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />

                <path
                  d="M7.5 8.5L12 4L16.5 8.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <path
                  d="M4 15V19C4 20.1 4.9 21 6 21H18C19.1 21 20 20.1 20 19V15"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>

            </span>

            {mode === "url"
              ? "تحميل الملف من الرابط"
              : "رفع الملف والمتابعة"}
          </>
        )}
      </button>

    </div>
  );
}