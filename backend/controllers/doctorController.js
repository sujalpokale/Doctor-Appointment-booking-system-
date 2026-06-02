import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";
import healthMetricModel from "../models/healthMetricModel.js";
import chatMessageModel from "../models/chatMessageModel.js";
import sendEmail from "../utils/sendEmail.js";

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
const generateAiSummary = (notes, prescription) => {
    if (!notes && (!prescription || prescription.length === 0)) {
        return "Routine clinical consultation. Patient is in good general health. Recommended general wellness and monitoring.";
    }
    
    let summaryParts = [];
    if (notes) {
        summaryParts.push(`Patient presented with primary symptoms and clinical remarks: "${notes}".`);
    }
    
    if (prescription && prescription.length > 0) {
        const medNames = prescription.map(p => `${p.medicine} (${p.dosage}, ${p.frequency} for ${p.duration})`).join(", ");
        summaryParts.push(`A pharmacotherapy plan was successfully prescribed: ${medNames}.`);
        
        const lowerNotes = String(notes).toLowerCase();
        if (lowerNotes.includes("cough") || lowerNotes.includes("fever") || lowerNotes.includes("cold") || lowerNotes.includes("throat")) {
            summaryParts.push("AI Clinical Advice: Symptoms strongly suggest a standard upper respiratory infection or localized viral pathway. Recommend high fluid intake, humidified air, and daily temperature charting. Advise checking in if fever persists beyond 72 hours.");
        } else if (lowerNotes.includes("stomach") || lowerNotes.includes("pain") || lowerNotes.includes("acid") || lowerNotes.includes("vomit") || lowerNotes.includes("digest")) {
            summaryParts.push("AI Clinical Advice: Gastrointestinal pathway sensitivities noted. Advise patient to consume small frequent meals, restrict intake of acid-promoting foods, and remain upright post-feeding. Watch for any severe pain.");
        } else if (lowerNotes.includes("head") || lowerNotes.includes("migraine") || lowerNotes.includes("stress")) {
            summaryParts.push("AI Clinical Advice: Cephalalgia/migraine episodes noted. Recommend resting in low-stimulus environments, minimizing digital screen exposure, and logging daily hydration. Advise tracking headaches to detect triggers.");
        } else if (lowerNotes.includes("skin") || lowerNotes.includes("itch") || lowerNotes.includes("rash") || lowerNotes.includes("acne")) {
            summaryParts.push("AI Clinical Advice: Dermatological localized irritation. Patient should keep the area clean, avoid scratching to prevent secondary bacterial infection, and avoid known allergens.");
        } else {
            summaryParts.push("AI Clinical Advice: Standard treatment course recommended. Please ensure compliance with the prescribed medication schedule and attend scheduled follow-ups.");
        }
    } else {
        summaryParts.push("AI Clinical Advice: Lifestyle adjustments and observation recommended. Standard preventive care established, no prescription needed at this time.");
    }
    
    return summaryParts.join(" ");
}

