import express from 'express';
import { loginUser, registerUser, getProfile, updateProfile, bookAppointment, listAppointment, cancelAppointment, paymentRazorpay, verifyRazorpay, paymentStripe, verifyStripe, listHealthMetrics, sendUserChat, listUserChat, chatInbox, uploadMedicalDocument, deleteMedicalDocument, addDoctorReview } from '../controllers/userController.js';
import upload from '../middleware/multer.js';
import authUser from '../middleware/authUser.js';
const userRouter = express.Router();

userRouter.post("/register", registerUser)
userRouter.post("/login", loginUser)

userRouter.get("/get-profile", authUser, getProfile)
userRouter.post("/update-profile", upload.single('image'), authUser, updateProfile)
userRouter.post("/book-appointment", authUser, bookAppointment)
userRouter.get("/appointments", authUser, listAppointment)
userRouter.post("/cancel-appointment", authUser, cancelAppointment)
userRouter.post("/payment-razorpay", authUser, paymentRazorpay)
userRouter.post("/verifyRazorpay", authUser, verifyRazorpay)
userRouter.post("/payment-stripe", authUser, paymentStripe)
userRouter.post("/verifyStripe", authUser, verifyStripe)

userRouter.get("/health-metrics", authUser, listHealthMetrics)

userRouter.post("/chat", authUser, sendUserChat)
userRouter.get("/chat/inbox", authUser, chatInbox)
userRouter.get("/chat", authUser, listUserChat)

userRouter.post("/upload-document", upload.single('document'), authUser, uploadMedicalDocument)
userRouter.post("/delete-document", authUser, deleteMedicalDocument)
userRouter.post("/add-review", authUser, addDoctorReview)

export default userRouter;