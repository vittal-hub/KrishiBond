# 🌾 KrishiBond – Assured Contract Farming Platform

KrishiBond is a full-stack **MERN** application that connects **farmers** and **buyers** through secure and transparent **contract farming**. The platform enables direct communication, digital contract management, price negotiation, secure payment simulation, and crop marketplace features, helping eliminate intermediaries while providing farmers with assured buyers and predictable income.

---

# 🚀 Features

## 👨‍🌾 Farmer

* Register and manage profile
* Create, edit, and delete crop listings
* Upload crop images
* Receive buyer proposals
* Negotiate contract terms
* Accept or reject proposals
* View contracts
* Track payments
* Dashboard with analytics
* Notifications
* Secure authentication

---

## 🛒 Buyer

* Register and manage profile
* Browse crop marketplace
* Search and filter crops
* View farmer profiles
* Send contract proposals
* Negotiate pricing
* Track contracts
* Dashboard
* Notifications
* Secure authentication

---

## 📄 Contract Management

* Digital contract proposals
* Price negotiation
* Contract approval workflow
* Contract status tracking
* Contract history
* Downloadable contract details

---

## 💳 Payment System

* Demo payment gateway
* Simulated escrow workflow
* Payment history
* Transaction records
* Receipt generation

---

## 📢 Notifications

* Proposal notifications
* Contract updates
* Payment updates
* Real-time UI notifications

---

## 🔐 Authentication & Security

* JWT Authentication
* Refresh Token
* Role-Based Access Control
* Protected Routes
* Password Hashing
* Input Validation
* Helmet Security
* Rate Limiting
* CORS Protection

---

## 📊 Dashboards

### Farmer Dashboard

* Active Contracts
* Crop Listings
* Earnings
* Notifications

### Buyer Dashboard

* Purchased Contracts
* Active Proposals
* Payments
* Notifications

### Admin Dashboard

* User Management
* Contract Monitoring
* Reports
* Platform Analytics

---

# 🛠 Tech Stack

## Frontend

* React.js
* Vite
* Tailwind CSS
* React Router
* Axios
* React Hook Form
* Zod
* Zustand
* Recharts
* React Hot Toast
* Lucide React

---

## Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* JWT
* Cookie Parser
* Helmet
* CORS
* Morgan
* Compression
* Multer
* Cloudinary
* Nodemailer
* Winston

---

## Database

* MongoDB Atlas

---

## Deployment

Frontend

* Netlify

Backend

* Render

Image Storage

* Cloudinary

---

# 📂 Project Structure

```text
KrishiBond/
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── store/
│   │   ├── utils/
│   │   ├── routes/
│   │   └── App.jsx
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── server.js
│   └── package.json
│
└── README.md
```

---

# ✨ Core Modules

* Authentication
* Farmer Management
* Buyer Management
* Crop Marketplace
* Contract Management
* Proposal Management
* Dashboard
* Notifications
* Profile Management
* Payment Simulation
* Reports

---

# 🔄 Application Workflow

```text
Farmer Registers
        │
        ▼
Creates Crop Listing
        │
        ▼
Buyer Browses Marketplace
        │
        ▼
Buyer Sends Proposal
        │
        ▼
Farmer Reviews Proposal
        │
        ▼
Negotiation
        │
        ▼
Digital Contract
        │
        ▼
Demo Payment
        │
        ▼
Contract Completed
```

---

# 📦 Installation

## Clone Repository

```bash
git clone https://github.com/<your-username>/KrishiBond.git
cd KrishiBond
```

---

## Backend

```bash
cd backend
npm install
npm run dev
```

---

## Frontend

```bash
cd frontend
npm install
npm run dev
```

---

# 🔑 Environment Variables

## Backend (.env)

```env
NODE_ENV=development
PORT=5000

MONGO_URI=your_mongodb_uri

JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret

FRONTEND_URL=http://localhost:5173

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_app_password
SMTP_FROM_EMAIL=your_email
SMTP_FROM_NAME=KrishiBond
```

---

## Frontend (.env)

```env
VITE_API_URL=http://localhost:5000/api
```

---

# 📸 Screenshots

Add screenshots such as:

* Landing Page
* Farmer Dashboard
* Buyer Dashboard
* Marketplace
* Contract Proposal
* Dashboard Analytics
* Payment Simulation

---

# 🔮 Future Enhancements

* AI Crop Price Prediction
* AI Contract Risk Analysis
* Weather Forecast Integration
* Government Scheme Recommendations
* Multi-language Support
* Voice Assistance
* Real-Time Chat
* Live Notifications
* Mobile Application
* Real Payment Gateway Integration
* Digital Signature Support
* Blockchain-based Smart Contracts

---

# 📚 Learning Outcomes

This project demonstrates practical implementation of:

* Full-Stack MERN Development
* REST API Design
* Authentication & Authorization
* MongoDB Data Modeling
* Cloud Image Management
* Responsive UI Design
* Secure Backend Development
* Deployment on Netlify & Render
* Production-Ready Project Architecture

---

# 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push the branch
5. Open a Pull Request

---

# 📄 License

This project is licensed under the MIT License.

---

# 👨‍💻 Author

**Darpally Vittal Prasad**

* GitHub: https://github.com/vittal-hub
* LinkedIn: *(Add your LinkedIn profile here)*

---

⭐ If you found this project useful, consider giving it a **Star** on GitHub!
