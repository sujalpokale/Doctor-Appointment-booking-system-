import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import validator from "validator";
import { v2 as cloudinary } from "cloudinary";
import razorpay from "razorpay";
import userModel from "../models/userModel.js";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";
import healthMetricModel from "../models/healthMetricModel.js";
import chatMessageModel from "../models/chatMessageModel.js";
import couponModel from "../models/couponModel.js";
import sendEmail from "../utils/sendEmail.js";

const ALLOWED_METRIC_KEYS = [
    "weight_kg",
    "heart_rate",
    "glucose_mg_dl",
    "bp_systolic",
    "bp_diastolic",
];

const MAX_CHAT_TEXT = 2000;

const assertPatientDoctorLink = async (userId, docId) => {
    const a = await appointmentModel.findOne({ userId, docId });
    return !!a;
};

// // Gateway Initialize
// const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY)
const razorpayInstance = new razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
})

// API to register user
const registerUser = async (req, res) => {

    try {
        const { name, email, password, referralCode } = req.body;

        // checking for all data to register user
        if (!name || !email || !password) {
            return res.json({ success: false, message: 'Missing Details' })
        }

        // validating email format
        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "Please enter a valid email" })
        }

        // validating strong password
        if (password.length < 8) {
            return res.json({ success: false, message: "Please enter a strong password" })
        }

        // hashing user password
        const salt = await bcrypt.genSalt(10); // the more no. round the more time it will take
        const hashedPassword = await bcrypt.hash(password, salt)

        // Generate unique referral code for this user
        const myReferralCode = "MED-" + Math.random().toString(36).substring(2, 8).toUpperCase();

        // Process referral link if code provided
        let referredByUser = null;
        if (referralCode) {
            referredByUser = await userModel.findOne({ referralCode: String(referralCode).trim().toUpperCase() });
        }

        const userData = {
            name,
            email,
            password: hashedPassword,
            referralCode: myReferralCode,
            referralCredits: referredByUser ? 50 : 0,
            referredBy: referredByUser ? referredByUser.referralCode : ""
        }

        const newUser = new userModel(userData)
        const user = await newUser.save()
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET)

        // Credit the referrer with 100 points
        if (referredByUser) {
            await userModel.findByIdAndUpdate(referredByUser._id, { $inc: { referralCredits: 100 } });
        }

        res.json({ success: true, token })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to login user
