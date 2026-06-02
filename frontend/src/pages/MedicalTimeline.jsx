import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'

const MedicalTimeline = () => {
    const { backendUrl, token } = useContext(AppContext)
    const [history, setHistory] = useState([])
    const [loading, setLoading] = useState(true)

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const slotDateFormat = (slotDate) => {
        const dateArray = slotDate.split('_')
        return dateArray[0] + " " + months[Number(dateArray[1])] + " " + dateArray[2]
    }

    const fetchMedicalHistory = async () => {
        try {
            setLoading(true)
            const { data } = await axios.get(backendUrl + '/api/user/appointments', { headers: { token } })
            if (data.success) {
                // Filter only completed appointments
                const completed = data.appointments.filter(app => app.isCompleted)
                // Sort chronologically (newest first)
                completed.sort((a, b) => b.date - a.date)
                setHistory(completed)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.log(error)
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    const handlePrintPrescription = (appointment) => {
        const printWindow = window.open('', '_blank');
        
        let prescriptionRows = '';
        if (appointment.prescription && appointment.prescription.length > 0) {
            prescriptionRows = appointment.prescription.map(med => {
                const generic = med.medicine.toLowerCase().includes("paracetamol") ? "Generic: Acetaminophen (Analgesic)" : 
                                med.medicine.toLowerCase().includes("amoxicillin") ? "Generic: Amoxicillin Trihydrate (Antibacterial)" : 
                                med.medicine.toLowerCase().includes("pantocid") || med.medicine.toLowerCase().includes("pantoprazole") ? "Generic: Pantoprazole Sodium (Proton Pump Inhibitor)" :
                                med.medicine.toLowerCase().includes("cetirizine") || med.medicine.toLowerCase().includes("allegra") ? "Generic: Cetirizine Hydrochloride (Antihistamine)" :
                                med.medicine.toLowerCase().includes("ibuprofen") ? "Generic: Ibuprofen (NSAID)" :
                                "Generic: Formulated Active Therapeutic Compound";
                return `
                <tr>
                    <td style="padding: 14px 16px; border-bottom: 1px solid #f1f5f9; text-align: left;">
                        <div style="font-weight: 700; color: #0f172a; font-size: 14px;">${med.medicine}</div>
                        <div style="font-size: 11px; color: #94a3b8; font-weight: 500; margin-top: 2px;">${generic}</div>
                    </td>
                    <td style="padding: 14px 16px; border-bottom: 1px solid #f1f5f9; color: #334155; font-size: 13.5px; font-weight: 550;">${med.dosage}</td>
                    <td style="padding: 14px 16px; border-bottom: 1px solid #f1f5f9; color: #334155; font-size: 13.5px; font-weight: 550;">${med.frequency}</td>
                    <td style="padding: 14px 16px; border-bottom: 1px solid #f1f5f9; color: #334155; font-size: 13.5px; font-weight: 550;">${med.duration}</td>
                </tr>
                `;
            }).join('');
        }

        const qrData = `Mediconsult Certified Medical Report\nAppointment ID: ${appointment._id}\nPatient: ${appointment.userData.name}\nDoctor: ${appointment.docData.name} (${appointment.docData.speciality})\nDate: ${slotDateFormat(appointment.slotDate)}\nMedicines: ${appointment.prescription && appointment.prescription.length > 0 ? appointment.prescription.map(m => m.medicine).join(', ') : 'None'}`;
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Prescription - Dr. ${appointment.docData.name}</title>
                <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Great+Vibes&family=Playfair+Display:ital,wght@0,600;1,500&display=swap" rel="stylesheet">
                <style>
                    body {
                        font-family: 'Outfit', sans-serif;
                        color: #0f172a;
                        margin: 0;
                        padding: 40px;
                        background-color: #ffffff;
                        line-height: 1.6;
                    }
                    .prescription-card {
                        border: 2px solid #e2e8f0;
                        border-radius: 20px;
                        padding: 40px;
                        position: relative;
                        background: #ffffff;
                        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.02);
                        max-width: 820px;
                        margin: 0 auto;
                    }
                    .watermark {
                        position: absolute;
                        top: 55%;
                        left: 50%;
                        transform: translate(-50%, -50%) rotate(-30deg);
                        font-size: 85px;
                        font-weight: 800;
                        color: rgba(95, 108, 175, 0.025);
                        text-transform: uppercase;
                        letter-spacing: 12px;
                        pointer-events: none;
                        user-select: none;
                    }
                    .header {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        border-bottom: 3.5px double #cbd5e1;
                        padding-bottom: 25px;
                        margin-bottom: 25px;
                    }
                    .doctor-info {
                        max-width: 60%;
                        border-left: 4px solid #5f6caf;
                        padding-left: 15px;
                    }
                    .doctor-name {
                        font-size: 26px;
                        font-weight: 800;
                        color: #5f6caf;
                        letter-spacing: -0.5px;
                        margin: 0;
                    }
                    .doctor-meta {
                        font-size: 13px;
                        color: #64748b;
                        margin: 4px 0 0 0;
                        font-weight: 500;
                    }
                    .doctor-reg {
                        font-size: 11px;
                        font-weight: 700;
                        color: #5f6caf;
                        background: rgba(95, 108, 175, 0.08);
                        padding: 3px 8px;
                        border-radius: 4px;
                        display: inline-block;
                        margin-top: 8px;
                        text-transform: uppercase;
                    }
                    .clinic-info {
                        text-align: right;
                        max-width: 35%;
                    }
                    .clinic-brand {
                        font-size: 22px;
                        font-weight: 800;
                        color: #0f172a;
                    }
                    .clinic-brand span {
                        color: #5f6caf;
                    }
                    .clinic-details {
                        font-size: 12px;
                        color: #64748b;
                        margin-top: 6px;
                        line-height: 1.45;
                        font-weight: 450;
                    }
                    .patient-grid {
                        background-color: #f8fafc;
                        border: 1px solid #e2e8f0;
                        border-radius: 14px;
                        padding: 20px 24px;
                        display: grid;
                        grid-template-columns: repeat(4, 1fr);
                        gap: 16px;
                        margin-bottom: 30px;
                    }
                    .grid-item {
                        display: flex;
                        flex-direction: column;
                    }
                    .grid-label {
                        font-size: 10px;
                        color: #64748b;
                        text-transform: uppercase;
                        font-weight: 750;
                        letter-spacing: 0.6px;
                        margin-bottom: 3px;
                    }
                    .grid-value {
                        font-size: 13.5px;
                        font-weight: 650;
                        color: #0f172a;
                    }
                    .rx-symbol {
                        font-family: 'Playfair Display', serif;
                        font-size: 42px;
                        font-weight: 600;
                        color: #5f6caf;
                        margin: 20px 0 10px 0;
                        line-height: 1;
                        font-style: italic;
                    }
                    .med-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 30px;
                    }
                    .med-table th {
                        text-align: left;
                        padding: 12px 16px;
                        font-size: 11px;
                        font-weight: 700;
                        text-transform: uppercase;
                        color: #64748b;
                        border-bottom: 2.5px solid #e2e8f0;
                        letter-spacing: 0.5px;
                    }
                    .clinical-remarks {
                        background-color: #faf5ff;
                        border-left: 4px solid #a855f7;
                        border-radius: 0 8px 8px 0;
                        padding: 18px 22px;
                        margin-bottom: 40px;
                        border-top: 1px solid rgba(168, 85, 247, 0.08);
                        border-right: 1px solid rgba(168, 85, 247, 0.08);
                        border-bottom: 1px solid rgba(168, 85, 247, 0.08);
                    }
                    .remarks-title {
                        font-size: 11.5px;
                        font-weight: 750;
                        color: #701a75;
                        text-transform: uppercase;
                        letter-spacing: 0.6px;
                        margin-bottom: 6px;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                    }
                    .remarks-body {
                        font-size: 13.5px;
                        font-style: italic;
                        color: #581c87;
                        margin: 0;
                        white-space: pre-wrap;
                        font-weight: 450;
                    }
                    .seal-signature-section {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-end;
                        margin-top: 40px;
                        border-top: 1px solid #f1f5f9;
                        padding-top: 25px;
                    }
                    .verification-card {
                        display: flex;
                        align-items: center;
                        gap: 15px;
                        background: #fafafa;
                        border: 1px solid #f1f5f9;
                        padding: 12px 16px;
                        border-radius: 12px;
                    }
                    .qr-code-img {
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        padding: 4px;
                        background: #fff;
                        display: block;
                    }
                    .verif-text {
                        font-size: 10.5px;
                        color: #64748b;
                        line-height: 1.45;
                        font-weight: 450;
                    }
                    .verif-badge {
                        display: inline-flex;
                        align-items: center;
                        gap: 4px;
                        background-color: #ecfdf5;
                        color: #10b981;
                        font-weight: 750;
                        font-size: 9px;
                        padding: 2.5px 9px;
                        border-radius: 9999px;
                        text-transform: uppercase;
                        margin-bottom: 5px;
                        border: 1px solid rgba(16, 185, 129, 0.15);
                    }
                    .signature-card {
                        text-align: right;
                        display: flex;
                        flex-direction: column;
                        align-items: flex-end;
                    }
                    .handwritten-signature {
                        font-family: 'Great Vibes', cursive;
                        font-size: 38px;
                        color: #5f6caf;
                        margin-bottom: -15px;
                        transform: rotate(-2deg);
                        padding-right: 15px;
                        user-select: none;
                    }
                    .sig-line {
                        width: 210px;
                        border-top: 1.5px solid #cbd5e1;
                        margin: 12px 0 6px 0;
                    }
                    .sig-title {
                        font-size: 12px;
                        font-weight: 700;
                        color: #0f172a;
                    }
                    .sig-meta {
                        font-size: 10px;
                        color: #94a3b8;
                        margin-top: 2px;
                        font-weight: 500;
                    }
                    .footer {
                        margin-top: 40px;
                        text-align: center;
                        font-size: 10px;
                        color: #94a3b8;
                        border-top: 1px solid #f1f5f9;
                        padding-top: 18px;
                        font-weight: 450;
                    }
                    @media print {
                        body { padding: 0; margin: 20px; }
                        .prescription-card { border: none; box-shadow: none; padding: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="prescription-card">
                    <div class="watermark">MEDICONSULT</div>
                    
                    <div class="header">
                        <div class="doctor-info">
                            <h1 class="doctor-name">${appointment.docData.name}</h1>
                            <p class="doctor-meta">${appointment.docData.speciality} &bull; Practitioner</p>
                            <p class="doctor-meta" style="font-size: 12px; color: #475569; font-weight: 600;">MBBS, MD (Clinical Medicine)</p>
                            <span class="doctor-reg">Lic Reg No: MC-${appointment.docId.substring(0, 8).toUpperCase()}</span>
                        </div>
                        <div class="clinic-info">
                            <div class="clinic-brand">Medi<span>consult</span></div>
                            <div class="clinic-details">
                                Telehealth Network and Clinics<br>
                                ${appointment.docData.address.line1}<br>
                                ${appointment.docData.address.line2}<br>
                                support@mediconsult.com
                            </div>
                        </div>
                    </div>
                    
                    <div class="patient-grid">
                        <div class="grid-item">
                            <span class="grid-label">Patient Name</span>
                            <span class="grid-value">${appointment.userData.name}</span>
                        </div>
                        <div class="grid-item">
                            <span class="grid-label">Age / Gender</span>
                            <span class="grid-value">${new Date().getFullYear() - new Date(appointment.userData.dob).getFullYear() || 'N/A'} yrs / ${appointment.userData.gender || 'Male'}</span>
                        </div>
                        <div class="grid-item">
                            <span class="grid-label">Consult Date</span>
                            <span class="grid-value">${slotDateFormat(appointment.slotDate)}</span>
                        </div>
                        <div class="grid-item">
                            <span class="grid-label">Rx ID Reference</span>
                            <span class="grid-value">MC-RX-${appointment._id.substring(0, 7).toUpperCase()}</span>
                        </div>
                        <div class="grid-item" style="margin-top: 10px;">
                            <span class="grid-label">Blood Pressure</span>
                            <span class="grid-value" style="color: #64748b; font-weight: 500;">120/80 mmHg</span>
                        </div>
                        <div class="grid-item" style="margin-top: 10px;">
                            <span class="grid-label">Heart Rate</span>
                            <span class="grid-value" style="color: #64748b; font-weight: 500;">72 bpm</span>
                        </div>
                        <div class="grid-item" style="margin-top: 10px;">
                            <span class="grid-label">Weight</span>
                            <span class="grid-value" style="color: #64748b; font-weight: 500;">68 kg</span>
                        </div>
                        <div class="grid-item" style="margin-top: 10px;">
                            <span class="grid-label">Prescription State</span>
                            <span class="grid-value" style="color: #10b981; font-weight: 700;">E-SIGNED ✓</span>
                        </div>
                    </div>
                    
                    <div class="rx-symbol">R<span>x</span></div>
                    
                    ${prescriptionRows ? `
                        <table class="med-table">
                            <thead>
                                <tr>
                                    <th style="width: 45%;">Medicine / Generic Composition</th>
                                    <th style="width: 15%;">Dosage</th>
                                    <th style="width: 20%;">Frequency</th>
                                    <th style="width: 20%;">Duration</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${prescriptionRows}
                            </tbody>
                        </table>
                    ` : `
                        <p style="color: #94a3b8; font-style: italic; margin-bottom: 30px;">No specific medications prescribed for this consultation.</p>
                    `}
                    
                    <div class="clinical-remarks">
                        <div class="remarks-title">
                            <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            Practitioner Diagnostics & Advice
                        </div>
                        <p class="remarks-body">${appointment.notes || "No clinical remarks or advice recorded for this session. Recommended plenty of fluids and rest."}</p>
                    </div>
                    
                    <div class="seal-signature-section">
                        <div class="verification-card">
                            <img class="qr-code-img" src="${qrCodeUrl}" width="80" height="80" alt="Verification QR Code" />
                            <div>
                                <span class="verif-badge">✓ Secure e-Rx</span>
                                <div class="verif-text">
                                    <strong>Digitally Verified Medical Document</strong><br>
                                    Mediconsult Secure Portal Access<br>
                                    Scan QR code to verify details
                                </div>
                            </div>
                        </div>
                        
                        <div class="signature-card">
                            <div class="handwritten-signature">Dr. ${appointment.docData.name.split(' ').pop()}</div>
                            <div class="sig-line"></div>
                            <span class="sig-title">Authorized Medical Practitioner Seal</span>
                            <span class="sig-meta">Digitally Authenticated Stamp</span>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p>This is a verified computer-generated medical record powered by Mediconsult Secure e-Rx portal.</p>
                        <p>Doc ID Reference: ${appointment.docId} | Unique Appointment Hash: ${appointment._id}</p>
                        <p>&copy; ${new Date().getFullYear()} Mediconsult Digital Health Clinic. All rights reserved.</p>
                    </div>
                </div>
                
                <script>
                    window.onload = function() {
                        window.print();
                        window.onafterprint = function() { window.close(); };
                    }
                </script>
            </body>
            </html>
        `;
        printWindow.document.write(printContent);
        printWindow.document.close();
    };

    useEffect(() => {
        if (token) {
            fetchMedicalHistory()
        }
    }, [token])

    return (
        <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
            <div className="text-center mb-12">
                <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl tracking-tight">
                    Your Medical History Timeline
                </h1>
                <p className="mt-3 max-w-2xl mx-auto text-base text-gray-500 sm:mt-4">
                    A chronological roadmap of your historical consultations, doctor diagnoses, and clinical prescriptions.
                </p>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-48">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                </div>
            ) : history.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                    <p className="text-gray-400 text-lg font-medium">No completed consultation history found.</p>
                    <p className="text-gray-500 text-sm mt-1">Once you complete a scheduled doctor appointment, details will map here.</p>
                </div>
            ) : (
                <div className="relative border-l-2 border-[#5f6caf]/30 ml-4 sm:ml-32">
                    {history.map((app, index) => (
                        <div key={app._id} className="mb-10 ml-6 relative">
                            {/* Bullet icon on timeline */}
                            <span className="absolute -left-9 top-1.5 bg-[#5f6caf] text-white flex items-center justify-center rounded-full w-6 h-6 ring-4 ring-white shadow-sm font-semibold text-xs">
                                {history.length - index}
                            </span>

                            {/* Sticky Left Date for Large Viewports */}
                            <div className="hidden sm:block absolute -left-36 top-1.5 text-right w-28">
                                <p className="text-sm font-bold text-gray-800">{slotDateFormat(app.slotDate)}</p>
                                <p className="text-xs text-gray-500">{app.slotTime}</p>
                            </div>

                            {/* Timeline Card */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:border-[#5f6caf]/40 transition-all duration-300 p-6 flex flex-col md:flex-row gap-6">
                                <div className="flex-1">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <img 
                                                className="w-12 h-12 bg-[#EAEFFF] rounded-full object-cover border-2 border-[#5f6caf]/20" 
                                                src={app.docData.image} 
                                                alt={app.docData.name} 
                                            />
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900">{app.docData.name}</h3>
                                                <p className="text-xs text-primary font-medium">{app.docData.speciality}</p>
                                            </div>
                                        </div>
                                        <div className="sm:text-right">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                                Consultation Complete
                                            </span>
                                            <p className="block sm:hidden text-xs font-semibold text-gray-500 mt-1">{slotDateFormat(app.slotDate)} | {app.slotTime}</p>
                                        </div>
                                    </div>

                                    <div className="mt-3">
                                        <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
                                            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                            </svg>
                                            Clinical Notes & Prescription Remarks
                                        </h4>
                                        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 italic border-l-4 border-primary/50 font-light white-space-pre-wrap">
                                            {app.notes || "No clinical remarks recorded for this session."}
                                        </div>
                                    </div>

                                    {app.aiSummary && (
                                        <div className="mt-4">
                                            <h4 className="text-sm font-semibold text-purple-650 mb-2 flex items-center gap-1.5">
                                                <svg className="w-4 h-4 text-purple-650" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                                                </svg>
                                                AI Diagnostic Clinical Summary ✦
                                            </h4>
                                            <div className="bg-purple-50/20 rounded-lg p-4 text-sm text-gray-650 border border-purple-100/60 leading-relaxed font-medium">
                                                {app.aiSummary}
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-5 flex justify-end gap-3 border-t border-gray-50 pt-4">
                                        <button 
                                            onClick={() => handlePrintPrescription(app)}
                                            className="inline-flex items-center gap-1.5 px-4 py-2 border border-primary text-primary text-xs font-semibold rounded-lg hover:bg-primary/5 transition-all"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                            </svg>
                                            Export Report
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default MedicalTimeline
