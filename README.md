# 🌐 IoT Management App

A full-stack, real-time **IoT Device Management Platform** built with the PERN stack (PostgreSQL, Express.js, React, Node.js), WebSockets, Styled Components, and Role-Based Access Control (RBAC). Developed to monitor and manage IoT devices and sensor data efficiently with secure authentication and a sleek UI.

---

## 🚀 Features

- ✅ **JWT Authentication** with Login/Signup
- ✅ **Role-Based Access Control (User/Admin)**
- ✅ **Live Sensor Data** via WebSocket
- ✅ **Create / Update / Delete Devices**
- ✅ **Styled Components Theming** (Light/Dark toggle)
- ✅ **Responsive UI** with professional design
- ✅ **PostgreSQL & Sequelize ORM**
- ✅ **Secure Backend with Helmet, Rate Limiting, Token Validation**
- ✅ **Docker-ready Backend**

---

## 🛠 Tech Stack

**Frontend:**
- React.js + TypeScript
- Styled Components
- Axios + React Router
- WebSocket integration

**Backend:**
- Node.js + Express.js + TypeScript
- PostgreSQL + Sequelize
- WebSocket Server
- JWT Auth, Helmet, CORS, Rate Limiting

---

## 📦 Installation

### 1. Clone the Repo

```bash
git clone https://github.com/cemoozdemir/IOT-Management-App.git
cd IOT-Management-App

cd backend
npm install
cp .env.example .env
# Edit .env with your DB credentials

npx sequelize-cli db:migrate
npm run dev

cd ../frontend
npm install
npm start
