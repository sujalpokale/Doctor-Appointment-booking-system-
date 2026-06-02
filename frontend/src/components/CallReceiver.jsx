import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import axios from 'axios'

const CallReceiver = () => {
    const { backendUrl, token } = useContext(AppContext)
    const navigate = useNavigate()
    
    const [incomingCall, setIncomingCall] = useState(null)

    useEffect(() => {
        if (!token) {
            setIncomingCall(null)
            return
        }

        const checkCalls = async () => {
            try {
                const { data } = await axios.get(backendUrl + '/api/user/incoming-calls', { headers: { token } })
                if (data.success && data.hasIncomingCall) {
                    // Only prompt if we are not already on the video-call page
                    if (!window.location.pathname.includes('/video-call')) {
                        setIncomingCall(data)
                    }
                } else {
                    setIncomingCall(null)
                }
            } catch (error) {
                console.error("Error polling incoming calls:", error)
            }
        }

        // Poll immediately and then every 3.5 seconds
        checkCalls()
        const interval = setInterval(checkCalls, 3500)
        return () => clearInterval(interval)
    }, [token, backendUrl])

    const handleAccept = () => {
        if (!incomingCall) return
        const appId = incomingCall.appointmentId
        setIncomingCall(null)
        navigate(`/video-call?appointmentId=${appId}`)
    }

    const handleDecline = async () => {
        if (!incomingCall) return
        try {
            await axios.post(backendUrl + '/api/user/decline-call', { appointmentId: incomingCall.appointmentId }, { headers: { token } })
        } catch (error) {
            console.error("Error declining call:", error)
        } finally {
            setIncomingCall(null)
        }
    }

    if (!incomingCall) return null

    return (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-[9999] animate-fade-in p-4">
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden flex flex-col items-center">
                {/* Visual Medical Ripple Ring Animation */}
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-primary to-emerald-500 animate-pulse"></div>
                
                {/* Vibrating/Pulsing Avatar Wrapper */}
                <div className="relative mt-4 mb-6">
                    <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping scale-150"></div>
                    <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-pulse scale-125 border border-emerald-500/30"></div>
                    <img 
                        className="w-24 h-24 rounded-full object-cover border-4 border-primary relative z-10 shadow-lg" 
                        src={incomingCall.docImage} 
                        alt={incomingCall.docName} 
                    />
                    <span className="absolute bottom-1 right-1 bg-emerald-500 border-2 border-slate-900 w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white z-20 font-bold">
                        ✓
                    </span>
                </div>

                <h3 className="text-xl font-extrabold text-white tracking-tight">{incomingCall.docName}</h3>
                <p className="text-primary text-xs uppercase tracking-wider font-semibold mt-1">{incomingCall.docSpeciality}</p>
                <p className="text-slate-400 text-xs mt-3 bg-slate-950 px-3 py-1.5 rounded-full border border-white/5 font-medium animate-pulse flex items-center gap-1.5 justify-center">
                    <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></span>
                    INCOMING CONSULTATION CALL...
                </p>

                <div className="flex gap-4 w-full mt-8">
                    <button 
                        onClick={handleDecline}
                        className="flex-1 py-3 px-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white font-bold text-sm transition-all duration-300 shadow-md"
                    >
                        Decline
                    </button>
                    <button 
                        onClick={handleAccept}
                        className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold text-sm transition-all duration-300 shadow-lg shadow-emerald-500/20 animate-bounce"
                    >
                        Accept
                    </button>
                </div>
            </div>
        </div>
    )
}

export default CallReceiver
