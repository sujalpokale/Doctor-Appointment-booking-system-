import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, uppercase: true },
    discountPercent: { type: Number, required: true, min: 0, max: 100 },
    maxDiscount: { type: Number, required: true, default: 0 }, // 0 means unlimited
    expiryDate: { type: Number, required: true },
    isActive: { type: Boolean, default: true }
});

const couponModel = mongoose.models.coupon || mongoose.model("coupon", couponSchema);
export default couponModel;
