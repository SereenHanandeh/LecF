import React, { useState } from "react";

import {
  uploadExcel,
  uploadExcelFromUrl,
} from "../api";

export default function FileUpload({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file && !url) {
      alert("Select a file or enter a URL.");
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
        res = await uploadExcelFromUrl({ url });
      }

      console.log("📥 Upload response:", res);

      if (!res || !res.data) {
        throw new Error("No response received from server");
      }

      const responseData = res.data;

      console.log(
        "📦 Full response data:",
        responseData
      );

      /*
       * استخراج Batch ID الحقيقي من السيرفر
       *
       * نحاول أكثر من اسم حتى يتوافق
       * مع شكل response الموجود في Backend.
       */
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

      console.log(
        "🆔 Excel Batch ID:",
        excelBatchId
      );

      /*
       * استخراج الصفوف
       */
      const rows =
        Array.isArray(responseData.data)
          ? responseData.data
          : Array.isArray(responseData.rows)
          ? responseData.rows
          : Array.isArray(responseData.data?.rows)
          ? responseData.data.rows
          : [];

      /*
       * إذا ما وجدنا rows صحيحة،
       * نعرض invalid rows للـ Preview.
       */
      const invalidRows =
        Array.isArray(responseData.invalidRows)
          ? responseData.invalidRows.map((r) => ({
              ...r,
              __invalid: true,
            }))
          : [];

      const finalRows =
        rows.length > 0
          ? rows
          : invalidRows;

      /*
       * لازم يكون عندنا Batch ID
       * لأن Create Plan يحتاج UUID.
       */
      if (!excelBatchId) {
        console.error(
          "❌ Excel Batch ID was not returned by Backend"
        );

        console.error(
          "Response structure:",
          responseData
        );

        alert(
          "⚠️ Upload succeeded, but Excel Batch ID was not returned by the server."
        );

        return;
      }

      if (finalRows.length === 0) {
        alert(
          "⚠️ No valid rows found in uploaded file"
        );

        return;
      }

      console.log(
        "✅ Upload successful"
      );

      console.log(
        "📊 Rows:",
        finalRows.length
      );

      console.log(
        "🆔 Batch:",
        excelBatchId
      );

      /*
       * نرسل للـ Dashboard:
       *
       * {
       *   rows: [...],
       *   excelBatchId: "UUID"
       * }
       */
      onUploaded({
        rows: finalRows,
        excelBatchId: excelBatchId,
      });

    } catch (err) {
      console.error(
        "❌ Upload error:",
        err.response || err
      );

      alert(
        "Upload failed: " +
          (
            err.response?.data?.message ||
            err.message
          )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3>📂 Upload Excel</h3>

      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={(e) =>
          setFile(e.target.files[0])
        }
      />

      <div style={{ marginTop: "10px" }}>
        or paste URL:
      </div>

      <input
        type="text"
        value={url}
        onChange={(e) =>
          setUrl(e.target.value)
        }
        placeholder="Excel URL"
        style={{
          width: "400px",
          marginRight: "10px",
        }}
      />

      <button
        onClick={handleUpload}
        disabled={loading}
        style={{ marginTop: "10px" }}
      >
        {loading
          ? "Uploading..."
          : "Upload"}
      </button>
    </div>
  );
}
