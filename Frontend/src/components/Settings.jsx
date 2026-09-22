import React from "react";
import Sidebar from "../components/Sidebar.jsx";
import "./simple-page.css";

export default function Settings() {
  return (
    <div className="simple-layout" dir="rtl">
      <Sidebar />

      <main className="simple-main">
        <div className="simple-breadcrumb">
          LectureFlow / الإعدادات
        </div>

        <h1>الإعدادات</h1>

        <p>
          إعدادات نظام توزيع المشرفين.
        </p>

        <div className="empty-page">
          <div className="empty-page-icon">⚙️</div>

          <h2>إعدادات النظام</h2>

          <span>
            ستتم إضافة إعدادات النظام هنا.
          </span>

          <span className="coming-soon-badge"> سيتم الإضافة قريبًا</span>
        </div>
      </main>
    </div>
  );
}