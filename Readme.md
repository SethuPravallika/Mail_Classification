
📧 Gmail Classification App

A web application that allows users to:

- Log in via **Google OAuth**
- Provide their **OpenAI API Key**
- Fetch their last **X emails** from Gmail (default: **15**)
- **Classify emails** into categories using **OpenAI GPT-4o**

> Categories: Important, Promotions, Social, Marketing, Spam, and General

---

## 🧠 Tech Stack

- **Frontend**: Next.js, Tailwind CSS
- **Backend**: Express.js, Langchain.js
- **Authentication**: Google OAuth2
- **APIs**: Gmail API, OpenAI GPT-4o

---

## 📁 Project Structure

```

gmail-classification/
│
├── backend/
│   ├── .env
│   ├── server.js
│   ├── package.json
│
├── frontend/
│   ├── pages/
│   │   ├── _app.js
│   │   ├── index.js
│   │   └── dashboard.js
│   ├── styles/
│   │   └── globals.css
│   ├── package.json
│   ├── postcss.config.js
│   └── tailwind.config.js

````

---

## ⚙️ Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/gmail-classification.git
cd gmail-classification
````

---

### 2. Backend Setup

```bash
cd backend
npm install
```

#### Create `.env` file in `/backend`:

```env
GOOGLE_CLIENT_ID=54163138077-r1g3ueigs9heje742m887jlpi4rv9556.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URI=http://localhost:5001/auth/google/callback
SESSION_SECRET=5e8ccf103dd1a82b4893c47e939893613d8fc575cf28d782
```

#### Run the backend server

```bash
npm run dev
```

> Backend runs on: `http://localhost:5001`

---

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

#### Run the frontend app

```bash
npm run dev
```

> Frontend runs on: `http://localhost:3000`

---

## 🔐 Features

* **Google OAuth2** Login
* **OpenAI API key** input (stored in localStorage)
* **Gmail API** integration to fetch last X emails (default: 15)
* **Email classification** via OpenAI GPT-4o
* **Categories**:

  * 📌 Important
  * 💸 Promotions
  * 📢 Social
  * 📰 Marketing
  * 🚫 Spam
  * 📁 General (Fallback)

---

## 📦 Dependencies

### Backend

* express
* dotenv
* passport
* passport-google-oauth20
* express-session
* axios
* langchain

### Frontend

* next
* react
* tailwindcss
* postcss
* autoprefixer

---

## 🚀 Future Improvements

* Store classified emails in DB
* Custom email filters
* Email actions (archive, delete)
* Better error handling and retry logic

