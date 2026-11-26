# Sistem Informasi Manajemen Aset TIK & Deteksi Dini Indikasi *Fraud* (*K-Means Clustering*)

**Studi Kasus:** Bidang Teknologi Informasi dan Komunikasi (BID TIK) Polda D.I. Yogyakarta  
**Penulis / Pengembang:** Dimas Oktafian Prasetyo  
**Dokumen PRD:** [doc/PRD_SISTEM_ASET_KMEANS_BID_TIK.md](doc/PRD_SISTEM_ASET_KMEANS_BID_TIK.md)

---

## Arsitektur Sistem
- **Frontend:** React 18 + Vite + Ant Design 5 + Redux Toolkit (`frontend/`)
- **Backend:** Node.js + Express.js RESTful API (`backend/`)
- **Database:** MySQL via XAMPP (`127.0.0.1:3306`)

---

## Cara Menjalankan (Development)

### 1. Backend
```powershell
cd backend
npm install
# Salin backend/.env.example menjadi backend/.env dan sesuaikan konfigurasi MySQL XAMPP
npm run setup
npm run dev
```
Server berjalan di `http://localhost:8888`.

### 2. Frontend
```powershell
cd frontend
npm install
# Salin frontend/.env.example menjadi frontend/.env
npm run dev
```
Aplikasi web berjalan di `http://localhost:3000`.
