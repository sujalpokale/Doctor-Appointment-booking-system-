import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'

const MedicationReminders = () => {
    const { backendUrl, token } = useContext(AppContext)
    const [medications, setMedications] = useState([])
    const [loading, setLoading] = useState(true)
    const [takenState, setTakenState] = useState({}) // Keeps track of taken doses for today

    const navigate = useNavigate()

    const fetchMedicationReminders = async () => {
        try {
            setLoading(true)
            const { data } = await axios.get(backendUrl + '/api/user/appointments', { headers: { token } })
            if (data.success) {
                // Filter completed appointments that contain prescription entries
                const completed = data.appointments.filter(app => app.isCompleted && app.prescription && app.prescription.length > 0)
                
                // Extract unique active medications with prescribing doctor context
                const medsList = []
                completed.forEach(app => {
                    app.prescription.forEach(pres => {
                        medsList.push({
                            id: `${app._id}-${pres.medicine}`,
                            medicine: pres.medicine,
                            dosage: pres.dosage,
                            frequency: pres.frequency,
                            duration: pres.duration,
                            prescribedBy: app.docData.name,
                            docSpecialty: app.docData.speciality,
                            docImage: app.docData.image,
                            date: app.slotDate
                        })
                    })
                })
                setMedications(medsList)
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

    useEffect(() => {
        if (token) {
            fetchMedicationReminders()
        }
    }, [token])

    const toggleDose = (medId, timeOfDay) => {
        const key = `${medId}-${timeOfDay}`
        setTakenState(prev => ({
            ...prev,
            [key]: !prev[key]
        }))
        
        // Show success toast on complete
        if (!takenState[key]) {
            toast.success(`Dose marked as taken! Stay healthy.`, { autoClose: 2000 })
        }
    }

    const parseFrequency = (freq) => {
        const parts = freq.split('-')
        return {
            morning: parts[0] === '1',
            afternoon: parts[1] === '1',
            night: parts[2] === '1'
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[60vh]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
            <div className="text-center mb-10">
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center justify-center gap-2">
                    💊 Active Medication Reminders Hub
                </h1>
                <p className="mt-3 text-base text-gray-500 max-w-xl mx-auto">
                    Track your daily dosage schedules, mark completed doses, and stay on top of clinical recommendations.
                </p>
            </div>

            {medications.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-stone-100 p-8 flex flex-col items-center gap-4">
                    <span className="text-5xl">📋</span>
                    <div>
                        <p className="text-gray-600 text-lg font-semibold">No active prescriptions found.</p>
                        <p className="text-gray-400 text-xs mt-1.5 max-w-xs mx-auto">Once a doctor prescribes structured medications for completed consultations, active schedules will list here automatically.</p>
                    </div>
                    <button 
                        onClick={() => navigate('/my-appointments')}
                        className="bg-primary text-white text-xs font-semibold px-5 py-2 rounded-lg hover:bg-primary/95 transition-all shadow-sm"
                    >
                        View Appointments
                    </button>
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    {medications.map((med) => {
                        const freqParsed = parseFrequency(med.frequency)
                        return (
                            <div key={med.id} className="bg-white rounded-2xl shadow-sm border border-stone-150 p-6 flex flex-col md:flex-row gap-6 hover:border-primary/30 transition-all duration-300">
                                
                                {/* Left Side: Medication Name and Doctor Profile */}
                                <div className="flex-1 flex gap-4">
                                    <div className="bg-[#5f6caf]/10 text-primary w-12 h-12 rounded-xl flex items-center justify-center font-bold text-2xl flex-shrink-0">
                                        💊
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                            {med.medicine}
                                            <span className="bg-blue-50 text-blue-600 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                                                {med.dosage}
                                            </span>
                                        </h3>
                                        <p className="text-xs text-gray-500 mt-1 font-medium">Duration: {med.duration} &bull; Prescribed on {med.date.replace(/_/g, '/')}</p>
                                        
                                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                                            <img className="w-7 h-7 rounded-full object-cover border border-stone-200" src={med.docImage} alt={med.prescribedBy} />
                                            <span className="text-xs text-gray-650">Prescribed by <strong>{med.prescribedBy}</strong> ({med.docSpecialty})</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Schedule Checklist */}
                                <div className="md:w-72 flex flex-col justify-center gap-3 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Today's Dosage Checklist</p>
                                    
                                    {/* Morning Dose */}
                                    {freqParsed.morning && (
                                        <div className="flex items-center justify-between bg-stone-50 p-2.5 rounded-lg border border-stone-100 text-xs">
                                            <span className="font-semibold text-gray-700">🌅 Morning Dose</span>
                                            <button 
                                                onClick={() => toggleDose(med.id, 'morning')}
                                                className={`text-[10px] font-bold px-3 py-1 rounded-full border transition-all ${takenState[`${med.id}-morning`] ? 'bg-green-100 text-green-700 border-green-200' : 'bg-white text-primary border-primary hover:bg-primary hover:text-white'}`}
                                            >
                                                {takenState[`${med.id}-morning`] ? 'Completed ✓' : 'Mark Taken'}
                                            </button>
                                        </div>
                                    )}

                                    {/* Afternoon Dose */}
                                    {freqParsed.afternoon && (
                                        <div className="flex items-center justify-between bg-stone-50 p-2.5 rounded-lg border border-stone-100 text-xs">
                                            <span className="font-semibold text-gray-700">☀️ Afternoon Dose</span>
                                            <button 
                                                onClick={() => toggleDose(med.id, 'afternoon')}
                                                className={`text-[10px] font-bold px-3 py-1 rounded-full border transition-all ${takenState[`${med.id}-afternoon`] ? 'bg-green-100 text-green-700 border-green-200' : 'bg-white text-primary border-primary hover:bg-primary hover:text-white'}`}
                                            >
                                                {takenState[`${med.id}-afternoon`] ? 'Completed ✓' : 'Mark Taken'}
                                            </button>
                                        </div>
                                    )}

                                    {/* Night Dose */}
                                    {freqParsed.night && (
                                        <div className="flex items-center justify-between bg-stone-50 p-2.5 rounded-lg border border-stone-100 text-xs">
                                            <span className="font-semibold text-gray-700">🌙 Night Dose</span>
                                            <button 
                                                onClick={() => toggleDose(med.id, 'night')}
                                                className={`text-[10px] font-bold px-3 py-1 rounded-full border transition-all ${takenState[`${med.id}-night`] ? 'bg-green-100 text-green-700 border-green-200' : 'bg-white text-primary border-primary hover:bg-primary hover:text-white'}`}
                                            >
                                                {takenState[`${med.id}-night`] ? 'Completed ✓' : 'Mark Taken'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default MedicationReminders
