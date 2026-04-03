import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import doctorModel from './models/doctorModel.js';

// Recreated the 15 Doctors but with absolute/relative local paths instead of React ES Imports
const prototypeDoctors = [
    {
        name: 'Dr. Richard James',
        imagePath: '../frontend/src/assets/doc1.png',
        speciality: 'General physician',
        degree: 'MBBS',
        experience: '4 Years',
        about: 'Dr. Davis has a strong commitment to delivering comprehensive medical care, focusing on preventive medicine, early diagnosis, and effective treatment strategies.',
        fees: 50,
        address: { line1: '17th Cross, Richmond', line2: 'Circle, Ring Road, London' }
    },
    {
        name: 'Dr. Emily Larson',
        imagePath: '../frontend/src/assets/doc2.png',
        speciality: 'Gynecologist',
        degree: 'MBBS',
        experience: '3 Years',
        about: 'Dr. Davis has a strong commitment to delivering comprehensive medical care, focusing on preventive medicine, early diagnosis, and effective treatment strategies.',
        fees: 60,
        address: { line1: '27th Cross, Richmond', line2: 'Circle, Ring Road, London' }
    },
    {
        name: 'Dr. Sarah Patel',
        imagePath: '../frontend/src/assets/doc3.png',
        speciality: 'Dermatologist',
        degree: 'MBBS',
        experience: '1 Years',
        about: 'Dr. Davis has a strong commitment to delivering comprehensive medical care, focusing on preventive medicine, early diagnosis, and effective treatment strategies.',
        fees: 30,
        address: { line1: '37th Cross, Richmond', line2: 'Circle, Ring Road, London' }
    },
    {
        name: 'Dr. Christopher Lee',
        imagePath: '../frontend/src/assets/doc4.png',
        speciality: 'Pediatricians',
        degree: 'MBBS',
        experience: '2 Years',
        about: 'Dr. Davis has a strong commitment to delivering comprehensive medical care, focusing on preventive medicine, early diagnosis, and effective treatment strategies.',
        fees: 40,
        address: { line1: '47th Cross, Richmond', line2: 'Circle, Ring Road, London' }
    },
    {
        name: 'Dr. Jennifer Garcia',
        imagePath: '../frontend/src/assets/doc5.png',
        speciality: 'Neurologist',
        degree: 'MBBS',
        experience: '4 Years',
        about: 'Dr. Davis has a strong commitment to delivering comprehensive medical care, focusing on preventive medicine, early diagnosis, and effective treatment strategies.',
        fees: 50,
        address: { line1: '57th Cross, Richmond', line2: 'Circle, Ring Road, London' }
    },
    {
        name: 'Dr. Andrew Williams',
        imagePath: '../frontend/src/assets/doc6.png',
        speciality: 'Neurologist',
        degree: 'MBBS',
        experience: '4 Years',
        about: 'Dr. Davis has a strong commitment to delivering comprehensive medical care, focusing on preventive medicine, early diagnosis, and effective treatment strategies.',
        fees: 50,
        address: { line1: '57th Cross, Richmond', line2: 'Circle, Ring Road, London' }
    },
    {
        name: 'Dr. Christopher Davis',
        imagePath: '../frontend/src/assets/doc7.png',
        speciality: 'General physician',
        degree: 'MBBS',
        experience: '4 Years',
        about: 'Dr. Davis has a strong commitment to delivering comprehensive medical care, focusing on preventive medicine, early diagnosis, and effective treatment strategies.',
        fees: 50,
        address: { line1: '17th Cross, Richmond', line2: 'Circle, Ring Road, London' }
    },
    {
        name: 'Dr. Timothy White',
        imagePath: '../frontend/src/assets/doc8.png',
        speciality: 'Gynecologist',
        degree: 'MBBS',
        experience: '3 Years',
        about: 'Dr. Davis has a strong commitment to delivering comprehensive medical care, focusing on preventive medicine, early diagnosis, and effective treatment strategies.',
        fees: 60,
        address: { line1: '27th Cross, Richmond', line2: 'Circle, Ring Road, London' }
    },
    {
        name: 'Dr. Ava Mitchell',
        imagePath: '../frontend/src/assets/doc9.png',
        speciality: 'Dermatologist',
        degree: 'MBBS',
        experience: '1 Years',
        about: 'Dr. Davis has a strong commitment to delivering comprehensive medical care, focusing on preventive medicine, early diagnosis, and effective treatment strategies.',
        fees: 30,
        address: { line1: '37th Cross, Richmond', line2: 'Circle, Ring Road, London' }
    },
    {
        name: 'Dr. Jeffrey King',
        imagePath: '../frontend/src/assets/doc10.png',
        speciality: 'Pediatricians',
        degree: 'MBBS',
        experience: '2 Years',
        about: 'Dr. Davis has a strong commitment to delivering comprehensive medical care, focusing on preventive medicine, early diagnosis, and effective treatment strategies.',
        fees: 40,
        address: { line1: '47th Cross, Richmond', line2: 'Circle, Ring Road, London' }
    },
    {
        name: 'Dr. Zoe Kelly',
        imagePath: '../frontend/src/assets/doc11.png',
        speciality: 'Neurologist',
        degree: 'MBBS',
        experience: '4 Years',
        about: 'Dr. Davis has a strong commitment to delivering comprehensive medical care, focusing on preventive medicine, early diagnosis, and effective treatment strategies.',
        fees: 50,
        address: { line1: '57th Cross, Richmond', line2: 'Circle, Ring Road, London' }
    },
    {
        name: 'Dr. Patrick Harris',
        imagePath: '../frontend/src/assets/doc12.png',
        speciality: 'Neurologist',
        degree: 'MBBS',
        experience: '4 Years',
        about: 'Dr. Davis has a strong commitment to delivering comprehensive medical care, focusing on preventive medicine, early diagnosis, and effective treatment strategies.',
        fees: 50,
        address: { line1: '57th Cross, Richmond', line2: 'Circle, Ring Road, London' }
    },
    {
        name: 'Dr. Chloe Evans',
        imagePath: '../frontend/src/assets/doc13.png',
        speciality: 'General physician',
        degree: 'MBBS',
        experience: '4 Years',
        about: 'Dr. Davis has a strong commitment to delivering comprehensive medical care, focusing on preventive medicine, early diagnosis, and effective treatment strategies.',
        fees: 50,
        address: { line1: '17th Cross, Richmond', line2: 'Circle, Ring Road, London' }
    },
    {
        name: 'Dr. Ryan Martinez',
        imagePath: '../frontend/src/assets/doc14.png',
        speciality: 'Gynecologist',
        degree: 'MBBS',
        experience: '3 Years',
        about: 'Dr. Davis has a strong commitment to delivering comprehensive medical care, focusing on preventive medicine, early diagnosis, and effective treatment strategies.',
        fees: 60,
        address: { line1: '27th Cross, Richmond', line2: 'Circle, Ring Road, London' }
    },
    {
        name: 'Dr. Amelia Hill',
        imagePath: '../frontend/src/assets/doc15.png',
        speciality: 'Dermatologist',
        degree: 'MBBS',
        experience: '1 Years',
        about: 'Dr. Davis has a strong commitment to delivering comprehensive medical care, focusing on preventive medicine, early diagnosis, and effective treatment strategies.',
        fees: 30,
        address: { line1: '37th Cross, Richmond', line2: 'Circle, Ring Road, London' }
    }
];

