import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { assets } from '../assets/assets'

const MyAppointments = () => {

    const { backendUrl, token } = useContext(AppContext)
    const navigate = useNavigate()

    const [appointments, setAppointments] = useState([])
    const [payment, setPayment] = useState('')
    const [reviewId, setReviewId] = useState(null)
    const [rating, setRating] = useState(5)
    const [reviewText, setReviewText] = useState('')

    const submitReview = async (appointmentId, docId) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/user/add-review', { appointmentId, docId, rating, text: reviewText }, { headers: { token } })
            if (data.success) {
                toast.success(data.message)
                setReviewId(null)
                setReviewText('')
                setRating(5)
                getUserAppointments()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }
    }

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Function to format the date eg. ( 20_01_2000 => 20 Jan 2000 )
    const slotDateFormat = (slotDate) => {
        const dateArray = slotDate.split('_')
        return dateArray[0] + " " + months[Number(dateArray[1])] + " " + dateArray[2]
    }

    // Getting User Appointments Data Using API
    const getUserAppointments = async () => {
        try {

            const { data } = await axios.get(backendUrl + '/api/user/appointments', { headers: { token } })
            setAppointments(data.appointments.reverse())

        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }
    }

    // Function to cancel appointment Using API
    const cancelAppointment = async (appointmentId) => {

        try {

            const { data } = await axios.post(backendUrl + '/api/user/cancel-appointment', { appointmentId }, { headers: { token } })

            if (data.success) {
                toast.success(data.message)
                getUserAppointments()
            } else {
                toast.error(data.message)
            }

        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }

    }

    const initPay = (order) => {
        const options = {
            key: import.meta.env.VITE_RAZORPAY_KEY_ID,
            amount: order.amount,
            currency: order.currency,
            name: 'Appointment Payment',
            description: "Appointment Payment",
            order_id: order.id,
            receipt: order.receipt,
            handler: async (response) => {

                console.log(response)

                try {
                    const { data } = await axios.post(backendUrl + "/api/user/verifyRazorpay", response, { headers: { token } });
                    if (data.success) {
                        navigate('/my-appointments')
                        getUserAppointments()
                    }
                } catch (error) {
                    console.log(error)
                    toast.error(error.message)
                }
            }
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
    };

    // Function to make payment using razorpay
    const appointmentRazorpay = async (appointmentId) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/user/payment-razorpay', { appointmentId }, { headers: { token } })
            if (data.success) {
                initPay(data.order)
            }else{
                toast.error(data.message)
            }
        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }
    }

    // Function to make payment using stripe
    // const appointmentStripe = async (appointmentId) => {
    //     try {
    //         const { data } = await axios.post(backendUrl + '/api/user/payment-stripe', { appointmentId }, { headers: { token } })
    //         if (data.success) {
    //             const { session_url } = data
    //             window.location.replace(session_url)
    //         }else{
    //             toast.error(data.message)
    //         }
    //     } catch (error) {
    //         console.log(error)
    //         toast.error(error.message)
    //     }
    // }



    useEffect(() => {
        if (token) {
            getUserAppointments()
        }
    }, [token])

    return (
        <div>
            <p className='pb-3 mt-12 text-lg font-medium text-gray-600 border-b'>My appointments</p>
            <div className=''>
                {appointments.map((item, index) => (
                    <div key={index} className="flex flex-col border-b last:border-0 rounded-lg bg-white my-3 shadow-sm border border-gray-100">
                        <div className='grid grid-cols-[1fr_2fr] gap-4 sm:flex sm:gap-6 p-4'>
                            <div>
                                <img className='w-36 bg-[#EAEFFF] rounded-md' src={item.docData.image} alt="" />
                            </div>
                            <div className='flex-1 text-sm text-[#5E5E5E]'>
                                <p className='text-[#262626] text-base font-semibold'>{item.docData.name}</p>
                                <p>{item.docData.speciality}</p>
                                <p className='text-[#464646] font-medium mt-3'>Address:</p>
                                <p className=''>{item.docData.address.line1}</p>
                                <p className=''>{item.docData.address.line2}</p>
                                <p className=' mt-3'><span className='text-sm text-[#3C3C3C] font-medium'>Date & Time:</span> {slotDateFormat(item.slotDate)} |  {item.slotTime}</p>
                            </div>
                            <div></div>
                            <div className='flex flex-col gap-2 justify-end text-sm text-center'>
                                {!item.cancelled && !item.payment && !item.isCompleted && payment !== item._id && <button onClick={() => setPayment(item._id)} className='text-[#696969] sm:min-w-48 py-2 border rounded hover:bg-primary hover:text-white transition-all duration-300'>Pay Online</button>}
                                {!item.cancelled && !item.payment && !item.isCompleted && payment === item._id && <button onClick={() => appointmentRazorpay(item._id)} className='text-[#696969] sm:min-w-48 py-2 border rounded hover:bg-gray-100 hover:text-white transition-all duration-300 flex items-center justify-center'><img className='max-w-20 max-h-5' src={assets.razorpay_logo} alt="" /></button>}
                                {!item.cancelled && item.payment && !item.isCompleted && <button className='sm:min-w-48 py-2 border rounded text-[#696969]  bg-[#EAEFFF]'>Paid</button>}

                                {item.isCompleted && <button className='sm:min-w-48 py-2 border border-green-500 rounded text-green-500 bg-green-50 font-medium'>Completed ✅</button>}
                                
                                {item.isCompleted && !item.isReviewed && reviewId !== item._id && <button onClick={() => {setReviewId(item._id); setRating(5); setReviewText('');}} className='sm:min-w-48 py-2 border border-amber-500 rounded text-amber-500 hover:bg-amber-50 font-medium transition-all duration-300'>Rate Doctor ⭐️</button>}
                                {item.isCompleted && item.isReviewed && <button disabled className='sm:min-w-48 py-2 border border-gray-300 rounded text-gray-500 font-medium bg-gray-50'>Reviewed ⭐️</button>}

                                {!item.cancelled && !item.isCompleted && <button onClick={() => cancelAppointment(item._id)} className='text-[#696969] sm:min-w-48 py-2 border rounded hover:bg-red-600 hover:text-white transition-all duration-300'>Cancel appointment</button>}
                                {item.cancelled && !item.isCompleted && <button className='sm:min-w-48 py-2 border border-red-500 rounded text-red-500'>Appointment cancelled</button>}
                            </div>
                        </div>
                        {reviewId === item._id && (
                            <div className="bg-gray-50 p-4 border-t border-gray-200">
                                <p className="font-semibold text-gray-800 mb-2">Leave a Rating for {item.docData.name}</p>
                                <div className="flex gap-1 mb-3">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button key={star} onClick={() => setRating(star)} className={`text-2xl ${star <= rating ? 'text-amber-400' : 'text-gray-300'} transition-colors`}>★</button>
                                    ))}
                                </div>
                                <textarea
                                    className="w-full sm:w-1/2 p-3 border rounded-lg text-sm bg-white mb-3 outline-none focus:ring-1 focus:ring-primary"
                                    rows="3"
                                    placeholder="Write a brief review about your experience..."
                                    value={reviewText}
                                    onChange={(e) => setReviewText(e.target.value)}
                                ></textarea>
                                <div className="flex gap-3">
                                    <button onClick={() => submitReview(item._id, item.docId)} disabled={!rating} className="bg-primary text-white px-6 py-2 rounded shadow-sm text-sm font-medium hover:bg-primary/90 transition-all">Submit Review</button>
                                    <button onClick={() => setReviewId(null)} className="bg-gray-200 text-gray-700 px-6 py-2 rounded shadow-sm text-sm font-medium hover:bg-gray-300 transition-all">Cancel</button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

export default MyAppointments