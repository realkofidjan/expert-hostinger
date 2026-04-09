# Expert Office Furnish v2.0

Expert Office Furnish is a premium, high-end E-commerce and Workspace Solutions platform designed for a seamless furniture shopping experience and professional office interior services. Built with a modern architectural aesthetic, the system features robust administrative controls, dynamic product filtering, and a cinematic user interface.

## 🌟 Key Features
- **Cinematic Experience**: Immersive, glassmorphic UI with smooth animations and dark mode support.
- **Dynamic Catalog**: Advanced price range filtering and real-time inventory tracking.
- **Admin Portal**: Comprehensive dashboard for order management, user account control, and automated receipt generation.
- **Service Solutions**: Dedicated sections for Office Interior Design, Relocation, and Ergonomic Consultation.
- **Mobile Money Integration**: Secure payment flow optimized for regional mobile money transitions.

## 📸 System Walkthrough

![Expert Office Walkthrough](docs/videos/system_walkthrough.webp)

*A comprehensive look at our cinematic landing page and robust administrative control center.*

---

## 👥 Contributors
- **RealKofi** - Lead Developer & Visionary

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)
- **MySQL** (Local server or cloud instance)
- **Git**

### 2. Cloning the Project
```bash
git clone https://github.com/your-username/expert-v2.git
cd expert-v2
```

### 3. Database Setup
1. Create a database named `expert_v2` (or your preferred name) in MySQL.
2. Import the schema provided in `docs/schema.sql`.

### 4. Configuration
Create a `.env` file in the **backend** directory:
```env
PORT=5001
DB_HOST=localhost
DB_USER=root
DB_PASS=your_password
DB_NAME=expert_v2
JWT_SECRET=your_super_secret_key
PAYSTACK_SECRET_KEY=your_paystack_key
```

### 5. Running the Project

#### Start the Backend:
```bash
cd backend
npm install
npm run dev
```

#### Start the Frontend:
```bash
cd frontend
npm install
npm run dev
```

The application will be available at:
- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:5001`

---

## 🔐 Admin Credentials
To access the Administrative Portal (`/admin`):
- **Email**: `admin@admin.com`
- **Password**: `admin`

---

## 🛠 Tech Stack
- **Frontend**: React.js, Tailwind CSS, Framer Motion, Lucide Icons
- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **Real-time**: Socket.io

© 2026 Expert Office Furnish. All Rights Reserved.
