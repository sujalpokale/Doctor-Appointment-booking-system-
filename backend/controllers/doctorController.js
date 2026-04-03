import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";
import healthMetricModel from "../models/healthMetricModel.js";
import chatMessageModel from "../models/chatMessageModel.js";

const MAX_CHAT_TEXT = 2000;

const ALLOWED_METRIC_KEYS = [
    "weight_kg",
    "heart_rate",
    "glucose_mg_dl",
    "bp_systolic",
    "bp_diastolic",
];

// API for doctor Login 
const loginDoctor = async (req, res) => {

    try {

        const { email, password } = req.body
        const user = await doctorModel.findOne({ email })

        if (!user) {
            return res.json({ success: false, message: "Invalid credentials" })
        }

        const isMatch = await bcrypt.compare(password, user.password)

        if (isMatch) {
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET)
            res.json({ success: true, token })
        } else {
            res.json({ success: false, message: "Invalid credentials" })
        }


    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to get doctor appointments for doctor panel
const appointmentsDoctor = async (req, res) => {
    try {

        const { docId } = req.body
        const appointments = await appointmentModel.find({ docId })

        res.json({ success: true, appointments })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to cancel appointment for doctor panel
const appointmentCancel = async (req, res) => {
    try {

        const { docId, appointmentId } = req.body

        const appointmentData = await appointmentModel.findById(appointmentId)
        if (appointmentData && appointmentData.docId === docId) {
            await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true })
            return res.json({ success: true, message: 'Appointment Cancelled' })
        }

        res.json({ success: false, message: 'Appointment Cancelled' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }

}

// API to mark appointment completed for doctor panel
const appointmentComplete = async (req, res) => {
    try {

        const { docId, appointmentId } = req.body

        const appointmentData = await appointmentModel.findById(appointmentId)
        if (appointmentData && appointmentData.docId === docId) {
            await appointmentModel.findByIdAndUpdate(appointmentId, { isCompleted: true })
            return res.json({ success: true, message: 'Appointment Completed' })
        }

        res.json({ success: false, message: 'Appointment Cancelled' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }

}

// API to get all doctors list for Frontend
const doctorList = async (req, res) => {
    try {

        const doctors = await doctorModel.find({}).select(['-password', '-email'])
        res.json({ success: true, doctors })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }

}

// API to change doctor availablity for Admin and Doctor Panel
const changeAvailablity = async (req, res) => {
    try {

        const { docId } = req.body

        const docData = await doctorModel.findById(docId)
        await doctorModel.findByIdAndUpdate(docId, { available: !docData.available })
        res.json({ success: true, message: 'Availablity Changed' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to get doctor profile for  Doctor Panel
const doctorProfile = async (req, res) => {
    try {

        const { docId } = req.body
        const profileData = await doctorModel.findById(docId).select('-password')

        res.json({ success: true, profileData })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to update doctor profile data from  Doctor Panel
const updateDoctorProfile = async (req, res) => {
    try {

        const { docId, fees, address, available } = req.body

        await doctorModel.findByIdAndUpdate(docId, { fees, address, available })

        res.json({ success: true, message: 'Profile Updated' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to get dashboard data for doctor panel
const doctorDashboard = async (req, res) => {
    try {

        const { docId } = req.body

        const appointments = await appointmentModel.find({ docId })

        let earnings = 0

        appointments.map((item) => {
            if (item.isCompleted || item.payment) {
                earnings += item.amount
            }
        })

        let patients = []

        appointments.map((item) => {
            if (!patients.includes(item.userId)) {
                patients.push(item.userId)
            }
        })



        const dashData = {
            earnings,
            appointments: appointments.length,
            patients: patients.length,
            latestAppointments: appointments.reverse()
        }

        res.json({ success: true, dashData })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// Patient health metrics for charting (doctor must have at least one appointment with patient)
const patientHealthMetrics = async (req, res) => {
    try {
        const { docId } = req.body;
        const { userId, metricKey } = req.query;

        if (!userId) {
            return res.json({ success: false, message: "Missing userId" });
        }

        const hasAppointment = await appointmentModel.findOne({ docId, userId });
        if (!hasAppointment) {
            return res.json({
                success: false,
                message: "No appointment history with this patient",
            });
        }

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

const assertPatientDoctorLinkDoctor = async (userId, docId) => {
    const a = await appointmentModel.findOne({ userId, docId });
    return !!a;
};

// API: doctor adds a health metric for a patient (patient app is view-only)
const addDoctorHealthMetric = async (req, res) => {
    try {
        const { docId, userId, metricKey, value, recordedAt, note } = req.body;
        if (!userId) {
            return res.json({ success: false, message: "Missing userId" });
        }
        if (!ALLOWED_METRIC_KEYS.includes(metricKey)) {
            return res.json({ success: false, message: "Invalid metric type" });
        }
        const num = Number(value);
        if (Number.isNaN(num) || num < 0) {
            return res.json({ success: false, message: "Invalid value" });
        }
        const ts = recordedAt ? Number(recordedAt) : Date.now();
        if (Number.isNaN(ts)) {
            return res.json({ success: false, message: "Invalid date" });
        }
        if (!(await assertPatientDoctorLinkDoctor(userId, docId))) {
            return res.json({
                success: false,
                message: "No appointment with this patient",
            });
        }
        const row = new healthMetricModel({
            userId,
            metricKey,
            value: num,
            recordedAt: ts,
            note: note ? String(note).slice(0, 500) : "",
            recordedByDocId: docId,
        });
        await row.save();
        res.json({ success: true, metric: row });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// API: doctor deletes a health metric for a patient they share appointments with
const deleteDoctorHealthMetric = async (req, res) => {
    try {
        const { docId } = req.body;
        const { id } = req.params;
        const { userId } = req.query;
        if (!userId) {
            return res.json({ success: false, message: "Missing userId" });
        }
        if (!(await assertPatientDoctorLinkDoctor(userId, docId))) {
            return res.json({
                success: false,
                message: "No appointment with this patient",
            });
        }
        const existing = await healthMetricModel.findById(id);
        if (!existing || existing.userId !== userId) {
            return res.json({ success: false, message: "Not found" });
        }
        await healthMetricModel.findByIdAndDelete(id);
        res.json({ success: true, message: "Removed" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// API: doctor sends chat message to a patient
const sendDoctorChat = async (req, res) => {
    try {
        const { docId, userId, text } = req.body;
        const trimmed = typeof text === "string" ? text.trim() : "";
        if (!userId || !trimmed) {
            return res.json({ success: false, message: "Missing details" });
        }
        if (trimmed.length > MAX_CHAT_TEXT) {
            return res.json({ success: false, message: "Message too long" });
        }
        if (!(await assertPatientDoctorLinkDoctor(userId, docId))) {
            return res.json({
                success: false,
                message: "No appointment with this patient",
            });
        }
        const msg = new chatMessageModel({
            userId,
            docId,
            senderRole: "doctor",
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

// API: list chat messages (doctor view)
const listDoctorChat = async (req, res) => {
    try {
        const { docId } = req.body;
        const { userId } = req.query;
        if (!userId) {
            return res.json({ success: false, message: "Missing userId" });
        }
        if (!(await assertPatientDoctorLinkDoctor(userId, docId))) {
            return res.json({
                success: false,
                message: "No appointment with this patient",
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

// API: inbox with last message per patient (WhatsApp-style list)
const doctorChatInbox = async (req, res) => {
    try {
        const { docId } = req.body;
        const appointments = await appointmentModel.find({ docId });
        const userMap = new Map();
        for (const a of appointments) {
            if (a.userId && a.userData && !userMap.has(a.userId)) {
                userMap.set(a.userId, a.userData);
            }
        }
        const conversations = [];
        for (const [userId, userData] of userMap) {
            const lastMessage = await chatMessageModel
                .findOne({ userId, docId })
                .sort({ createdAt: -1 })
                .lean();
            conversations.push({ userId, userData, lastMessage });
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

export {
    loginDoctor,
    appointmentsDoctor,
    appointmentCancel,
    doctorList,
    changeAvailablity,
    appointmentComplete,
    doctorDashboard,
    doctorProfile,
    updateDoctorProfile,
    patientHealthMetrics,
    sendDoctorChat,
    listDoctorChat,
    addDoctorHealthMetric,
    deleteDoctorHealthMetric,
    doctorChatInbox,
}