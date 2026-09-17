import React, { useState } from "react";
import { uploadExcel, uploadExcelFromUrl } from "../api";

export default function FileUpload({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("file");

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];

    if (!selectedFile) {
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setUrl("");
  };

  const handleUpload = async () => {
    if (!file && !url.trim()) {
      alert("اختاري ملف Excel أو أدخلي رابط الملف.");
      return;
    }

    setLoading(true);

    try {
      let res;

      if (file) {
        const formData = new FormData();
        formData.append("file", file);

        res = await uploadExcel(formData);
      } else {
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

      // ==============================
      // Excel Batch ID
      // ==============================

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

      // ==============================
      // Valid Rows
      // ==============================

      const rows = Array.isArray(responseData.data)
        ? responseData.data
        : Array.isArray(responseData.rows)
        ? responseData.rows
        : Array.isArray(responseData.data?.rows)
        ? responseData.data.rows
        : [];

      // ==============================
      // Invalid Rows
      // ==============================

      const invalidRows = Array.isArray(responseData.invalidRows)
        ? responseData.invalidRows.map((row) => ({
            ...row,
            __invalid: true,
          }))
        : [];

      const finalRows = rows.length > 0 ? rows : invalidRows;

      // ==============================
      // Validation
      // ==============================

      if (!excelBatchId) {
        console.error(
          "❌ Excel Batch ID was not returned by Backend"
        );

        console.error(
          "Response structure:",
          responseData
        );

        alert(
          "⚠️ تم رفع الملف، لكن السيرفر لم يرجع Excel Batch ID."
        );

        return;
      }

      if (finalRows.length === 0) {
        alert(
          "⚠️ لم يتم العثور على بيانات صالحة داخل الملف."
        );

        return;
      }

      console.log("✅ Upload successful");
      console.log("📊 Rows:", finalRows.length);
      console.log("🆔 Batch:", excelBatchId);

      // ==============================
      // Send data to Dashboard
      // ==============================

      if (typeof onUploaded !== "function") {
        console.error(
          "❌ FileUpload: onUploaded is not a function"
        );

        alert(
          "حدث خطأ في ربط رفع الملف مع لوحة التحكم."
        );

        return;
      }

      onUploaded({
        rows: finalRows,
        excelBatchId,
      });

      // Reset UI after successful upload
      setFile(null);
      setUrl("");
    } catch (err) {
      console.error(
        "❌ Upload error:",
        err.response || err
      );

      alert(
        "Upload failed: " +
          (
            err.response?.data?.message ||
            err.message ||
            "Unknown error"
          )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="file-upload-card">

      {/* ==============================
          Header
      ============================== */}

      <div className="file-upload-heading">
        <div className="file-upload-heading-icon">
          <svg
            width="24"
            height="24"
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
              d="M4 14.5V18C4 19.1 4.9 20 6 20H18C19.1 20 20 19.1 20 18V14.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div>
          <span className="section-kicker">
            STEP 01
          </span>

          <h3>
            Import lecture data
          </h3>

          <p>
            ارفعي ملف المحاضرات لبدء إنشاء خطة التوزيع
          </p>
        </div>
      </div>

      {/* ==============================
          Mode Switch
      ============================== */}

      <div className="upload-mode-switch">

        <button
          type="button"
          className={
            mode === "file"
              ? "upload-mode active"
              : "upload-mode"
          }
          onClick={() => {
            setMode("file");
            setUrl("");
          }}
          disabled={loading}
        >
          <span>📁</span>
          Upload file
        </button>

        <button
          type="button"
          className={
            mode === "url"
              ? "upload-mode active"
              : "upload-mode"
          }
          onClick={() => {
            setMode("url");
            setFile(null);
          }}
          disabled={loading}
        >
          <span>🔗</span>
          From URL
        </button>

      </div>

      {/* ==============================
          File Upload
      ============================== */}

      {mode === "file" && (
        <div className="upload-dropzone">

          <input
            id="excel-file-input"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            disabled={loading}
          />

          <label
            htmlFor="excel-file-input"
            className="upload-dropzone-content"
          >
            <div className="upload-cloud">

              <svg
                width="32"
                height="32"
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

            <strong>
              {file
                ? file.name
                : "Drop your Excel file here"}
            </strong>

            <span>
              أو اضغطي لاختيار الملف من جهازك
            </span>

            <small>
              XLSX أو XLS • حتى 20 MB
            </small>

          </label>
        </div>
      )}

      {/* ==============================
          URL Upload
      ============================== */}

      {mode === "url" && (
        <div className="url-upload-box">

          <div className="url-input-icon">
            🔗
          </div>

          <div className="url-input-content">

            <label htmlFor="excel-url">
              Excel file URL
            </label>

            <input
              id="excel-url"
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setFile(null);
              }}
              placeholder="https://example.com/lectures.xlsx"
              disabled={loading}
            />

            <small>
              أدخلي رابط مباشر لملف Excel
            </small>

          </div>

        </div>
      )}

      {/* ==============================
          Selected File
      ============================== */}

      {file && mode === "file" && (
        <div className="selected-file-card">

          <div className="selected-file-info">

            <div className="excel-file-icon">
              XLS
            </div>

            <div>
              <strong>
                {file.name}
              </strong>

              <span>
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>

          </div>

          <button
            type="button"
            onClick={() => setFile(null)}
            disabled={loading}
            aria-label="Remove file"
          >
            ×
          </button>

        </div>
      )}

      {/* ==============================
          Upload Button
      ============================== */}

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
            <span className="button-spinner" />
            جاري تحليل الملف...
          </>
        ) : (
          <>
            <span>↑</span>
            Import & continue
          </>
        )}

      </button>

    </div>
  );
}