const appointmentComplete = async (req, res) => {
    try {

        const { docId, appointmentId, notes, prescription } = req.body

        const appointmentData = await appointmentModel.findById(appointmentId)
        if (appointmentData && appointmentData.docId === docId) {
            const finalPrescription = Array.isArray(prescription) ? prescription : [];
            const aiSummary = generateAiSummary(notes, finalPrescription);

            await appointmentModel.findByIdAndUpdate(appointmentId, { 
                isCompleted: true,
                notes: notes ? String(notes).trim() : "",
                prescription: finalPrescription,
                aiSummary: aiSummary
            })

            // Construct structured prescription HTML table
            let prescriptionHTML = "";
            if (finalPrescription.length > 0) {
                prescriptionHTML = `
                    <h3 style="color: #333; margin-top: 20px;">Prescribed Medications:</h3>
                    <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 13px;">
                        <thead>
                            <tr style="background-color: #f1f5f9; text-align: left;">
                                <th style="padding: 10px; border: 1px solid #cbd5e1;">Medicine</th>
                                <th style="padding: 10px; border: 1px solid #cbd5e1;">Dosage</th>
                                <th style="padding: 10px; border: 1px solid #cbd5e1;">Frequency</th>
                                <th style="padding: 10px; border: 1px solid #cbd5e1;">Duration</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${finalPrescription.map(med => `
                                <tr>
                                    <td style="padding: 10px; border: 1px solid #cbd5e1;"><strong>${med.medicine}</strong></td>
                                    <td style="padding: 10px; border: 1px solid #cbd5e1;">${med.dosage}</td>
                                    <td style="padding: 10px; border: 1px solid #cbd5e1;">${med.frequency}</td>
                                    <td style="padding: 10px; border: 1px solid #cbd5e1;">${med.duration}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            }

            // Send Email Consultation Complete Notification to Patient with Notes
            sendEmail(
                appointmentData.userData.email,
                `Prescription & Consult Summary - Mediconsult`,
                `Dear ${appointmentData.userData.name}, your consultation with ${appointmentData.docData.name} is complete. Notes: ${notes || "No notes recorded."}`,
                `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #5f6caf;">Consultation Completed!</h2>
                    <p>Dear <strong>${appointmentData.userData.name}</strong>,</p>
                    <p>Your session with <strong>${appointmentData.docData.name}</strong> on ${appointmentData.slotDate.replace(/_/g, '/')} is complete.</p>
                    
                    ${prescriptionHTML}

                    <h3 style="color: #333; margin-top: 20px;">Clinical Remarks & General Advice:</h3>
                    <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #5f6caf; font-style: italic; white-space: pre-wrap; margin: 15px 0;">
                        ${notes || "No general notes were recorded."}
                    </div>
                    
                    <p style="margin-top: 20px;">You can view and export your digital prescription report in your patient dashboard.</p>
                    <p>Thank you for choosing Mediconsult!</p>
                 </div>`
            );

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
        const { sort, rating, search, speciality } = req.query;

        let query = {};
        if (speciality) {
            query.speciality = speciality;
        }

        let doctors = await doctorModel.find(query).select(['-password', '-email']);

        // 1. Filter by Rating
        if (rating) {
            const minRating = parseFloat(rating);
            doctors = doctors.filter(doc => (doc.averageRating || 0) >= minRating);
        }

        // 2. Filter by search query (name, speciality, or location/address)
        if (search) {
            const searchLower = String(search).toLowerCase();
            doctors = doctors.filter(doc => 
                String(doc.name).toLowerCase().includes(searchLower) ||
                String(doc.speciality).toLowerCase().includes(searchLower) ||
                (doc.address && (
                    String(doc.address.line1 || "").toLowerCase().includes(searchLower) ||
                    String(doc.address.line2 || "").toLowerCase().includes(searchLower)
                ))
            );
        }

        // 3. Sorting
        if (sort === "rating") {
            doctors.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
        } else if (sort === "experience") {
            const parseExp = (str) => {
                const match = String(str).match(/\d+/);
                return match ? parseInt(match[0], 10) : 0;
            };
            doctors.sort((a, b) => parseExp(b.experience) - parseExp(a.experience));
        } else if (sort === "responseTime") {
            const parseTime = (str) => {
                const match = String(str).match(/\d+/);
                return match ? parseInt(match[0], 10) : 999;
            };
            doctors.sort((a, b) => parseTime(a.responseTime || "15 mins") - parseTime(b.responseTime || "15 mins"));
        } else if (sort === "fees") {
            doctors.sort((a, b) => a.fees - b.fees);
        }

        res.json({ success: true, doctors });

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

// API to block/unblock slots for doctor
const blockDoctorSlots = async (req, res) => {
    try {
        const { docId, dateString, block } = req.body;
        if (!dateString) {
            return res.json({ success: false, message: "Date String is required" });
        }

        const doctor = await doctorModel.findById(docId);
        if (!doctor) {
            return res.json({ success: false, message: "Doctor not found" });
        }

        let slots_booked = doctor.slots_booked || {};

        if (block) {
            const blockedSlots = [];
            let start = new Date();
            start.setHours(10, 0, 0, 0);
            let end = new Date();
            end.setHours(21, 0, 0, 0);

            while (start < end) {
                let formatted = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                blockedSlots.push(formatted);
                start.setMinutes(start.getMinutes() + 30);
            }

            slots_booked[dateString] = blockedSlots;
            await doctorModel.findByIdAndUpdate(docId, { slots_booked });
            return res.json({ success: true, message: `Successfully blocked all slots for ${dateString.replace(/_/g, '/')}` });
        } else {
            if (slots_booked[dateString]) {
                delete slots_booked[dateString];
            }
            await doctorModel.findByIdAndUpdate(docId, { slots_booked });
            return res.json({ success: true, message: `Successfully unblocked slots for ${dateString.replace(/_/g, '/')}` });
        }

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

// API to get slots for doctor
const getDoctorSlots = async (req, res) => {
    try {
        const { docId } = req.body;
        const doctor = await doctorModel.findById(docId);
        if (!doctor) {
            return res.json({ success: false, message: "Doctor not found" });
        }
        res.json({ success: true, slots_booked: doctor.slots_booked || {} });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

// WebRTC Signaling controllers for Doctor
const initiateCallDoctor = async (req, res) => {
    try {
        const { docId, appointmentId, callOffer } = req.body
        const appointment = await appointmentModel.findById(appointmentId)
        if (appointment && appointment.docId === docId) {
            await appointmentModel.findByIdAndUpdate(appointmentId, {
                callStatus: 'calling',
                callOffer: callOffer,
                callAnswer: null,
                callIceCandidates: [],
                callerRole: 'doctor'
            })
            res.json({ success: true, message: 'Call initiated' })
        } else {
            res.json({ success: false, message: 'Unauthorized or invalid appointment' })
        }
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

const saveIceDoctor = async (req, res) => {
    try {
        const { docId, appointmentId, candidate } = req.body
        const appointment = await appointmentModel.findById(appointmentId)
        if (appointment && appointment.docId === docId) {
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

const getCallSignalDoctor = async (req, res) => {
    try {
        const { docId } = req.body
        const { appointmentId } = req.query
        const appointment = await appointmentModel.findById(appointmentId)
        if (appointment && appointment.docId === docId) {
            res.json({
                success: true,
                callStatus: appointment.callStatus,
                callAnswer: appointment.callAnswer,
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

const endCallDoctor = async (req, res) => {
    try {
        const { docId, appointmentId } = req.body
        const appointment = await appointmentModel.findById(appointmentId)
        if (appointment && appointment.docId === docId) {
            await appointmentModel.findByIdAndUpdate(appointmentId, {
                callStatus: 'ended',
                callOffer: null,
                callAnswer: null,
                callIceCandidates: [],
                callerRole: ''
            })
            res.json({ success: true, message: 'Call ended' })
        } else {
            res.json({ success: false, message: 'Unauthorized or invalid appointment' })
        }
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

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
    blockDoctorSlots,
    getDoctorSlots,
    initiateCallDoctor,
    saveIceDoctor,
    getCallSignalDoctor,
    endCallDoctor
}