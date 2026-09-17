import React, { useMemo, useState } from "react";
import "../assets/PreviewTable.css";

const getRowDate = (row) =>
  row?.date ??
  row?.Date ??
  row?.DATE ??
  row?.day ??
  row?.Day ??
  "";

const normalizeDate = (value) => {
  if (!value) return "";

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) return "";

    // YYYY-MM-DD أو ISO
    const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);

    if (isoMatch) {
      const [, year, month, day] = isoMatch;

      return `${year}-${String(month).padStart(2, "0")}-${String(
        day
      ).padStart(2, "0")}`;
    }

    // DD/MM/YYYY
    const slashMatch = trimmed.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
    );

    if (slashMatch) {
      const [, day, month, year] = slashMatch;

      return `${year}-${String(month).padStart(2, "0")}-${String(
        day
      ).padStart(2, "0")}`;
    }

    // DD-MM-YYYY
    const dashMatch = trimmed.match(
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/
    );

    if (dashMatch) {
      const [, day, month, year] = dashMatch;

      return `${year}-${String(month).padStart(2, "0")}-${String(
        day
      ).padStart(2, "0")}`;
    }
  }

  if (
    value instanceof Date &&
    !Number.isNaN(value.getTime())
  ) {
    return `${value.getFullYear()}-${String(
      value.getMonth() + 1
    ).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }

  return "";
};

const cellToEditableString = (value) => {
  if (value == null) return "";

  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value
      .map(cellToEditableString)
      .join(" ");
  }

  if (typeof value === "object") {
    if (
      value.richText &&
      Array.isArray(value.richText)
    ) {
      return value.richText
        .map((item) => item?.text ?? "")
        .join(" ");
    }

    if (value.hyperlink) {
      return value.text || value.hyperlink || "";
    }

    return Object.values(value)
      .map(cellToEditableString)
      .join(" ");
  }

  return String(value);
};

const renderCellRecursive = (value) => {
  if (value == null) return "";

  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => (
      <React.Fragment key={index}>
        {index > 0 && " "}
        {renderCellRecursive(item)}
      </React.Fragment>
    ));
  }

  if (typeof value === "object") {
    if (
      value.richText &&
      Array.isArray(value.richText)
    ) {
      return value.richText.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && " "}
          {renderCellRecursive(item?.text ?? "")}
        </React.Fragment>
      ));
    }

    if (value.hyperlink) {
      const text =
        value.text ??
        value.hyperlink ??
        "";

      return (
        <a
          href={value.hyperlink}
          target="_blank"
          rel="noopener noreferrer"
          className="preview-link"
          onClick={(event) => event.stopPropagation()}
        >
          {renderCellRecursive(text)}
        </a>
      );
    }

    return Object.values(value).map((item, index) => (
      <React.Fragment key={index}>
        {index > 0 && " "}
        {renderCellRecursive(item)}
      </React.Fragment>
    ));
  }

  return String(value);
};

export default function PreviewTable({
  rows = [],
  selectedDate = "",
  onEdit,
}) {
  const [editIndex, setEditIndex] = useState(null);
  const [tempRow, setTempRow] = useState({});

  // ==========================================================
  // Filter rows by selected date
  // ==========================================================

  const filteredRows = useMemo(() => {
    if (!selectedDate) {
      return rows;
    }

    return rows.filter((row) => {
      return (
        normalizeDate(getRowDate(row)) ===
        normalizeDate(selectedDate)
      );
    });
  }, [rows, selectedDate]);

  // ==========================================================
  // Headers
  // ==========================================================

  const headers = useMemo(() => {
    if (!filteredRows.length) {
      return [];
    }

    return Object.keys(filteredRows[0]).filter(
      (header) => header !== "__invalid"
    );
  }, [filteredRows]);

  // ==========================================================
  // Edit
  // ==========================================================

  const startEdit = (index, row) => {
    setEditIndex(index);
    setTempRow({ ...row });
  };

  const cancelEdit = () => {
    setEditIndex(null);
    setTempRow({});
  };

  const handleSave = () => {
    if (editIndex === null || !onEdit) {
      return;
    }

    const originalRow = filteredRows[editIndex];

    const originalIndex = rows.indexOf(originalRow);

    if (originalIndex === -1) {
      cancelEdit();
      return;
    }

    onEdit(originalIndex, {
      ...tempRow,
      __invalid: false,
    });

    setEditIndex(null);
    setTempRow({});
  };

  // ==========================================================
  // Empty
  // ==========================================================

  if (!rows || rows.length === 0) {
    return (
      <div className="table-empty compact-empty">

        <strong>لا توجد بيانات</strong>

        <span>
         - ارفع ملف Excel لعرض البيانات.
        </span>
      </div>
    );
  }

  // ==========================================================
  // No rows for selected date
  // ==========================================================

  if (selectedDate && filteredRows.length === 0) {
    return (
      <div className="table-empty compact-empty">
        <div className="table-empty-icon">📅</div>

        <strong>
          لا توجد محاضرات لهذا اليوم
        </strong>

        <span>
          لم يتم العثور على سجلات في التاريخ المحدد.
        </span>
      </div>
    );
  }

  // ==========================================================
  // Render
  // ==========================================================

  return (
    <div className="preview-table-component compact-table">

      {/* Table header */}
      <div className="preview-table-topbar">

        <div className="preview-table-info">

          <div className="preview-table-icon">
            📋
          </div>

          <div>
            <strong>
              بيانات المحاضرات
            </strong>

            <span>
              {selectedDate
                ? `${filteredRows.length} سجل لهذا اليوم`
                : `${filteredRows.length} سجل`}
            </span>
          </div>

        </div>

        <div className="preview-table-count">
          {filteredRows.length}
        </div>

      </div>

      {/* Scrollable table */}
      <div className="preview-table-scroll compact-scroll">

        <table className="modern-preview-table compact-preview-table">

          <thead>
            <tr>

              <th className="row-number-header">
                #
              </th>

              {headers.map((header) => (
                <th key={header}>
                  {header}
                </th>
              ))}

              <th className="action-header">
                إجراء
              </th>

            </tr>
          </thead>

          <tbody>

            {filteredRows.map((row, index) => {

              const isEditing =
                editIndex === index;

              const isInvalid =
                Boolean(row?.__invalid);

              return (
                <tr
                  key={`${index}-${row?.id ?? ""}`}
                  className={
                    isInvalid
                      ? "invalid-row"
                      : ""
                  }
                >

                  {/* Row number */}
                  <td className="row-number">
                    {index + 1}
                  </td>

                  {isEditing ? (
                    <>
                      {headers.map((header) => (
                        <td
                          key={header}
                          className="editing-cell"
                        >
                          <input
                            type="text"
                            value={cellToEditableString(
                              tempRow[header] ??
                                row[header]
                            )}
                            onChange={(event) =>
                              setTempRow(
                                (previous) => ({
                                  ...previous,
                                  [header]:
                                    event.target.value,
                                })
                              )
                            }
                          />
                        </td>
                      ))}

                      <td className="row-actions">

                        <button
                          type="button"
                          className="table-action save"
                          onClick={handleSave}
                        >
                          ✓
                          <span>حفظ</span>
                        </button>

                        <button
                          type="button"
                          className="table-action cancel"
                          onClick={cancelEdit}
                        >
                          ×
                          <span>إلغاء</span>
                        </button>

                      </td>
                    </>
                  ) : (
                    <>
                      {headers.map((header) => (
                        <td
                          key={header}
                          title={cellToEditableString(
                            row[header]
                          )}
                        >
                          <div className="cell-content">
                            {renderCellRecursive(
                              row[header]
                            )}
                          </div>
                        </td>
                      ))}

                      <td className="row-actions">

                        {!isInvalid ? (
                          <button
                            type="button"
                            className="table-action edit"
                            onClick={() =>
                              startEdit(index, row)
                            }
                          >
                            ✎
                            <span>تعديل</span>
                          </button>
                        ) : (
                          <span className="invalid-label">
                            ⚠ غير صالح
                          </span>
                        )}

                      </td>
                    </>
                  )}

                </tr>
              );
            })}

          </tbody>

        </table>

      </div>

      {/* Warning */}
      {filteredRows.some(
        (row) => row?.__invalid
      ) && (
        <div className="table-warning compact-warning">

          <span className="table-warning-icon">
            ⚠
          </span>

          <div>
            <strong>
              بعض الصفوف تحتاج مراجعة
            </strong>

            <span>
              توجد بيانات ناقصة أو غير صالحة.
            </span>
          </div>

        </div>
      )}

    </div>
  );
}