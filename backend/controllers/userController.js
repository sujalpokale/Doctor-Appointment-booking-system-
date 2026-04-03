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
        const { name, email, password } = req.body;

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

        const userData = {
            name,
            email,
            password: hashedPassword,
        }

        const newUser = new userModel(userData)
        const user = await newUser.save()
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET)

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
        const userData = await userModel.findById(userId).select('-password')

        if (!userData) {
            return res.json({ success: false, message: "User not found" })
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

// API to book appointment 
const bookAppointment = async (req, res) => {

    try {

        const { userId, docId, slotDate, slotTime } = req.body
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

        const userData = await userModel.findById(userId).select("-password")

        if (!userData) {
            return res.json({ success: false, message: 'User not found' });
        }

        delete docData.slots_booked

        const appointmentData = {
            userId,
            docId,
            userData,
            docData,
            amount: docData.fees,
            slotTime,
            slotDate,
            date: Date.now()
        }

        const newAppointment = new appointmentModel(appointmentData)
        await newAppointment.save()

        // save new slots data in docData
        await doctorModel.findByIdAndUpdate(docId, { slots_booked })

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
    addDoctorReview
}