import React, { useContext, useEffect, useState } from 'react'
import { DoctorContext } from '../../context/DoctorContext'
import { AppContext } from '../../context/AppContext'
import { toast } from 'react-toastify'
import axios from 'axios'

const DoctorProfile = () => {

    const { dToken, profileData, setProfileData, getProfileData } = useContext(DoctorContext)
    const { currency, backendUrl } = useContext(AppContext)
    const [isEdit, setIsEdit] = useState(false)

    // Availability planner states
    const [blockedSlotsMap, setBlockedSlotsMap] = useState({})
    const [plannerDays, setPlannerDays] = useState([])

    const fetchBlockedSlots = async () => {
        try {
            const { data } = await axios.post(backendUrl + '/api/doctor/get-slots', {}, { headers: { dToken } })
            if (data.success) {
                setBlockedSlotsMap(data.slots_booked)
            }
        } catch (error) {
            console.error(error)
        }
    }

    const initPlannerDays = () => {
        let today = new Date()
        let days = []
        const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        for (let i = 0; i < 14; i++) {
            let date = new Date(today)
            date.setDate(today.getDate() + i)
            let day = date.getDate()
            let month = date.getMonth() + 1
            let year = date.getFullYear()
            const slotDate = `${day}_${month}_${year}`
            days.push({
                slotDate,
                formatted: `${day} ${months[date.getMonth()]}`,
                dayName: daysOfWeek[date.getDay()]
            })
        }
        setPlannerDays(days)
    }

    const toggleSlotBlock = async (slotDate, isAlreadyBlocked) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/doctor/block-slots', {
                dateString: slotDate,
                block: !isAlreadyBlocked
            }, { headers: { dToken } })

            if (data.success) {
                toast.success(data.message)
                fetchBlockedSlots()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.error(error)
            toast.error("Failed to update availability")
        }
    }

    const updateProfile = async () => {

        try {

            const updateData = {
                address: profileData.address,
                fees: profileData.fees,
                about: profileData.about,
                available: profileData.available
            }

            const { data } = await axios.post(backendUrl + '/api/doctor/update-profile', updateData, { headers: { dToken } })

            if (data.success) {
                toast.success(data.message)
                setIsEdit(false)
                getProfileData()
            } else {
                toast.error(data.message)
            }

            setIsEdit(false)

        } catch (error) {
            toast.error(error.message)
            console.log(error)
        }

    }

    useEffect(() => {
        if (dToken) {
            getProfileData()
            fetchBlockedSlots()
            initPlannerDays()
        }
    }, [dToken])

    return profileData && (
        <div>
            <div className='flex flex-col gap-4 m-5'>
                <div>
                    <img className='bg-primary/80 w-full sm:max-w-64 rounded-lg' src={profileData.image} alt="" />
                </div>

                <div className='flex-1 border border-stone-100 rounded-lg p-8 py-7 bg-white'>

                    {/* ----- Doc Info : name, degree, experience ----- */}

                    <p className='flex items-center gap-2 text-3xl font-medium text-gray-700'>{profileData.name}</p>
                    <div className='flex items-center gap-2 mt-1 text-gray-600'>
                        <p>{profileData.degree} - {profileData.speciality}</p>
                        <button className='py-0.5 px-2 border text-xs rounded-full'>{profileData.experience}</button>
                    </div>

                    {/* ----- Doc About ----- */}
                    <div>
                        <p className='flex items-center gap-1 text-sm font-medium text-[#262626] mt-3'>About :</p>
                        <p className='text-sm text-gray-600 max-w-[700px] mt-1'>
                            {
                                isEdit
                                    ? <textarea onChange={(e) => setProfileData(prev => ({ ...prev, about: e.target.value }))} type='text' className='w-full outline-primary p-2' rows={8} value={profileData.about} />
                                    : profileData.about
                            }
                        </p>
                    </div>

                    <p className='text-gray-600 font-medium mt-4'>
                        Appointment fee: <span className='text-gray-800'>{currency} {isEdit ? <input type='number' onChange={(e) => setProfileData(prev => ({ ...prev, fees: e.target.value }))} value={profileData.fees} /> : profileData.fees}</span>
                    </p>

                    <div className='flex gap-2 py-2'>
                        <p>Address:</p>
                        <p className='text-sm'>
                            {isEdit ? <input type='text' onChange={(e) => setProfileData(prev => ({ ...prev, address: { ...prev.address, line1: e.target.value } }))} value={profileData.address.line1} /> : profileData.address.line1}
                            <br />
                            {isEdit ? <input type='text' onChange={(e) => setProfileData(prev => ({ ...prev, address: { ...prev.address, line2: e.target.value } }))} value={profileData.address.line2} /> : profileData.address.line2}
                        </p>
                    </div>

                    <div className='flex gap-1 pt-2'>
                        <input type="checkbox" onChange={() => isEdit && setProfileData(prev => ({ ...prev, available: !prev.available }))} checked={profileData.available} />
                        <label htmlFor="">Available</label>
                    </div>

                    {
                        isEdit
                            ? <button onClick={updateProfile} className='px-4 py-1 border border-primary text-sm rounded-full mt-5 hover:bg-primary hover:text-white transition-all'>Save</button>
                            : <button onClick={() => setIsEdit(prev => !prev)} className='px-4 py-1 border border-primary text-sm rounded-full mt-5 hover:bg-primary hover:text-white transition-all'>Edit</button>
                    }

                    <hr className='bg-[#ADADAD] h-[1px] border-none my-6' />

                    {/* Weekly Planner Grid */}
                    <div className="mt-2">
                        <p className="font-semibold text-gray-750 text-base mb-1.5 flex items-center gap-1.5">
                            📅 Doctor Availability & Custom Slot Overrides
                        </p>
                        <p className="text-xs text-gray-500 mb-5 font-normal leading-relaxed">Visually set vacation leaves, block slot schedules, or override weekly active consulting calendars for the next 14 days.</p>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3.5">
                            {plannerDays.map((day) => {
                                const isBlocked = blockedSlotsMap[day.slotDate] && blockedSlotsMap[day.slotDate].length >= 22;
                                return (
                                    <div 
                                        key={day.slotDate} 
                                        className={`border rounded-xl p-3.5 text-center flex flex-col items-center justify-between gap-3 shadow-sm transition-all duration-300 ${isBlocked ? 'bg-red-50/55 border-red-200' : 'bg-white border-stone-100 hover:border-primary/40'}`}
                                    >
                                        <div>
                                            <p className="text-xs font-bold text-gray-500 tracking-wider uppercase">{day.dayName}</p>
                                            <p className="text-sm font-semibold text-gray-800 mt-1">{day.formatted}</p>
                                        </div>

                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${isBlocked ? 'bg-red-100/50 text-red-600 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                                            {isBlocked ? 'Vacation 🛑' : 'Active 🟢'}
                                        </span>

                                        <button
                                            type="button"
                                            onClick={() => toggleSlotBlock(day.slotDate, isBlocked)}
                                            className={`text-[11px] font-semibold py-1 px-3 rounded-full border transition-all ${isBlocked ? 'border-red-500 text-red-500 bg-white hover:bg-red-500 hover:text-white' : 'border-primary text-primary bg-white hover:bg-primary hover:text-white'}`}
                                        >
                                            {isBlocked ? 'Unblock' : 'Block Day'}
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}

export default DoctorProfile