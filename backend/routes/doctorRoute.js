import express from 'express';
import { loginDoctor, appointmentsDoctor, appointmentCancel, doctorList, changeAvailablity, appointmentComplete, doctorDashboard, doctorProfile, updateDoctorProfile, patientHealthMetrics, sendDoctorChat, listDoctorChat, addDoctorHealthMetric, deleteDoctorHealthMetric, doctorChatInbox } from '../controllers/doctorController.js';
import authDoctor from '../middleware/authDoctor.js';
const doctorRouter = express.Router();

doctorRouter.post("/login", loginDoctor)
doctorRouter.post("/cancel-appointment", authDoctor, appointmentCancel)
doctorRouter.get("/appointments", authDoctor, appointmentsDoctor)
doctorRouter.get("/list", doctorList)
doctorRouter.post("/change-availability", authDoctor, changeAvailablity)
doctorRouter.post("/complete-appointment", authDoctor, appointmentComplete)
doctorRouter.get("/dashboard", authDoctor, doctorDashboard)
doctorRouter.get("/profile", authDoctor, doctorProfile)
doctorRouter.post("/update-profile", authDoctor, updateDoctorProfile)
doctorRouter.get("/patient-health-metrics", authDoctor, patientHealthMetrics)
doctorRouter.post("/health-metrics", authDoctor, addDoctorHealthMetric)
doctorRouter.delete("/health-metrics/:id", authDoctor, deleteDoctorHealthMetric)
doctorRouter.post("/chat", authDoctor, sendDoctorChat)
doctorRouter.get("/chat/inbox", authDoctor, doctorChatInbox)
doctorRouter.get("/chat", authDoctor, listDoctorChat)

export default doctorRouter;