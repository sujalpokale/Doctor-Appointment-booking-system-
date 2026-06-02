import React, { useContext, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import { assets } from '../assets/assets'
import RelatedDoctors from '../components/RelatedDoctors'
import axios from 'axios'
import { toast } from 'react-toastify'

const Appointment = () => {

    const { docId } = useParams()
    const { doctors, currencySymbol, backendUrl, token, getDoctosData, userData } = useContext(AppContext)
    const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

    const [docInfo, setDocInfo] = useState(false)
    const [docSlots, setDocSlots] = useState([])
    const [slotIndex, setSlotIndex] = useState(0)
    const [slotTime, setSlotTime] = useState('')

    // Promo Code States
    const [couponCode, setCouponCode] = useState('')
    const [appliedDiscount, setAppliedDiscount] = useState(null)

    // Dependent Patient Selection State
    const [patientSelection, setPatientSelection] = useState('self')

    // Referral Credits state
    const [useReferralCredits, setUseReferralCredits] = useState(false)

    const navigate = useNavigate()

    const handleApplyCoupon = async () => {
        if (!token) {
            toast.warning('Login to apply promo codes')
            return navigate('/login')
        }
        if (!couponCode) return;
        try {
            const { data } = await axios.post(backendUrl + '/api/user/apply-coupon', { code: couponCode }, { headers: { token } });
            if (data.success) {
                toast.success(data.message);
                let discount = (docInfo.fees * data.discountPercent) / 100;
                if (data.maxDiscount > 0 && discount > data.maxDiscount) {
                    discount = data.maxDiscount;
                }
                const finalAmount = docInfo.fees - discount;
                setAppliedDiscount({
                    code: couponCode.toUpperCase(),
                    discountPercent: data.discountPercent,
                    maxDiscount: data.maxDiscount,
                    discountValue: discount,
                    finalAmount
                });
            } else {
                toast.error(data.message);
                setAppliedDiscount(null);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to apply promo code");
        }
    }

    const fetchDocInfo = async () => {
        const docInfo = doctors.find((doc) => doc._id === docId)
        setDocInfo(docInfo)
    }

    const getAvailableSolts = async () => {

        setDocSlots([])

        // getting current date
        let today = new Date()

        for (let i = 0; i < 7; i++) {

            // getting date with index 
            let currentDate = new Date(today)
            currentDate.setDate(today.getDate() + i)

            // setting end time of the date with index
            let endTime = new Date()
            endTime.setDate(today.getDate() + i)
            endTime.setHours(21, 0, 0, 0)

            // setting hours 
            if (today.getDate() === currentDate.getDate()) {
                currentDate.setHours(currentDate.getHours() > 10 ? currentDate.getHours() + 1 : 10)
                currentDate.setMinutes(currentDate.getMinutes() > 30 ? 30 : 0)
            } else {
                currentDate.setHours(10)
                currentDate.setMinutes(0)
            }

            let timeSlots = [];


            while (currentDate < endTime) {
                let formattedTime = currentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                let day = currentDate.getDate()
                let month = currentDate.getMonth() + 1
                let year = currentDate.getFullYear()

                const slotDate = day + "_" + month + "_" + year
                const slotTime = formattedTime

                const isSlotAvailable = docInfo.slots_booked[slotDate] && docInfo.slots_booked[slotDate].includes(slotTime) ? false : true

                if (isSlotAvailable) {

                    // Add slot to array
                    timeSlots.push({
                        datetime: new Date(currentDate),
                        time: formattedTime
                    })
                }

                // Increment current time by 30 minutes
                currentDate.setMinutes(currentDate.getMinutes() + 30);
            }

            setDocSlots(prev => ([...prev, timeSlots]))

        }

    }

    const bookAppointment = async () => {

        if (!token) {
            toast.warning('Login to book appointment')
            return navigate('/login')
        }

        const date = docSlots[slotIndex][0].datetime

        let day = date.getDate()
        let month = date.getMonth() + 1
        let year = date.getFullYear()

        const slotDate = day + "_" + month + "_" + year

        try {

            const { data } = await axios.post(backendUrl + '/api/user/book-appointment', { 
                docId, 
                slotDate, 
                slotTime,
                couponCode: appliedDiscount ? appliedDiscount.code : '' ,
                patientId: patientSelection === 'self' ? '' : patientSelection,
                useReferralCredits
            }, { headers: { token } })

            if (data.success) {
                toast.success(data.message)
                getDoctosData()
                navigate('/my-appointments')
            } else {
                toast.error(data.message)
            }

        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }

    }

    useEffect(() => {
        if (doctors.length > 0) {
            fetchDocInfo()
        }
    }, [doctors, docId])

    useEffect(() => {
        if (docInfo) {
            getAvailableSolts()
        }
    }, [docInfo])

    return docInfo ? (
        <div>

            {/* ---------- Doctor Details ----------- */}
            <div className='flex flex-col sm:flex-row gap-4'>
                <div>
                    <img className='bg-primary w-full sm:max-w-72 rounded-lg' src={docInfo.image} alt="" />
                </div>

                <div className='flex-1 border border-[#ADADAD] rounded-lg p-8 py-7 bg-white mx-2 sm:mx-0 mt-[-80px] sm:mt-0'>

                    {/* ----- Doc Info : name, degree, experience ----- */}

                    <div className='flex items-center gap-3 text-3xl font-medium text-gray-700'>
                        <p>{docInfo.name}</p>
                        <img className='w-5' src={assets.verified_icon} alt="" />
                        {docInfo.averageRating > 0 && (
                            <span className="text-lg bg-amber-50 text-amber-500 px-3 py-1 rounded-full flex items-center gap-1 font-semibold border border-amber-100 shadow-sm transition-all hover:bg-amber-100">
                                ★ {docInfo.averageRating}
                                <span className='text-xs text-amber-400 font-normal ml-0.5'>({docInfo.reviews?.length || 0})</span>
                            </span>
                        )}
                    </div>
                    <div className='flex items-center gap-2 mt-1 text-gray-600'>
                        <p>{docInfo.degree} - {docInfo.speciality}</p>
                        <button className='py-0.5 px-2 border text-xs rounded-full'>{docInfo.experience}</button>
                    </div>

                    {/* ----- Doc About ----- */}
                    <div>
                        <p className='flex items-center gap-1 text-sm font-medium text-[#262626] mt-3'>About <img className='w-3' src={assets.info_icon} alt="" /></p>
                        <p className='text-sm text-gray-600 max-w-[700px] mt-1'>{docInfo.about}</p>
                    </div>

                    <p className='text-gray-600 font-medium mt-4'>Appointment fee: <span className='text-gray-800'>{currencySymbol}{docInfo.fees}</span> </p>
                </div>
            </div>

            {/* Booking slots */}
            <div className='sm:ml-72 sm:pl-4 mt-8 font-medium text-[#565656]'>
                <p >Booking slots</p>
                <div className='flex gap-3 items-center w-full overflow-x-scroll mt-4'>
                    {docSlots.length && docSlots.map((item, index) => (
                        <div onClick={() => setSlotIndex(index)} key={index} className={`text-center py-6 min-w-16 rounded-full cursor-pointer ${slotIndex === index ? 'bg-primary text-white' : 'border border-[#DDDDDD]'}`}>
                            <p>{item[0] && daysOfWeek[item[0].datetime.getDay()]}</p>
                            <p>{item[0] && item[0].datetime.getDate()}</p>
                        </div>
                    ))}
                </div>

                <div className='flex items-center gap-3 w-full overflow-x-scroll mt-4'>
                    {docSlots.length && docSlots[slotIndex].map((item, index) => (
                        <p onClick={() => setSlotTime(item.time)} key={index} className={`text-sm font-light  flex-shrink-0 px-5 py-2 rounded-full cursor-pointer ${item.time === slotTime ? 'bg-primary text-white' : 'text-[#949494] border border-[#B4B4B4]'}`}>{item.time.toLowerCase()}</p>
                    ))}
                </div>

                {/* Dependent Patient Selection Area */}
                {userData && userData.familyMembers && userData.familyMembers.length > 0 && (
                    <div className='mt-6 max-w-[340px]'>
                        <p className='text-[#565656] font-semibold text-xs mb-1.5'>Patient / Book For</p>
                        <select 
                            value={patientSelection} 
                            onChange={(e) => setPatientSelection(e.target.value)}
                            className='w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary bg-white font-medium text-gray-700'
                        >
                            <option value="self">Myself ({userData.name})</option>
                            {userData.familyMembers.map((member) => (
                                <option key={member.id} value={member.id}>
                                    {member.name} ({member.relation})
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Promo Code Coupon Area */}
                <div className='mt-6 max-w-[340px]'>
                    <p className='text-[#565656] font-semibold text-xs mb-1.5'>Apply Promo Code</p>
                    <div className='flex gap-2'>
                        <input 
                            type="text" 
                            placeholder="e.g. WELCOME10 or HEALTH25" 
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value)}
                            disabled={appliedDiscount !== null}
                            className='border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary flex-1 uppercase'
                        />
                        {appliedDiscount ? (
                            <button 
                                onClick={() => { setAppliedDiscount(null); setCouponCode(''); }} 
                                className='bg-red-50 text-red-500 border border-red-200 px-4 py-2 rounded-lg text-xs hover:bg-red-100 transition-all font-bold'
                            >
                                Remove
                            </button>
                        ) : (
                            <button 
                                onClick={handleApplyCoupon} 
                                className='bg-primary text-white px-5 py-2 rounded-lg text-xs hover:bg-primary/95 transition-all font-bold'
                            >
                                Apply
                            </button>
                        )}
                    </div>
                    {appliedDiscount && (
                        <div className='mt-2.5 bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg text-xs transition-all font-semibold flex flex-col gap-1 shadow-sm'>
                            <p>✓ Code <strong>{appliedDiscount.code}</strong> Applied!</p>
                            <p>Discount: {appliedDiscount.discountPercent}% Off (Saved ₹{appliedDiscount.discountValue})</p>
                            <p>Final Price: <span className='text-sm text-green-800 font-bold'>₹{appliedDiscount.finalAmount}</span> (originally ₹{docInfo.fees})</p>
                        </div>
                    )}
                </div>

                {/* Referral Credits Checkout Card */}
                {userData && userData.referralCredits > 0 && (
                    <div className='mt-6 max-w-[340px] bg-purple-50/20 border border-purple-100/50 p-4 rounded-xl shadow-sm text-xs'>
                        <div className='flex items-center justify-between'>
                            <div className='flex items-center gap-1.5'>
                                <span className='text-base'>✦</span>
                                <div className='flex flex-col text-[#565656]'>
                                    <span className='font-bold text-gray-800'>Apply Referral Credits</span>
                                    <span className='text-[10px] text-gray-500'>Available Balance: ₹{userData.referralCredits}</span>
                                </div>
                            </div>
                            <input 
                                type="checkbox"
                                checked={useReferralCredits}
                                onChange={(e) => setUseReferralCredits(e.target.checked)}
                                className='w-4 h-4 accent-purple-600 cursor-pointer rounded'
                            />
                        </div>
                        {useReferralCredits && (
                            <div className='mt-2.5 pt-2.5 border-t border-dashed border-purple-200/50 text-[10px] text-purple-750 font-bold flex flex-col gap-1'>
                                <div className='flex justify-between text-gray-500'>
                                    <span>Subtotal:</span>
                                    <span>₹{appliedDiscount ? appliedDiscount.finalAmount : docInfo.fees}</span>
                                </div>
                                <div className='flex justify-between text-green-600 font-extrabold'>
                                    <span>Credits Applied:</span>
                                    <span>-₹{Math.min(userData.referralCredits, appliedDiscount ? appliedDiscount.finalAmount : docInfo.fees)}</span>
                                </div>
                                <div className='flex justify-between border-t border-purple-200/50 pt-1.5 text-xs text-gray-900 font-extrabold'>
                                    <span>Total Payable:</span>
                                    <span>₹{Math.max(0, (appliedDiscount ? appliedDiscount.finalAmount : docInfo.fees) - userData.referralCredits)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <button onClick={bookAppointment} className='bg-primary text-white text-sm font-light px-20 py-3 rounded-full my-6 hover:scale-105 transition-all duration-300 shadow-md'>Book an appointment</button>
            </div>

            {/* Reviews Section */}
            <div className='sm:ml-72 sm:pl-4 mt-10'>
                <p className='text-[#565656] font-medium text-lg'>Reviews & Ratings</p>
                <div className='mt-4 flex flex-col gap-4'>
                    {docInfo.reviews && docInfo.reviews.length > 0 ? (
                        docInfo.reviews.map((item, index) => (
                            <div key={index} className='border border-gray-200 rounded-lg p-5 bg-white shadow-sm'>
                                <div className='flex items-center justify-between mb-2'>
                                    <div className='flex items-center gap-2'>
                                        <p className='font-semibold text-gray-800'>{item.patientName}</p>
                                        <div className='flex items-center text-amber-400 text-xs'>
                                            {[...Array(5)].map((_, i) => (
                                                <span key={i}>{i < item.rating ? '★' : '☆'}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <p className='text-xs text-gray-400'>{new Date(item.date).toLocaleDateString()}</p>
                                </div>
                                <p className='text-sm text-gray-600 italic'>"{item.text}"</p>
                            </div>
                        ))
                    ) : (
                        <p className='text-gray-400 text-sm'>No reviews yet for this doctor.</p>
                    )}
                </div>
            </div>

            {/* Listing Releated Doctors */}
            <RelatedDoctors speciality={docInfo.speciality} docId={docId} />
        </div>
    ) : null
}

export default Appointment