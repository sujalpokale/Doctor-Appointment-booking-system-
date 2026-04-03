# MediConsult - Full Stack Medical Appointment Booking Platform

MediConsult is a comprehensive medical consulting platform designed to streamline the appointment booking process for patients while providing robust management tools for doctors and administrators.

## 🚀 Features

### 🩺 Patient Portal
- **User Authentication**: Secure signup and login for patients.
- **Doctor Discovery**: Browse doctors by speciality (General Physician, Gynecologist, Dermatologist, etc.).
- **Slot Booking**: Interactive calendar to select available time slots with real-time validation.
- **Appointment Tracking**: View, manage, and cancel upcoming appointments.
- **Payments**: Integrated Razorpay and Stripe support for seamless consultation fee payments.
- **Doctor Reviews**: Leave ratings (★) and detailed reviews for doctors after consultations.
- **Health Dashboard**: Track medical history, health charts, and chat with doctors.

### 👩‍⚕️ Doctor Panel
- **Private Dashboard**: Overview of upcoming appointments, earnings, and patient volume.
- **Slot Management**: Control availability and manage booked slots.
- **Patient Interaction**: Real-time chat system and access to patient health charts.
- **Profile Customization**: Manage professional details, fees, and specialization.

### ⚙️ Admin Dashboard
- **Comprehensive Analytics**: Monitor total doctors, appointments, and patients.
- **Doctor Management**: Add new doctors or update existing profiles.
- **Top Performers**: Track the highest-rated doctors on the platform.
- **Appointment Overview**: Monitor all platform activity and manage cancellations.

---

## 🛠️ Technology Stack

- **Frontend**: React.js, Tailwind CSS, React Router, Axios, Lucide React (Icons).
- **Admin**: React.js, Tailwind CSS, Context API (State Management).
- **Backend**: Node.js, Express.js.
- **Database**: MongoDB (Mongoose ODM).
- **Image Storage**: Cloudinary.
- **Payments**: Razorpay & Stripe API.
- **Authentication**: JSON Web Token (JWT), Bcrypt.

---

## ⚙️ Installation & Setup

### 1. Prerequisites
- Node.js installed
- MongoDB Atlas account (for database)
- Cloudinary account (for image uploads)
- Razorpay account (for payments)

### 2. Backend Setup
1. Navigate to the `/backend` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file and add the following:
   ```env
   MONGODB_URI=your_mongodb_atlas_uri
   JWT_SECRET=your_jwt_secret
   ADMIN_EMAIL=admin@example.com
   ADMIN_PASSWORD=your_admin_password
   CLOUDINARY_NAME=your_cloudinary_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_SECRET_KEY=your_cloudinary_api_secret
   RAZORPAY_KEY_ID=your_razorpay_id
   RAZORPAY_KEY_SECRET=your_razorpay_secret
   ```
4. Start the server:
   ```bash
   npm start
   ```

### 3. Frontend Setup
1. Navigate to the `/frontend` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file:
   ```env
   VITE_BACKEND_URL=http://localhost:4000
   ```
4. Start development server:
   ```bash
   npm run dev
   ```

### 4. Admin Panel Setup
1. Navigate to the `/admin` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file:
   ```env
   VITE_BACKEND_URL=http://localhost:4000
   ```
4. Start development server:
   ```bash
   npm run dev
   ```

---

## 📈 Recent Enhancements
- **Doctor Ratings**: Full integration of star-based ratings across all panels.
- **Responsive Design**: Optimized for mobile and desktop viewing.
- **Top Rated Sorting**: Admins can now sort doctors by their average rating.
- **Role-Based Routing**: Smart redirection ensures doctors and admins land on their correct dashboards immediately.

---

## 📄 License
This project is licensed under the MIT License.
