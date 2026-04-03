import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    docId: { type: String, required: true },
    senderRole: { type: String, enum: ["user", "doctor"], required: true },
    text: { type: String, required: true },
    createdAt: { type: Number, required: true },
});

const chatMessageModel =
    mongoose.models.chatMessage ||
    mongoose.model("chatMessage", chatMessageSchema);

export default chatMessageModel;