const seedDoctors = async () => {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(`${process.env.MONGODB_URI}/prescripto`);
        console.log('✅ MongoDB connected!');

        console.log('☁️ Configuring Cloudinary...');
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_SECRET_KEY
        });

        console.log(`🚀 Starting Database Injection for ${prototypeDoctors.length} Doctors...\n`);

        for (let i = 0; i < prototypeDoctors.length; i++) {
            const data = prototypeDoctors[i];
            
            // 1. Check if doctor already exists
            const extractFirst = data.name.replace('Dr. ', '').split(' ')[0].toLowerCase();
            const email = `${extractFirst}@example.com`;
            
            const existing = await doctorModel.findOne({ email });
            if (existing) {
                console.log(`⏩ Skipping ${data.name} (Already exists at ${email})`);
                continue;
            }

            // 2. Upload image to Cloudinary
            const fullLocalPath = path.resolve(data.imagePath);
            if (!fs.existsSync(fullLocalPath)) {
                console.error(`❌ ERROR: Could not find image at ${fullLocalPath}`);
                continue;
            }

            console.log(`⬆️ Uploading image for ${data.name}...`);
            const imageUpload = await cloudinary.uploader.upload(fullLocalPath, { resource_type: "image" });
            const imageUrl = imageUpload.secure_url;

            // 3. Generate Password (e.g. rahul@123)
            const rawPassword = `${extractFirst}@123`;
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(rawPassword, salt);

            // 4. Create the final metadata object and save it
            const newDoctor = new doctorModel({
                name: data.name,
                email: email,
                password: hashedPassword,
                image: imageUrl,
                speciality: data.speciality,
                degree: data.degree,
                experience: data.experience,
                about: data.about,
                fees: data.fees,
                address: data.address,
                date: Date.now(),
                reviews: [],
                averageRating: 0
            });

            await newDoctor.save();
            console.log(`✅ SUCCESS: Built Profile for ${data.name}! (Email: ${email} | Password: ${rawPassword})`);
        }

        console.log('\n🎉 ALL DOCTORS HAS BEEN SUCCESSFULLY INJECTED INTO THE DATABASE!');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ FATAL SEED ERROR:', error);
        process.exit(1);
    }
};

seedDoctors();
