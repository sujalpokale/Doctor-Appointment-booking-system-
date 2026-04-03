import mongoose from "mongoose";

const healthMetricSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    metricKey: { type: String, required: true },
    value: { type: Number, required: true },
    recordedAt: { type: Number, required: true },
    note: { type: String, default: "" },
    /** Set when the reading was entered by a doctor (patient accounts are view-only). */
    recordedByDocId: { type: String, default: "" },
});

const healthMetricModel =
    mongoose.models.healthMetric ||
    mongoose.model("healthMetric", healthMetricSchema);

export default healthMetricModel;
