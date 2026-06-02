import express from 'express';
import { loginUser, registerUser, getProfile, updateProfile, bookAppointment, listAppointment, cancelAppointment, paymentRazorpay, verifyRazorpay, paymentStripe, verifyStripe, listHealthMetrics, sendUserChat, listUserChat, chatInbox, uploadMedicalDocument, deleteMedicalDocument, addDoctorReview, rescheduleAppointment, googleLogin, applyCoupon, addFamilyMember, deleteFamilyMember, toggle2fa, verify2faLogin, aiSymptomCheck, checkIncomingCallsUser, acceptCallUser, saveIceUser, getCallSignalUser, declineCallUser } from '../controllers/userController.js';
import upload from '../middleware/multer.js';
import authUser from '../middleware/authUser.js';
const userRouter = express.Router();

userRouter.post("/register", registerUser)
userRouter.post("/login", loginUser)
userRouter.post("/google-login", googleLogin)
userRouter.post("/verify-2fa-login", verify2faLogin)
userRouter.post("/ai-symptom-check", authUser, aiSymptomCheck)

userRouter.get("/get-profile", authUser, getProfile)
userRouter.post("/update-profile", upload.single('image'), authUser, updateProfile)
userRouter.post("/book-appointment", authUser, bookAppointment)
userRouter.post("/reschedule-appointment", authUser, rescheduleAppointment)
userRouter.post("/apply-coupon", authUser, applyCoupon)
userRouter.post("/add-family-member", authUser, addFamilyMember)
userRouter.post("/delete-family-member", authUser, deleteFamilyMember)
userRouter.post("/toggle-2fa", authUser, toggle2fa)
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

// Video calling signaling routes for patient
userRouter.get("/incoming-calls", authUser, checkIncomingCallsUser)
userRouter.post("/accept-call", authUser, acceptCallUser)
userRouter.post("/save-ice", authUser, saveIceUser)
userRouter.get("/get-call-signal", authUser, getCallSignalUser)
userRouter.post("/decline-call", authUser, declineCallUser)

export default userRouter;