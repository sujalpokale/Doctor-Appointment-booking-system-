import jwt from "jsonwebtoken";
import appointmentModel from "../models/appointmentModel.js";
import doctorModel from "../models/doctorModel.js";
import bcrypt from "bcrypt";
import validator from "validator";
import { v2 as cloudinary } from "cloudinary";
import userModel from "../models/userModel.js";
import sendEmail from "../utils/sendEmail.js";

// API for admin login
const loginAdmin = async (req, res) => {
    try {

        const { email, password } = req.body

        if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
            const token = jwt.sign(email + password, process.env.JWT_SECRET)
            res.json({ success: true, token })
        } else {
            res.json({ success: false, message: "Invalid credentials" })
        }

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }

}


// API to get all appointments list
const appointmentsAdmin = async (req, res) => {
    try {

        const appointments = await appointmentModel.find({})
        res.json({ success: true, appointments })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }

}

// API for appointment cancellation
const appointmentCancel = async (req, res) => {
    try {

        const { appointmentId } = req.body
        await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true })

        res.json({ success: true, message: 'Appointment Cancelled' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }

}

// API for adding Doctor
const addDoctor = async (req, res) => {

    try {

        const { name, email, password, speciality, degree, experience, about, fees, address } = req.body
        const imageFile = req.file

        // checking for all data to add doctor
        if (!name || !email || !password || !speciality || !degree || !experience || !about || !fees || !address) {
            return res.json({ success: false, message: "Missing Details" })
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

        // upload image to cloudinary
        const imageUpload = await cloudinary.uploader.upload(imageFile.path, { resource_type: "image" })
        const imageUrl = imageUpload.secure_url

        const doctorData = {
            name,
            email,
            image: imageUrl,
            password: hashedPassword,
            speciality,
            degree,
            experience,
            about,
            fees,
            address: JSON.parse(address),
            date: Date.now()
        }

        const newDoctor = new doctorModel(doctorData)
        await newDoctor.save()
        res.json({ success: true, message: 'Doctor Added' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to get all doctors list for admin panel
const allDoctors = async (req, res) => {
    try {

        const doctors = await doctorModel.find({}).select('-password')
        res.json({ success: true, doctors })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to get dashboard data for admin panel
const adminDashboard = async (req, res) => {
    try {

        const doctors = await doctorModel.find({})
        const users = await userModel.find({})
        const appointments = await appointmentModel.find({})

        const dashData = {
            doctors: doctors.length,
            appointments: appointments.length,
            patients: users.length,
            latestAppointments: appointments.reverse(),
            topRatedDoctors: doctors.sort((a, b) => b.averageRating - a.averageRating).slice(0, 5)
        }

        res.json({ success: true, dashData })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to toggle doctor verification status
const toggleVerification = async (req, res) => {
    try {
        const { docId } = req.body;
        const doctor = await doctorModel.findById(docId);
        if (!doctor) {
            return res.json({ success: false, message: "Doctor not found" });
        }
        doctor.isVerified = !doctor.isVerified;
        await doctor.save();
        res.json({ success: true, message: `Doctor status changed to: ${doctor.isVerified ? 'Verified' : 'Unverified'}` });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

const sendBroadcast = async (req, res) => {
    try {
        const { subject, body, target } = req.body;

        if (!subject || !body) {
            return res.json({ success: false, message: "Subject and Body are required." });
        }

        let recipients = [];
        if (target === "doctors") {
            recipients = await doctorModel.find({}, "email name");
        } else {
            // default is patients
            recipients = await userModel.find({}, "email name");
        }

        if (recipients.length === 0) {
            return res.json({ success: false, message: "No recipients found for this target." });
        }

        let successCount = 0;
        for (const recipient of recipients) {
            try {
                const personalizedHtml = `
                    <div style="font-family: Arial, sans-serif; padding: 25px; color: #334155; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                        <div style="background: linear-gradient(135deg, #5f6caf, #38bdf8); color: #ffffff; padding: 25px; border-radius: 10px; text-align: center; margin-bottom: 25px;">
                            <h1 style="margin: 0; font-size: 22px; font-weight: bold; letter-spacing: 0.5px;">Mediconsult Health Newsletter</h1>
                            <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Your Premium Healthcare Partner</p>
                        </div>
                        <p style="font-size: 16px;">Dear <strong>${recipient.name}</strong>,</p>
                        <div style="background-color: #f8fafc; border-left: 4px solid #5f6caf; padding: 20px; border-radius: 6px; font-size: 15px; color: #1e293b; margin: 20px 0; white-space: pre-wrap;">
                            ${body}
                        </div>
                        <p style="font-size: 14px; margin-top: 25px;">Stay healthy,<br/><strong>Mediconsult Admin Team</strong></p>
                        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 25px 0;" />
                        <p style="font-size: 11px; color: #94a3b8; text-align: center;">
                            This is a transactional broadcast from Mediconsult. To manage your communication preferences, please visit your account dashboard.<br/>
                            &copy; 2026 Mediconsult Inc. All rights reserved.
                        </p>
                    </div>
                `;

                await sendEmail(recipient.email, subject, subject, personalizedHtml);
                successCount++;
            } catch (err) {
                console.log(`Failed to send email to ${recipient.email}:`, err.message);
            }
        }

        res.json({ success: true, message: `Broadcast successfully dispatched to ${successCount} recipients.` });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

export {
    loginAdmin,
    appointmentsAdmin,
    appointmentCancel,
    addDoctor,
    allDoctors,
    adminDashboard,
    toggleVerification,
    sendBroadcast
}