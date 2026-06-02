import React, { useState } from 'react'
import { useContext, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DoctorContext } from '../../context/DoctorContext'
import { AppContext } from '../../context/AppContext'
import { assets } from '../../assets/assets'

const DoctorAppointments = () => {

  const navigate = useNavigate()
  const { dToken, appointments, getAppointments, cancelAppointment, completeAppointment } = useContext(DoctorContext)
  const { slotDateFormat, calculateAge, currency } = useContext(AppContext)

  const [activeNotesAppId, setActiveNotesAppId] = useState(null)
  const [notesText, setNotesText] = useState('')

  // Structured Prescription states
  const [prescriptions, setPrescriptions] = useState([{ medicine: '', dosage: '', frequency: '', duration: '' }])

  const addMedicineRow = () => {
    setPrescriptions(prev => [...prev, { medicine: '', dosage: '', frequency: '', duration: '' }])
  }

  const removeMedicineRow = (idx) => {
    setPrescriptions(prev => prev.filter((_, i) => i !== idx))
  }

  const updateMedicineField = (idx, field, value) => {
    setPrescriptions(prev => prev.map((med, i) => i === idx ? { ...med, [field]: value } : med))
  }

  useEffect(() => {
    if (dToken) {
      getAppointments()
    }
  }, [dToken])

  return (
    <div className='w-full max-w-6xl m-5 '>

      <p className='mb-3 text-lg font-medium'>All Appointments</p>

      <div className='bg-white border rounded text-sm max-h-[80vh] overflow-y-scroll'>
        <div className='max-sm:hidden grid grid-cols-[0.5fr_2fr_1fr_1fr_3fr_1fr_1fr_1fr_1fr] gap-1 py-3 px-6 border-b font-medium text-gray-700 bg-gray-50/50'>
          <p>#</p>
          <p>Patient</p>
          <p>Payment</p>
          <p>Age</p>
          <p>Date & Time</p>
          <p>Fees</p>
          <p>Chat</p>
          <p>Health</p>
          <p>Action</p>
        </div>
        {appointments.map((item, index) => (
          <React.Fragment key={index}>
            <div className='flex flex-wrap justify-between max-sm:gap-5 max-sm:text-base sm:grid grid-cols-[0.5fr_2fr_1fr_1fr_3fr_1fr_1fr_1fr_1fr] gap-1 items-center text-gray-500 py-3 px-6 border-b hover:bg-gray-50'>
              <p className='max-sm:hidden'>{index + 1}</p>
              <div className='flex items-center gap-2'>
                <img src={item.userData.image} className='w-8 rounded-full' alt="" /> <p className='font-semibold text-gray-800'>{item.userData.name}</p>
              </div>
              <div>
                <p className='text-xs inline border border-primary px-2 py-0.5 rounded-full bg-blue-50 text-primary font-medium'>
                  {item.payment?'Online':'CASH'}
                </p>
              </div>
              <p className='max-sm:hidden'>{calculateAge(item.userData.dob)}</p>
              <p className='font-medium text-gray-700'>{slotDateFormat(item.slotDate)}, {item.slotTime}</p>
              <p className='font-semibold text-gray-800'>{currency}{item.amount}</p>
              <button
                type='button'
                onClick={() => navigate('/doctor-chat?userId=' + encodeURIComponent(item.userId))}
                className='text-primary text-xs font-semibold hover:underline max-sm:py-1'
              >
                Open
              </button>
              <button
                type='button'
                onClick={() => navigate('/doctor-health?userId=' + encodeURIComponent(item.userId))}
                className='text-primary text-xs font-semibold hover:underline max-sm:py-1'
              >
                Open
              </button>
              {item.cancelled
                ? <p className='text-red-400 text-xs font-semibold'>Cancelled</p>
                : item.isCompleted
                  ? <p className='text-green-500 text-xs font-semibold'>Completed ✅</p>
                  : <div className='flex items-center gap-2'>
                      <button
                        type='button'
                        onClick={() => navigate(`/doctor-video-call?appointmentId=${item._id}`)}
                        className='p-1.5 rounded bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-sm animate-pulse'
                        title='Join Video Call'
                      >
                        <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                        </svg>
                      </button>
                      <img onClick={() => cancelAppointment(item._id)} className='w-8 cursor-pointer hover:scale-105 transition-all' src={assets.cancel_icon} alt="Cancel" />
                      <img onClick={() => { setActiveNotesAppId(item._id); setNotesText(''); }} className='w-8 cursor-pointer hover:scale-105 transition-all' src={assets.tick_icon} alt="Complete" />
                    </div>
              }
            </div>

            {item.isCompleted && (item.notes || item.aiSummary) && (
              <div className="bg-gray-50/50 p-4 border-b border-gray-150 text-xs flex flex-col gap-3 text-gray-700 w-full">
                {item.notes && (
                  <div>
                    <span className="font-bold text-gray-500 uppercase tracking-wider block">📋 Consultation Notes</span>
                    <p className="mt-1 text-gray-600 italic">"{item.notes}"</p>
                  </div>
                )}
                {item.aiSummary && (
                  <div className="pt-2.5 border-t border-dashed border-gray-200">
                    <span className="font-extrabold text-purple-650 uppercase tracking-wider block flex items-center gap-0.5">✦ AI Diagnostic Clinical Summary</span>
                    <p className="mt-1.5 text-gray-650 bg-purple-50/20 border border-purple-100/60 p-3 rounded-lg leading-relaxed font-medium">
                      {item.aiSummary}
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeNotesAppId === item._id && (
              <div className="bg-blue-50/40 p-5 border-b border-gray-100 flex flex-col gap-4 transition-all duration-300">
                <div className="flex justify-between items-center border-b pb-2">
                  <p className="font-semibold text-gray-800 text-sm flex items-center gap-1.5">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                    Record Consultation for {item.userData.name}
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column: General Diagnosis & Clinical Notes */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-gray-700">Diagnosis & Clinical Notes (General Advice)</label>
                    <textarea
                      className="w-full p-3 border border-gray-200 rounded-lg bg-white text-xs outline-none focus:ring-1 focus:ring-primary min-h-[150px] shadow-sm resize-y"
                      placeholder="Enter patient symptoms, diagnosis details, general diet/rest advice..."
                      value={notesText}
                      onChange={(e) => setNotesText(e.target.value)}
                    ></textarea>
                  </div>

                  {/* Right Column: Interactive Prescription Builder */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-gray-700">Prescribed Medications</label>
                      <button
                        type="button"
                        onClick={addMedicineRow}
                        className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline focus:outline-none"
                      >
                        + Add Medicine
                      </button>
                    </div>

                    <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto pr-1">
                      {prescriptions.map((med, idx) => (
                        <div key={idx} className="flex flex-wrap sm:flex-nowrap gap-1.5 items-center bg-white p-2 border border-gray-100 rounded shadow-sm">
                          <input
                            type="text"
                            placeholder="Medicine Name"
                            className="w-full sm:w-2/5 p-1.5 border border-gray-200 rounded text-xs outline-none focus:ring-1 focus:ring-primary"
                            value={med.medicine}
                            onChange={(e) => updateMedicineField(idx, 'medicine', e.target.value)}
                          />
                          <input
                            type="text"
                            placeholder="Dosage (e.g. 500mg)"
                            className="w-full sm:w-1/5 p-1.5 border border-gray-200 rounded text-xs outline-none focus:ring-1 focus:ring-primary"
                            value={med.dosage}
                            onChange={(e) => updateMedicineField(idx, 'dosage', e.target.value)}
                          />
                          <input
                            type="text"
                            placeholder="Freq (e.g. 1-0-1)"
                            className="w-full sm:w-1/5 p-1.5 border border-gray-200 rounded text-xs outline-none focus:ring-1 focus:ring-primary"
                            value={med.frequency}
                            onChange={(e) => updateMedicineField(idx, 'frequency', e.target.value)}
                          />
                          <input
                            type="text"
                            placeholder="Duration (e.g. 5 days)"
                            className="w-full sm:w-1/5 p-1.5 border border-gray-200 rounded text-xs outline-none focus:ring-1 focus:ring-primary"
                            value={med.duration}
                            onChange={(e) => updateMedicineField(idx, 'duration', e.target.value)}
                          />
                          {prescriptions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeMedicineRow(idx)}
                              className="text-red-500 hover:text-red-700 text-xs px-1 font-bold"
                              title="Remove Medicine"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 justify-end border-t pt-3 mt-1">
                  <button 
                    onClick={() => {
                      const filledPrescriptions = prescriptions.filter(p => p.medicine.trim() !== '');
                      completeAppointment(item._id, notesText, filledPrescriptions);
                      setActiveNotesAppId(null);
                      setNotesText('');
                      setPrescriptions([{ medicine: '', dosage: '', frequency: '', duration: '' }]);
                    }}
                    className="bg-primary text-white px-5 py-1.5 rounded shadow-sm text-xs font-semibold hover:bg-primary/95 transition-all"
                  >
                    Submit & Complete
                  </button>
                  <button 
                    onClick={() => {
                      setActiveNotesAppId(null);
                      setNotesText('');
                      setPrescriptions([{ medicine: '', dosage: '', frequency: '', duration: '' }]);
                    }}
                    className="bg-gray-200 text-gray-700 px-5 py-1.5 rounded shadow-sm text-xs font-semibold hover:bg-gray-300 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

    </div>
  )
}

export default DoctorAppointments