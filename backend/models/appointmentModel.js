import mongoose from "mongoose"

const appointmentSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    docId: { type: String, required: true },
    slotDate: { type: String, required: true },
    slotTime: { type: String, required: true },
    userData: { type: Object, required: true },
    docData: { type: Object, required: true },
    amount: { type: Number, required: true },
    date: { type: Number, required: true },
    cancelled: { type: Boolean, default: false },
    payment: { type: Boolean, default: false },
    isCompleted: { type: Boolean, default: false },
    isReviewed: { type: Boolean, default: false },
    notes: { type: String, default: "" },
    rescheduledCount: { type: Number, default: 0 },
    originalSlotDate: { type: String, default: "" },
    originalSlotTime: { type: String, default: "" },
    prescription: { type: Array, default: [] },
    aiSummary: { type: String, default: "" },
    callStatus: { type: String, default: "idle" }, // 'idle', 'calling', 'active', 'ended'
    callOffer: { type: Object, default: null },
    callAnswer: { type: Object, default: null },
    callIceCandidates: { type: Array, default: [] },
    callerRole: { type: String, default: "" }
})

const appointmentModel = mongoose.models.appointment || mongoose.model("appointment", appointmentSchema)
export default appointmentModel