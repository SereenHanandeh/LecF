import React, { useState } from "react";

export default function PreviewTable({ rows, onEdit }) {
  const [editIndex, setEditIndex] = useState(null);
  const [tempRow, setTempRow] = useState({});

  const handleSave = () => {
    onEdit(editIndex, tempRow);
    setEditIndex(null);
    setTempRow({});
  };

  const renderCellRecursive = (value) => {
    if (value == null) return "";

    if (typeof value === "string" || typeof value === "number") return value;

    if (Array.isArray(value)) {
      return value.map((v, idx) => <span key={idx}>{renderCellRecursive(v)}</span>);
    }

    if (typeof value === "object") {
      if (value.richText && Array.isArray(value.richText)) {
        return value.richText.map((item, idx) => (
          <span key={idx}>{renderCellRecursive(item.text ?? "")}</span>
        ));
      }

      if (value.hyperlink) {
        const text = value.text ?? value.hyperlink ?? "";
        return (
          <a href={value.hyperlink || "#"} target="_blank" rel="noopener noreferrer">
            {renderCellRecursive(text)}
          </a>
        );
      }

      return Object.values(value).map((v, idx) => (
        <span key={idx}>{renderCellRecursive(v)}</span>
      ));
    }

    return String(value);
  };

  const cellToEditableString = (value) => {
    if (value == null) return "";

    if (typeof value === "string" || typeof value === "number") return value;

    if (Array.isArray(value)) return value.map(cellToEditableString).join(" ");

    if (typeof value === "object") {
      if (value.richText && Array.isArray(value.richText)) {
        return value.richText.map((item) => item.text ?? "").join(" ");
      }
      if (value.hyperlink) {
        return value.text || value.hyperlink || "";
      }
      return Object.values(value).map(cellToEditableString).join(" ");
    }

    return String(value);
  };

  if (!rows || rows.length === 0) return <p>No data to display.</p>;

  const headers = Object.keys(rows[0]).filter((h) => h !== "__invalid");

  return (
    <div>
      <h3>👀 Preview Data</h3>
      <table border="1" cellPadding="5" style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            {headers.map((k) => (
              <th key={k}>{k}</th>
            ))}
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) =>
            editIndex === i ? (
              <tr key={i} style={row.__invalid ? { backgroundColor: "#ffe0e0" } : {}}>
                {headers.map((k) => (
                  <td key={k}>
                    <input
                      value={cellToEditableString(tempRow[k] ?? row[k])}
                      onChange={(e) =>
                        setTempRow({ ...tempRow, [k]: e.target.value })
                      }
                    />
                  </td>
                ))}
                <td>
                  <button onClick={handleSave}>Save</button>
                  <button onClick={() => setEditIndex(null)}>Cancel</button>
                </td>
              </tr>
            ) : (
              <tr key={i} style={row.__invalid ? { backgroundColor: "#ffe0e0" } : {}}>
                {headers.map((k, j) => (
                  <td key={j}>{renderCellRecursive(row[k])}</td>
                ))}
                <td>
                  {!row.__invalid && (
                    <button
                      onClick={() => {
                        setEditIndex(i);
                        setTempRow(row);
                      }}
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>

      {/* تنبيه بعد الجدول */}
      {rows.some((r) => r.__invalid) && (
        <p style={{ color: "red", marginTop: "10px" }}>
          ⚠️ بعض الصفوف غير صالحة بسبب نقص الحقول المطلوبة. يرجى مراجعتها وتعديلها.
        </p>
      )}
    </div>
  );
}