const loginUser = async (req, res) => {

    try {
        const { email, password } = req.body;
        const user = await userModel.findOne({ email })

        if (!user) {
            return res.json({ success: false, message: "User does not exist" })
        }

        const isMatch = await bcrypt.compare(password, user.password)

        if (isMatch) {
            if (user.twoFactorEnabled) {
                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

                await userModel.findByIdAndUpdate(user._id, {
                    twoFactorOTP: otp,
                    twoFactorOTPExpires: expires
                });

                await sendEmail(
                    user.email,
                    "Your Mediconsult 2FA Code",
                    `Your 2-Factor Authentication Code is: ${otp}. It is valid for 10 minutes.`,
                    `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                        <h2 style="color: #5f6caf;">Security Verification Code</h2>
                        <p>Hello,</p>
                        <p>We received a login request for your Mediconsult account. Please enter the following 6-digit verification code to complete your login:</p>
                        <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #0f172a; margin: 20px 0;">
                            ${otp}
                        </div>
                        <p style="font-size: 12px; color: #64748b;">This code is valid for 10 minutes. If you did not request this code, please secure your account password immediately.</p>
                        <p>&copy; Mediconsult Telehealth Network.</p>
                    </div>`
                );

                return res.json({ success: true, twoFactorRequired: true, userId: user._id, message: "Two-Factor verification required. Code sent to email." });
            }

            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET)
            res.json({ success: true, token })
        }
        else {
            res.json({ success: false, message: "Invalid credentials" })
        }
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to get user profile data
const getProfile = async (req, res) => {

    try {
        const { userId } = req.body
        let userData = await userModel.findById(userId).select('-password')

        if (!userData) {
            return res.json({ success: false, message: "User not found" })
        }

        // Auto-generate referral code for legacy/existing accounts if not present
        if (!userData.referralCode) {
            const code = "MED-" + Math.random().toString(36).substring(2, 8).toUpperCase();
            userData.referralCode = code;
            await userModel.findByIdAndUpdate(userId, { referralCode: code });
        }

        res.json({ success: true, userData })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to update user profile
const updateProfile = async (req, res) => {

    try {

        const { userId, name, phone, address, dob, gender } = req.body
        const imageFile = req.file

        if (!name || !phone || !dob || !gender) {
            return res.json({ success: false, message: "Data Missing" })
        }

        await userModel.findByIdAndUpdate(userId, { name, phone, address: JSON.parse(address), dob, gender })

        if (imageFile) {

            // upload image to cloudinary
            const imageUpload = await cloudinary.uploader.upload(imageFile.path, { resource_type: "image" })
            const imageURL = imageUpload.secure_url

            await userModel.findByIdAndUpdate(userId, { image: imageURL })
        }

        res.json({ success: true, message: 'Profile Updated' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

const bookAppointment = async (req, res) => {

    try {

        const { userId, docId, slotDate, slotTime, couponCode, patientId, useReferralCredits } = req.body
        const docData = await doctorModel.findById(docId).select("-password")

        if (!docData.available) {
            return res.json({ success: false, message: 'Doctor Not Available' })
        }

        let slots_booked = docData.slots_booked

        // checking for slot availablity 
        if (slots_booked[slotDate]) {
            if (slots_booked[slotDate].includes(slotTime)) {
                return res.json({ success: false, message: 'Slot Not Available' })
            }
            else {
                slots_booked[slotDate].push(slotTime)
            }
        } else {
            slots_booked[slotDate] = []
            slots_booked[slotDate].push(slotTime)
        }

        let userData = await userModel.findById(userId).select("-password")

        if (!userData) {
            return res.json({ success: false, message: 'User not found' });
        }

        if (patientId) {
            const member = userData.familyMembers.find(m => m.id === patientId);
            if (member) {
                userData = {
                    _id: userData._id,
                    email: userData.email,
                    phone: userData.phone,
                    medicalDocuments: userData.medicalDocuments,
                    name: member.name,
                    gender: member.gender,
                    dob: member.dob,
                    relation: member.relation,
                    isDependent: true
                };
            }
        }

        let finalAmount = docData.fees;

        if (couponCode) {
            const coupon = await couponModel.findOne({ code: String(couponCode).toUpperCase(), isActive: true });
            if (coupon && coupon.expiryDate > Date.now()) {
                let discount = (docData.fees * coupon.discountPercent) / 100;
                if (coupon.maxDiscount > 0 && discount > coupon.maxDiscount) {
                    discount = coupon.maxDiscount;
                }
                finalAmount = docData.fees - discount;
            }
        }

        // Apply referral credits if selected
        let dbUser = await userModel.findById(userId);
        if (useReferralCredits && dbUser && dbUser.referralCredits > 0) {
            const availableCredits = dbUser.referralCredits;
            let creditsApplied = 0;
            if (availableCredits >= finalAmount) {
                creditsApplied = finalAmount;
                finalAmount = 0;
            } else {
                creditsApplied = availableCredits;
                finalAmount = finalAmount - availableCredits;
            }

            await userModel.findByIdAndUpdate(userId, { $inc: { referralCredits: -creditsApplied } });
        }

        delete docData.slots_booked

        const appointmentData = {
            userId,
            docId,
            userData,
            docData,
            amount: finalAmount,
            slotTime,
            slotDate,
            date: Date.now()
        }

        const newAppointment = new appointmentModel(appointmentData)
        await newAppointment.save()

        // save new slots data in docData
        await doctorModel.findByIdAndUpdate(docId, { slots_booked })

        // Send Email Confirmation to Patient
        sendEmail(
            userData.email,
            `Appointment Confirmed - Mediconsult`,
            `Dear ${userData.name}, your appointment with ${docData.name} has been booked for ${slotDate.replace(/_/g, '/')} at ${slotTime}. Thank you!`,
            `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #5f6caf;">Appointment Confirmed!</h2>
                <p>Dear <strong>${userData.name}</strong>,</p>
                <p>Your appointment with <strong>${docData.name}</strong> has been successfully booked.</p>
                <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #5f6caf; margin: 20px 0;">
                    <p><strong>Doctor:</strong> ${docData.name}</p>
                    <p><strong>Date:</strong> ${slotDate.replace(/_/g, '/')}</p>
                    <p><strong>Time:</strong> ${slotTime}</p>
                    <p><strong>Amount Paid/Owed:</strong> ₹${finalAmount}</p>
                </div>
                <p>Thank you for choosing Mediconsult!</p>
             </div>`
        );

        // Send Email Confirmation to Doctor
        sendEmail(
            docData.email,
            `New Appointment Booked - Mediconsult`,
            `Dear ${docData.name}, you have a new appointment with patient ${userData.name} scheduled for ${slotDate.replace(/_/g, '/')} at ${slotTime}.`,
            `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #5f6caf;">New Appointment Scheduled</h2>
                <p>Dear <strong>${docData.name}</strong>,</p>
                <p>A new consultation has been booked by patient <strong>${userData.name}</strong>.</p>
                <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #5f6caf; margin: 20px 0;">
                    <p><strong>Patient Name:</strong> ${userData.name}</p>
                    <p><strong>Scheduled Date:</strong> ${slotDate.replace(/_/g, '/')}</p>
                    <p><strong>Scheduled Time:</strong> ${slotTime}</p>
                </div>
                <p>Please check your doctor panel for details.</p>
             </div>`
        );

        res.json({ success: true, message: 'Appointment Booked' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }

}

// API to cancel appointment
const cancelAppointment = async (req, res) => {
    try {

        const { userId, appointmentId } = req.body
        const appointmentData = await appointmentModel.findById(appointmentId)

        // verify appointment user 
        if (appointmentData.userId !== userId) {
            return res.json({ success: false, message: 'Unauthorized action' })
        }

        await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true })

        // releasing doctor slot 
        const { docId, slotDate, slotTime } = appointmentData

        const doctorData = await doctorModel.findById(docId)

        let slots_booked = doctorData.slots_booked

        slots_booked[slotDate] = slots_booked[slotDate].filter(e => e !== slotTime)

        await doctorModel.findByIdAndUpdate(docId, { slots_booked })

        // Send Email Cancellation to Patient
        sendEmail(
            appointmentData.userData.email,
            `Appointment Cancelled - Mediconsult`,
            `Dear ${appointmentData.userData.name}, your appointment with ${doctorData.name} on ${slotDate.replace(/_/g, '/')} at ${slotTime} has been successfully cancelled.`,
            `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #ef4444;">Appointment Cancelled</h2>
                <p>Dear <strong>${appointmentData.userData.name}</strong>,</p>
                <p>Your appointment with <strong>${doctorData.name}</strong> on ${slotDate.replace(/_/g, '/')} at ${slotTime} has been successfully cancelled.</p>
                <p>If this was an error, please book a new slot on our platform.</p>
             </div>`
        );

        // Send Email Cancellation to Doctor
        sendEmail(
            doctorData.email,
            `Appointment Cancelled by Patient - Mediconsult`,
            `Dear ${doctorData.name}, your appointment with patient ${appointmentData.userData.name} scheduled for ${slotDate.replace(/_/g, '/')} at ${slotTime} has been cancelled.`,
            `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #ef4444;">Appointment Cancelled</h2>
                <p>Dear <strong>${doctorData.name}</strong>,</p>
                <p>Patient <strong>${appointmentData.userData.name}</strong> has cancelled their scheduled appointment on ${slotDate.replace(/_/g, '/')} at ${slotTime}.</p>
                <p>The slot has been successfully released back into your availability calendar.</p>
             </div>`
        );

        res.json({ success: true, message: 'Appointment Cancelled' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to get user appointments for frontend my-appointments page
const listAppointment = async (req, res) => {
    try {

        const { userId } = req.body
        const appointments = await appointmentModel.find({ userId })

        res.json({ success: true, appointments })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to make payment of appointment using razorpay
const paymentRazorpay = async (req, res) => {
    try {

        const { appointmentId } = req.body
        const appointmentData = await appointmentModel.findById(appointmentId)

        if (!appointmentData || appointmentData.cancelled) {
            return res.json({ success: false, message: 'Appointment Cancelled or not found' })
        }

        // creating options for razorpay payment
        const options = {
            amount: appointmentData.amount * 100,
            currency: process.env.CURRENCY,
            receipt: appointmentId,
        }

        // creation of an order
        const order = await razorpayInstance.orders.create(options)

        res.json({ success: true, order })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to verify payment of razorpay
const verifyRazorpay = async (req, res) => {
    try {
        const { razorpay_order_id } = req.body
        const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id)

        if (orderInfo.status === 'paid') {
            await appointmentModel.findByIdAndUpdate(orderInfo.receipt, { payment: true })
            res.json({ success: true, message: "Payment Successful" })
        }
        else {
            res.json({ success: false, message: 'Payment Failed' })
        }
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to make payment of appointment using Stripe
const paymentStripe = async (req, res) => {
    try {

        const { appointmentId } = req.body
        const { origin } = req.headers

        const appointmentData = await appointmentModel.findById(appointmentId)

        if (!appointmentData || appointmentData.cancelled) {
            return res.json({ success: false, message: 'Appointment Cancelled or not found' })
        }

        const currency = process.env.CURRENCY.toLocaleLowerCase()

        const line_items = [{
            price_data: {
                currency,
                product_data: {
                    name: "Appointment Fees"
                },
                unit_amount: appointmentData.amount * 100
            },
            quantity: 1
        }]

        const session = await stripeInstance.checkout.sessions.create({
            success_url: `${origin}/verify?success=true&appointmentId=${appointmentData._id}`,
            cancel_url: `${origin}/verify?success=false&appointmentId=${appointmentData._id}`,
            line_items: line_items,
            mode: 'payment',
        })

        res.json({ success: true, session_url: session.url });

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API: list current user's health metrics (optional filter by metricKey) — view only; doctors add readings
const listHealthMetrics = async (req, res) => {
    try {
        const { userId } = req.body;
        const { metricKey } = req.query;

        const filter = { userId };
        if (metricKey && ALLOWED_METRIC_KEYS.includes(metricKey)) {
            filter.metricKey = metricKey;
        }

        const metrics = await healthMetricModel
            .find(filter)
            .sort({ recordedAt: 1 })
            .lean();

        res.json({ success: true, metrics });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// API: patient sends chat message to a doctor (must have an appointment with them)
const sendUserChat = async (req, res) => {
    try {
        const { userId, docId, text } = req.body;
        const trimmed = typeof text === "string" ? text.trim() : "";
        if (!docId || !trimmed) {
            return res.json({ success: false, message: "Missing details" });
        }
        if (trimmed.length > MAX_CHAT_TEXT) {
            return res.json({ success: false, message: "Message too long" });
        }
        if (!(await assertPatientDoctorLink(userId, docId))) {
            return res.json({
                success: false,
                message: "You can only message doctors you have booked with",
            });
        }
        const msg = new chatMessageModel({
            userId,
            docId,
            senderRole: "user",
            text: trimmed,
            createdAt: Date.now(),
        });
        await msg.save();
        res.json({ success: true, chatMessage: msg });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// API: list chat messages for a doctor conversation
const listUserChat = async (req, res) => {
    try {
        const { userId } = req.body;
        const { docId } = req.query;
        if (!docId) {
            return res.json({ success: false, message: "Missing docId" });
        }
        if (!(await assertPatientDoctorLink(userId, docId))) {
            return res.json({
                success: false,
                message: "You can only view chats with doctors you have booked with",
            });
        }
        const messages = await chatMessageModel
            .find({ userId, docId })
            .sort({ createdAt: 1 })
            .lean();
        res.json({ success: true, messages });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// API: WhatsApp-style inbox — one row per doctor with last message preview
const chatInbox = async (req, res) => {
    try {
        const { userId } = req.body;
        const appointments = await appointmentModel.find({ userId });
        const docMap = new Map();
        for (const a of appointments) {
            if (a.docId && a.docData && !docMap.has(a.docId)) {
                docMap.set(a.docId, a.docData);
            }
        }
        const conversations = [];
        for (const [docId, docData] of docMap) {
            const lastMessage = await chatMessageModel
                .findOne({ userId, docId })
                .sort({ createdAt: -1 })
                .lean();
            conversations.push({ docId, docData, lastMessage });
        }
        conversations.sort((a, b) => {
            const ta = a.lastMessage?.createdAt ?? 0;
            const tb = b.lastMessage?.createdAt ?? 0;
            return tb - ta;
        });
        res.json({ success: true, conversations });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

const verifyStripe = async (req, res) => {
    try {

        const { appointmentId, success } = req.body

        if (success === "true") {
            await appointmentModel.findByIdAndUpdate(appointmentId, { payment: true })
            return res.json({ success: true, message: 'Payment Successful' })
        }

        res.json({ success: false, message: 'Payment Failed' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }

}
// API: upload medical document
const uploadMedicalDocument = async (req, res) => {
    try {
        const { userId, name } = req.body;
        const documentFile = req.file;

        if (!name || !documentFile) {
            return res.json({ success: false, message: "Name or Document Missing" });
        }

        // upload document to cloudinary
        const uploadResponse = await cloudinary.uploader.upload(documentFile.path, { resource_type: "auto" });
        const documentURL = uploadResponse.secure_url;

        const newDoc = {
            id: Date.now().toString(),
            name,
            url: documentURL,
            createdAt: Date.now()
        };

        const user = await userModel.findById(userId);
        user.medicalDocuments.push(newDoc);
        await user.save();

        res.json({ success: true, message: 'Document Uploaded', medicalDocuments: user.medicalDocuments });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

// API: delete medical document
const deleteMedicalDocument = async (req, res) => {
    try {
        const { userId, documentId } = req.body;

        const user = await userModel.findById(userId);
        
        user.medicalDocuments = user.medicalDocuments.filter(doc => doc.id !== documentId);
        await user.save();

        res.json({ success: true, message: 'Document Deleted', medicalDocuments: user.medicalDocuments });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

// API: add doctor review
const addDoctorReview = async (req, res) => {
    try {
        const { userId, appointmentId, docId, rating, text } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.json({ success: false, message: "Valid rating (1-5) is required" });
        }

        const appointment = await appointmentModel.findById(appointmentId);
        if (!appointment) return res.json({ success: false, message: "Appointment not found" });
        
        if (!appointment.isCompleted) {
            return res.json({ success: false, message: "Can only review completed appointments" });
        }
        
        if (appointment.isReviewed) {
            return res.json({ success: false, message: "You already reviewed this appointment" });
        }

        const user = await userModel.findById(userId);
        const doctor = await doctorModel.findById(docId);

        if (!doctor) return res.json({ success: false, message: "Doctor not found" });

        const newReview = {
            appointmentId,
            userId,
            patientName: user.name,
            rating: Number(rating),
            text: text || "",
            date: Date.now()
        };

        doctor.reviews.push(newReview);
        
        const totalRating = doctor.reviews.reduce((sum, rev) => sum + rev.rating, 0);
        doctor.averageRating = Number((totalRating / doctor.reviews.length).toFixed(1));

        await doctor.save();

        appointment.isReviewed = true;
        await appointment.save();

        res.json({ success: true, message: "Review submitted successfully" });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

// API to reschedule appointment
const rescheduleAppointment = async (req, res) => {
    try {
        const { userId, appointmentId, newSlotDate, newSlotTime } = req.body;

        if (!appointmentId || !newSlotDate || !newSlotTime) {
            return res.json({ success: false, message: "Missing required rescheduling details" });
        }

        const appointmentData = await appointmentModel.findById(appointmentId);

        if (!appointmentData) {
            return res.json({ success: false, message: "Appointment not found" });
        }

        // verify appointment user
        if (appointmentData.userId !== userId) {
            return res.json({ success: false, message: "Unauthorized action" });
        }

        if (appointmentData.cancelled) {
            return res.json({ success: false, message: "Cannot reschedule a cancelled appointment" });
        }

        if (appointmentData.isCompleted) {
            return res.json({ success: false, message: "Cannot reschedule a completed appointment" });
        }

        // Limit to 2 reschedules
        if (appointmentData.rescheduledCount >= 2) {
            return res.json({ success: false, message: "Maximum rescheduling limit (2) reached for this appointment" });
        }

        const { docId, slotDate: oldDate, slotTime: oldTime } = appointmentData;
        const doctorData = await doctorModel.findById(docId);

        if (!doctorData) {
            return res.json({ success: false, message: "Doctor not found" });
        }

        let slots_booked = doctorData.slots_booked || {};

        // checking for new slot availability
        if (slots_booked[newSlotDate] && slots_booked[newSlotDate].includes(newSlotTime)) {
            return res.json({ success: false, message: "Requested new slot is not available" });
        }

        // release old slot
        if (slots_booked[oldDate]) {
            slots_booked[oldDate] = slots_booked[oldDate].filter(e => e !== oldTime);
        }

        // book new slot
        if (slots_booked[newSlotDate]) {
            slots_booked[newSlotDate].push(newSlotTime);
        } else {
            slots_booked[newSlotDate] = [newSlotTime];
        }

        // save rescheduling metadata
        if (appointmentData.rescheduledCount === 0) {
            appointmentData.originalSlotDate = oldDate;
            appointmentData.originalSlotTime = oldTime;
        }

        appointmentData.slotDate = newSlotDate;
        appointmentData.slotTime = newSlotTime;
        appointmentData.rescheduledCount += 1;

        await appointmentData.save();
        await doctorModel.findByIdAndUpdate(docId, { slots_booked });

        // Send Email Rescheduling notification to Patient
        sendEmail(
            appointmentData.userData.email,
            `Appointment Rescheduled - Mediconsult`,
            `Dear ${appointmentData.userData.name}, your appointment with ${doctorData.name} has been rescheduled to ${newSlotDate.replace(/_/g, '/')} at ${newSlotTime}.`,
            `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #5f6caf;">Appointment Rescheduled!</h2>
                <p>Dear <strong>${appointmentData.userData.name}</strong>,</p>
                <p>Your appointment with <strong>${doctorData.name}</strong> has been successfully rescheduled.</p>
                <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #5f6caf; margin: 20px 0;">
                    <p><strong>Doctor:</strong> ${doctorData.name}</p>
                    <p><strong>New Date:</strong> ${newSlotDate.replace(/_/g, '/')}</p>
                    <p><strong>New Time:</strong> ${newSlotTime}</p>
                </div>
                <p>Thank you!</p>
             </div>`
        );

        // Send Email Rescheduling notification to Doctor
        sendEmail(
            doctorData.email,
            `Appointment Rescheduled by Patient - Mediconsult`,
            `Dear ${doctorData.name}, patient ${appointmentData.userData.name} has rescheduled their appointment to ${newSlotDate.replace(/_/g, '/')} at ${newSlotTime}.`,
            `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #5f6caf;">Appointment Rescheduled</h2>
                <p>Dear <strong>${doctorData.name}</strong>,</p>
                <p>Patient <strong>${appointmentData.userData.name}</strong> has rescheduled their consultation.</p>
                <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #5f6caf; margin: 20px 0;">
                    <p><strong>Patient Name:</strong> ${appointmentData.userData.name}</p>
                    <p><strong>New Date:</strong> ${newSlotDate.replace(/_/g, '/')}</p>
                    <p><strong>New Time:</strong> ${newSlotTime}</p>
                </div>
                <p>Please update your availability schedule.</p>
             </div>`
        );

        res.json({ success: true, message: "Appointment rescheduled successfully", rescheduledCount: appointmentData.rescheduledCount });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

// API for Google Sign-in Login / Signup
const googleLogin = async (req, res) => {
    try {
        const { googleId, email, name, image } = req.body;

        if (!googleId || !email || !name) {
            return res.json({ success: false, message: "Missing Google details" });
        }

        let user = await userModel.findOne({ $or: [{ googleId }, { email }] });

        if (!user) {
            // Create new Google user
            const salt = await bcrypt.genSalt(10);
            // generate secure random password
            const securePassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
            const hashedPassword = await bcrypt.hash(securePassword, salt);

            user = new userModel({
                name,
                email,
                password: hashedPassword,
                googleId,
                image: image || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAADwCAYAAAA+VemSAAAACXBIWXMAABCcAAAQnAEmzTo0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAA5uSURBVHgB7d0JchvHFcbxN+C+iaQolmzFsaWqHMA5QXID+wZJTmDnBLZu4BvER4hvYJ/AvoHlimPZRUngvoAg4PkwGJOiuGCd6df9/1UhoJZYJIBvXndPL5ndofljd8NW7bP8y79bZk+tmz8ATFdmu3nWfuiYfdNo2383389e3P5Xb9B82X1qs/YfU3AB1Cuzr+3cnt8U5Mb132i+7n5mc/a9EV4gDF37Z15Qv3/9a/fz63/0VgXOw/uFdexLAxCqLze3s+flL/4IcK/yduwrAxC0zoX9e+u9rJfVXoB7fV41m7u2YQBCt2tt+6v6xEUfeM6+ILyAGxv9QWbL+iPOPxoAX2Zts9GZtU8NgDudln3eyNvQnxgAd/Lw/k194I8NgD+ZPc2aO92uAXCpYQDcIsCAYwQYcIwAA44RYMAxAgw4RoABxwgw4BgBBhwjwIBjBBhwjAADjhFgwDECDDhGgAHHCDDgGAEGHCPAgGMEGHCMAAOOEWDAMQIMOEaAAccIMOAYAQYcI8CAYwQYcIwAA44RYMAxAgw4RoABxwgw4BgBBhwjwIBjBBhwjAADjhFgwDECDDhGgAHHCDDgGAEGHCPAgGOzBlfanfzRNrvo5o8Ls46eO8VDut3i966babz7rMfcjFmWP8/rOTM4Q4ADpjCenZu18sCe52FtX9wczkGUAS+fb6IwK9Tzc/kHI/96gU9H8HiLAnOWh/WsZXZ6fnfYpkEXCT30b0sjr8jz+SdkYb4I8wwdruAQ4AAotCdnRbUdtcJOg74XhbkMtCr08iJhDgkBrkmv0uWV9vgsrNDeRd/z3lHxtSrz0kIe6HlDjQhwxVRtD0+Kfq1n+v5b/Z9lKQ/x8gJVuQ5Zc6fr5PrvWyzBvYuCvLZEkKtEBZ6yFIJbOmkVD4JcHQI8JSkF9zqFWANyalYryJgeAjxh6Ac5ME9OrOkaWDu8LQI8+oSg13TQoAnSKPKe8d+RpWroHvZGrlundOsngYCPAGqurtHl/dL8S5VYnUnqMaTRYDHpL6uKkzVs6Y8Kqux5nKrGjP3enwEeAwHp8VAFYaj8QG1VrbWaFKPi5dvBGoyvz4gvONQNX61X4wbYHQEeEj64O3sp3l7aNI02Nc8KkbtMRqa0EPQXODmIf3dSdPtJrVqHiwbhkQFHpDC++aA8E6L+sW7R4YhUYEHcNy6XIWD6dGtJm1aoMEtRqgHQwW+B+Gtllo6GiBkic1gCPAdrq5/RXX0utOcHgwBvkXZ50U9dJ+YEN+PAN9AA1UabWZOc73UJ+YW090I8DXlJA1Gm8OgW0xHp4ZbEOBrdpnXHJz9RNdVD4IAX6G5zawoChMX1psR4L5yBw2ESeFlUOtdBNgul7khbGpG0x9+GwG2YqST5pkP6g9rthYKyQdYG6ufsKTNFZrSl5IOsKruIU0ydzTJhvvDhaQDTNPZL7WceO8SDrDefJrOfnW6NKUl2eWEmioZi0b/TN/FhfwN7Z8c2Ji5/PPz/qmHZ6f9s4Yjudddns80n/Ci2CR/dDW/zp2PZCq0G+tmaytFcBtDtKUU4OO8+7C3n9+Wcd6XVDdI64dTlWSAPQ9cKahbm2YPN4YL7VVzebVe1+NBEeadN0WYPUq9Cid3OqGqr05P8OhhHtzth6MH9y4KsILssXmt8KZahZMbxPJafR9v549H0wmvqBp/9KeiOntTVuEUJRVgzXf2eOtB4VWTedoU3mcf+gxxqveFkwqwx8UKj7aqCW9JI9iqxA1nn4xUq3AyAVbl9fYGqxKqz1vHv/vkPXMnxYUOyQTYYxPryWOrjW5PrTg7nFsX6NR2s0wmwN6q7/JS8aiTmu+eaLLKcWIHqycRYI+DVxsPrHa6gHjrC6e2o0oSAT5xeFVeDuScoBAuJMNoOb3TMKo0KrCzq/LCQj6QFMjMolAuJMNI6cjS6AOs5rO3/Z1Dmha4OG/upNSMjj/ADq/GqsCh0C0lj/eEUxmNjj7AHm/uhzYTambG3EllrXfUAdZghsdlgzNsNTi2VDa+i/qjcs5u/hPhcaleKtMqow6w1zcxtNsgHl9HtbxS6AfHXYGdNqM6gX3fF05fR++7rgwi6gB77QeF1PRXa6DjdGJECl2oaAOsq6/X831D2hXjzPHcYiqwY54P5z4OaOXUqeMleimMREcbYM9vnpqtoYT40PHeyynMiY42wF4HXkpHAWy8p6a8521n1QqLfSQ63gA7v/o2d6123veMFs9dqUHQBw5U70DrmvdqfvXG3Iu9GR1tgGNoOtUZIF08YjiCJfaBLCampw/W9HGhHA0BHoKadtximjwNVD16QFdlFMmvRhqWbjFlebXYPzZMgEKr1g2jzaMhwCPQPWKtJW4epr117Lj0OqpFkzF9dWRc90akyqFJBimeBjAu9Xd1n10PwjseAjyGclM1+sWD04VP/V1meltMyNgluyvlNBydmBzVtsxoqdTPUXGaUefKowBNWVmOF+KRlSVNfV4vwaS5PDwGeAvWNe9MB54vbTak1qxXclf6KLgapposAT5FmFS2uF5VYFTn2IBPc6hHgCqhJrYeCfKwRFQJbHwJcoTLICrCC7L2PrEEpdRMIbn0IcA00KquHbquUYfZSlVVtdRFScJnEUj/eghqV5/voof6xjng5bYUX5quhVdWl2oaD+8AB0jty1i7C3Doc7920V2q8t8IsQyEtnxVaVgb5QQV2TO9cu1M8K8xdHRVqN58+ONsPZVYeT5oR1BhQgR1TpWZ6Ytq4BgOOEWDAMQIMOEaAAccIMOAYAQYcI8CAYwQYcIwAA44RYMAxAgw4RoABxwgw4BgBBhwjwIBjBBhwjAADjhFgwDECDDhGgAHHCDDgGAEGHCPAgGMEGHCMAAOOEWDAMQIMOEaAAccIMOAYAQYcI8CAYwQYcIwAA44RYMAxAgw4RoABxwgw4BgBBhwjwIBjBBhwjAADjhFgwDECDDjWsMxeGACPdhvWJcCAUz80OmbfGQB3Ohf2TdZsdjesbU0D4EvbnjU2N7Pd/MtvDYAfmX29+X72ohiFbtu/8v/dNQAe7Nq5PdcXvQRaScaP5p75B8B9v20eHheLE0JdZPsD+2pvkN1M33/eHO/D3gB1bZ/9f193m5vZQz/r9V/o419/lE/D9f+r/21mD/3b7tNszr53s/adAaqW7C+b+V6e+U4+74fWjH2Z/+sPzZ0GAAAAAElFTkSuQmCC"
            });
            await user.save();
        } else if (!user.googleId) {
            // Account with this email already exists standard-wise. Link Google Id.
            user.googleId = googleId;
            if (image && (!user.image || user.image.startsWith("data:"))) {
                user.image = image;
            }
            await user.save();
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
        res.json({ success: true, token, message: "Logged in with Google successfully" });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

// API to validate and apply coupon
const applyCoupon = async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.json({ success: false, message: "Coupon code is required" });
        }

        // Auto-seed demo coupons if none exist
        const count = await couponModel.countDocuments();
        if (count === 0) {
            await couponModel.create([
                {
                    code: "WELCOME10",
                    discountPercent: 10,
                    maxDiscount: 0,
                    expiryDate: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
                },
                {
                    code: "HEALTH25",
                    discountPercent: 25,
                    maxDiscount: 500,
                    expiryDate: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
                }
            ]);
            console.log("[COUPONS] Demo coupons WELCOME10 and HEALTH25 successfully seeded!");
        }

        const coupon = await couponModel.findOne({ code: String(code).toUpperCase(), isActive: true });

        if (!coupon) {
            return res.json({ success: false, message: "Invalid or inactive promo code" });
        }

        if (coupon.expiryDate < Date.now()) {
            return res.json({ success: false, message: "Promo code has expired" });
        }

        res.json({
            success: true,
            message: "Promo code applied successfully!",
            discountPercent: coupon.discountPercent,
            maxDiscount: coupon.maxDiscount
        });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

// API to add family member
const addFamilyMember = async (req, res) => {
    try {
        const { userId, name, relation, gender, dob } = req.body;
        if (!name || !relation || !gender || !dob) {
            return res.json({ success: false, message: "Missing family member details" });
        }
        const user = await userModel.findById(userId);
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }
        const newMember = {
            id: Date.now().toString(),
            name,
            relation,
            gender,
            dob
        };
        user.familyMembers.push(newMember);
        await user.save();
        res.json({ success: true, message: "Family member added successfully", familyMembers: user.familyMembers });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

// API to delete family member
const deleteFamilyMember = async (req, res) => {
    try {
        const { userId, memberId } = req.body;
        if (!memberId) {
            return res.json({ success: false, message: "Member ID is required" });
        }
        const user = await userModel.findById(userId);
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }
        user.familyMembers = user.familyMembers.filter(m => m.id !== memberId);
        await user.save();
        res.json({ success: true, message: "Family member removed successfully", familyMembers: user.familyMembers });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

// API to verify 2FA login OTP
const verify2faLogin = async (req, res) => {
    try {
        const { userId, otp } = req.body;
        if (!userId || !otp) {
            return res.json({ success: false, message: "Missing required fields" });
        }

        const user = await userModel.findById(userId);
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        if (!user.twoFactorOTP || user.twoFactorOTP !== otp) {
            return res.json({ success: false, message: "Invalid verification code" });
        }

        if (user.twoFactorOTPExpires < new Date()) {
            return res.json({ success: false, message: "Verification code expired" });
        }

        // Clear OTP fields
        await userModel.findByIdAndUpdate(userId, {
            twoFactorOTP: "",
            twoFactorOTPExpires: null
        });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
        res.json({ success: true, token });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

// API to toggle 2FA configuration
const toggle2fa = async (req, res) => {
    try {
        const { userId, enable, otp } = req.body;
        const user = await userModel.findById(userId);
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        if (enable) {
            if (!otp) {
                // Generate and email OTP first
                const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
                const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

                await userModel.findByIdAndUpdate(userId, {
                    twoFactorOTP: generatedOtp,
                    twoFactorOTPExpires: expires
                });

                await sendEmail(
                    user.email,
                    "Verify enabling Mediconsult 2FA",
                    `Your verification code to enable Two-Factor Authentication is: ${generatedOtp}.`,
                    `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                        <h2 style="color: #5f6caf;">Enable Two-Factor Authentication</h2>
                        <p>You requested to enable 2FA on your Mediconsult account. Please enter the following 6-digit verification code to complete setup:</p>
                        <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #0f172a; margin: 20px 0;">
                            ${generatedOtp}
                        </div>
                        <p style="font-size: 12px; color: #64748b;">This code is valid for 10 minutes. If you did not make this request, you can ignore this email.</p>
                    </div>`
                );

                return res.json({ success: true, otpSent: true, message: "Verification code sent to email" });
            } else {
                if (user.twoFactorOTP !== otp) {
                    return res.json({ success: false, message: "Invalid verification code" });
                }
                if (user.twoFactorOTPExpires < new Date()) {
                    return res.json({ success: false, message: "Verification code expired" });
                }

                await userModel.findByIdAndUpdate(userId, {
                    twoFactorEnabled: true,
                    twoFactorOTP: "",
                    twoFactorOTPExpires: null
                });

                return res.json({ success: true, message: "Two-factor authentication successfully enabled" });
            }
        } else {
            await userModel.findByIdAndUpdate(userId, {
                twoFactorEnabled: false,
                twoFactorOTP: "",
                twoFactorOTPExpires: null
            });
            return res.json({ success: true, message: "Two-factor authentication successfully disabled" });
        }

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

const aiSymptomCheck = async (req, res) => {
    try {
        const { symptoms } = req.body;
        if (!symptoms) {
            return res.json({ success: false, message: "Please enter your symptoms." });
        }

        const query = String(symptoms).toLowerCase();
        
        let recommendedSpeciality = "General physician";
        let severity = "Low";
        let reason = "Your symptoms seem general. We recommend consulting a General Physician first for a detailed primary check.";
        let questions = [
            "How long have you been experiencing these symptoms?",
            "Have you noticed any triggers that make it worse or better?",
            "Are you currently taking any other medications?"
        ];

        // Advanced heuristic keyword analysis
        if (query.includes("child") || query.includes("baby") || query.includes("toddler") || query.includes("pediatric") || query.includes("kid") || query.includes("infant") || query.includes("newborn")) {
            recommendedSpeciality = "Pediatricians";
            reason = "The patient is a child/infant, which requires specialized pediatric medical expertise.";
            severity = query.includes("fever") || query.includes("vomit") ? "Medium" : "Low";
            questions = [
                "Has your child been sleeping and eating normally?",
                "Is there a fever? If so, what is the temperature and when did it start?",
                "Has the child been in contact with anyone who was recently sick?"
            ];
        } else if (query.includes("skin") || query.includes("rash") || query.includes("itch") || query.includes("acne") || query.includes("pimple") || query.includes("eczema") || query.includes("mole") || query.includes("hives") || query.includes("spot")) {
            recommendedSpeciality = "Dermatologist";
            reason = "Symptoms point towards dermatological or skin-related concerns, suitable for evaluation by a skin specialist.";
            severity = query.includes("bleed") || query.includes("spread") ? "Medium" : "Low";
            questions = [
                "When did the skin irritation or rash first appear?",
                "Are you experiencing any other symptoms, like itching, pain, or fever?",
                "Have you recently changed skin care products, detergents, or been exposed to new plants/chemicals?"
            ];
        } else if (query.includes("migraine") || query.includes("headache") || query.includes("dizzy") || query.includes("dizziness") || query.includes("seizure") || query.includes("numb") || query.includes("numbness") || query.includes("brain") || query.includes("tremor") || query.includes("memory")) {
            recommendedSpeciality = "Neurologist";
            reason = "Symptoms indicate potential neurological pathways (migraines, dizziness, or peripheral nerve sensations), suggesting a consultation with a neurologist.";
            severity = query.includes("seizure") || query.includes("faint") || query.includes("vision") ? "High" : "Medium";
            questions = [
                "Can you describe the pain (e.g., throbbing, sharp) and where it is located?",
                "Do you experience light or sound sensitivity or nausea along with it?",
                "Have you noticed any difficulty in speech, balance, or sudden weakness?"
            ];
        } else if (query.includes("stomach") || query.includes("acid") || query.includes("heartburn") || query.includes("digest") || query.includes("bloat") || query.includes("nausea") || query.includes("vomit") || query.includes("diarrhea") || query.includes("constipation") || query.includes("gas") || query.includes("cramp")) {
            recommendedSpeciality = "Gastroenterologist";
            reason = "Your symptoms are highly related to digestion and the gastrointestinal tract, which falls directly under a gastroenterologist's expertise.";
            severity = query.includes("blood") || query.includes("severe pain") ? "High" : "Medium";
            questions = [
                "Does the pain or bloating worsen after eating specific types of food?",
                "Have you experienced any unexpected weight changes or changes in bowel movements?",
                "Are you experiencing acid reflux or a sour taste in your mouth regularly?"
            ];
        } else if (query.includes("pregnancy") || query.includes("period") || query.includes("menstrual") || query.includes("cramp") || query.includes("cramps") || query.includes("pelvic") || query.includes("fertility") || query.includes("gyne") || query.includes("female")) {
            recommendedSpeciality = "Gynecologist";
            reason = "The reported symptoms or queries concern women's reproductive health, menstrual cycles, or prenatal guidance, requiring a gynecologist.";
            severity = query.includes("severe pain") || query.includes("heavy bleeding") ? "High" : "Low";
            questions = [
                "When was the date of your last menstrual period?",
                "Are your menstrual cycles regular, and do you experience pain during them?",
                "Have you taken a home pregnancy test recently?"
            ];
        } else if (query.includes("cough") || query.includes("fever") || query.includes("throat") || query.includes("flu") || query.includes("cold") || query.includes("congestion") || query.includes("nose") || query.includes("sneeze") || query.includes("chills") || query.includes("fatigue") || query.includes("weak")) {
            recommendedSpeciality = "General physician";
            reason = "Standard symptoms of viral infections or upper respiratory conditions. A General Physician can effectively diagnose and manage these primary care cases.";
            severity = query.includes("breath") || query.includes("chest") || query.includes("high fever") ? "High" : "Low";
            questions = [
                "Do you have a sore throat, dry cough, or are you coughing up phlegm?",
                "What is your highest body temperature recorded, if any?",
                "Are you experiencing any shortness of breath or tightness in your chest?"
            ];
        }

        // Add CRITICAL warning if High severity
        if (severity === "High") {
            reason += " [CRITICAL WARNING: Due to the high severity, if symptoms worsen rapidly, please seek immediate emergency care.]";
        }

        res.json({
            success: true,
            analysis: {
                recommendedSpeciality,
                severity,
                reason,
                questions
            }
        });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

// WebRTC Signaling controllers for User (Patient)
const checkIncomingCallsUser = async (req, res) => {
    try {
        const { userId } = req.body
        // Find any active appointment where the user is matching, and callStatus is 'calling'
        const appointment = await appointmentModel.findOne({ userId, callStatus: 'calling' })
        if (appointment) {
            res.json({
                success: true,
                hasIncomingCall: true,
                appointmentId: appointment._id,
                docName: appointment.docData.name,
                docImage: appointment.docData.image,
                docSpeciality: appointment.docData.speciality,
                callOffer: appointment.callOffer
            })
        } else {
            res.json({ success: true, hasIncomingCall: false })
        }
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

const acceptCallUser = async (req, res) => {
    try {
        const { userId, appointmentId, callAnswer } = req.body
        const appointment = await appointmentModel.findById(appointmentId)
        if (appointment && appointment.userId === userId) {
            await appointmentModel.findByIdAndUpdate(appointmentId, {
                callStatus: 'active',
                callAnswer: callAnswer
            })
            res.json({ success: true, message: 'Call accepted' })
        } else {
            res.json({ success: false, message: 'Unauthorized or invalid appointment' })
        }
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

const saveIceUser = async (req, res) => {
    try {
        const { userId, appointmentId, candidate } = req.body
        const appointment = await appointmentModel.findById(appointmentId)
        if (appointment && appointment.userId === userId) {
            await appointmentModel.findByIdAndUpdate(appointmentId, {
                $push: { callIceCandidates: candidate }
            })
            res.json({ success: true, message: 'ICE candidate saved' })
        } else {
            res.json({ success: false, message: 'Unauthorized or invalid appointment' })
        }
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

const getCallSignalUser = async (req, res) => {
    try {
        const { userId } = req.body
        const { appointmentId } = req.query
        const appointment = await appointmentModel.findById(appointmentId)
        if (appointment && appointment.userId === userId) {
            res.json({
                success: true,
                callStatus: appointment.callStatus,
                callOffer: appointment.callOffer,
                callIceCandidates: appointment.callIceCandidates
            })
        } else {
            res.json({ success: false, message: 'Unauthorized or invalid appointment' })
        }
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

const declineCallUser = async (req, res) => {
    try {
        const { userId, appointmentId } = req.body
        const appointment = await appointmentModel.findById(appointmentId)
        if (appointment && appointment.userId === userId) {
            await appointmentModel.findByIdAndUpdate(appointmentId, {
                callStatus: 'ended',
                callOffer: null,
                callAnswer: null,
                callIceCandidates: [],
                callerRole: ''
            })
            res.json({ success: true, message: 'Call declined' })
        } else {
            res.json({ success: false, message: 'Unauthorized or invalid appointment' })
        }
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

export {
    loginUser,
    registerUser,
    getProfile,
    updateProfile,
    bookAppointment,
    listAppointment,
    cancelAppointment,
    paymentRazorpay,
    verifyRazorpay,
    paymentStripe,
    verifyStripe,
    listHealthMetrics,
    sendUserChat,
    listUserChat,
    chatInbox,
    uploadMedicalDocument,
    deleteMedicalDocument,
    addDoctorReview,
    rescheduleAppointment,
    googleLogin,
    applyCoupon,
    addFamilyMember,
    deleteFamilyMember,
    verify2faLogin,
    toggle2fa,
    aiSymptomCheck,
    checkIncomingCallsUser,
    acceptCallUser,
    saveIceUser,
    getCallSignalUser,
    declineCallUser
}