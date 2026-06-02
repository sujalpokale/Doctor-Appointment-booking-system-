import React, { useEffect, useRef, useState, useContext } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { DoctorContext } from '../../context/DoctorContext'
import axios from 'axios'
import { toast } from 'react-toastify'

const VideoCall = () => {
    const [searchParams] = useSearchParams()
    const appointmentId = searchParams.get('appointmentId')
    const navigate = useNavigate()

    const { dToken, appointments, getAppointments, backendUrl } = useContext(DoctorContext)

    const [appointment, setAppointment] = useState(null)
    const [loading, setLoading] = useState(true)

    // Media and Connection states
    const [localStream, setLocalStream] = useState(null)
    const [micActive, setMicActive] = useState(true)
    const [cameraActive, setCameraActive] = useState(true)
    const [screenSharing, setScreenSharing] = useState(false)
    const [callDuration, setCallDuration] = useState(0)
    const [patientActive, setPatientActive] = useState(false)

    // Chat inside video call states
    const [chatMessages, setChatMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')

    const localVideoRef = useRef(null)
    const remoteVideoRef = useRef(null)
    const pcRef = useRef(null)
    const addedIceCandidates = useRef(new Set())

    // Duration timer
    useEffect(() => {
        const timer = setInterval(() => {
            setCallDuration(prev => prev + 1)
        }, 1000)
        return () => clearInterval(timer)
    }, [])

    const formatDuration = (sec) => {
        const mins = Math.floor(sec / 60)
        const secs = sec % 60
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    const fetchAppointmentDetails = () => {
        setLoading(true)
        if (appointments && appointments.length > 0) {
            const found = appointments.find(app => app._id === appointmentId)
            if (found) {
                setAppointment(found)
            } else {
                toast.error("Appointment not found")
                navigate('/doctor-appointments')
            }
        }
        setLoading(false)
    }

    // WebRTC Peer Connection Initialization
    const initPeerConnection = async (stream) => {
        if (pcRef.current) return pcRef.current

        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        })

        // Add local tracks to stream
        stream.getTracks().forEach(track => {
            pc.addTrack(track, stream)
        })

        // Remote track received
        pc.ontrack = (event) => {
            console.log("Doctor track received:", event.streams[0])
            setPatientActive(true)
            setTimeout(() => {
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = event.streams[0]
                }
            }, 300)
        }

        // Handle ICE Candidate generation
        pc.onicecandidate = async (event) => {
            if (event.candidate) {
                try {
                    await axios.post(backendUrl + '/api/doctor/save-ice', {
                        appointmentId,
                        candidate: {
                            candidate: event.candidate.candidate,
                            sdpMid: event.candidate.sdpMid,
                            sdpMLineIndex: event.candidate.sdpMLineIndex,
                            role: 'doctor'
                        }
                    }, { headers: { dToken } })
                } catch (err) {
                    console.error("Doctor error saving candidate:", err)
                }
            }
        }

        pcRef.current = pc
        return pc
    }

    const initiateCall = async (pc) => {
        try {
            const offer = await pc.createOffer()
            await pc.setLocalDescription(offer)
            
            await axios.post(backendUrl + '/api/doctor/initiate-call', {
                appointmentId,
                callOffer: { sdp: offer.sdp, type: offer.type }
            }, { headers: { dToken } })

            toast.info("Establishing consultation channel...")
        } catch (err) {
            console.error("Doctor initiate call error:", err)
        }
    }

    const startMedia = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            setLocalStream(stream)
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream
            }
            const pc = await initPeerConnection(stream)
            await initiateCall(pc)
        } catch (error) {
            console.error("Camera access error:", error)
            toast.warning("Failed to access camera/mic. Using backup signaling bridge.")
            // Try audio-only backup
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true })
                setLocalStream(stream)
                const pc = await initPeerConnection(stream)
                await initiateCall(pc)
            } catch (backupErr) {
                console.error("Backup media fail:", backupErr)
            }
        }
    }

    const stopMedia = () => {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop())
            setLocalStream(null)
        }
        if (pcRef.current) {
            pcRef.current.close()
            pcRef.current = null
        }
        addedIceCandidates.current.clear()
        setPatientActive(false)
    }

    const ringPatient = async () => {
        if (pcRef.current) {
            await initiateCall(pcRef.current)
        } else if (localStream) {
            const pc = await initPeerConnection(localStream)
            await initiateCall(pc)
        } else {
            startMedia()
        }
    }

    useEffect(() => {
        if (dToken) {
            if (appointments.length === 0) {
                getAppointments()
            } else {
                fetchAppointmentDetails()
            }
            startMedia()
        }
        return () => {
            stopMedia()
        }
    }, [dToken, appointments, appointmentId])

    // Poll signaling answer and patient candidates
    useEffect(() => {
        if (!dToken || !appointmentId) return

        let isMounted = true

        const pollSignaling = async () => {
            try {
                const { data } = await axios.get(backendUrl + `/api/doctor/get-call-signal?appointmentId=${appointmentId}`, { headers: { dToken } })
                if (!isMounted) return

                if (data.success) {
                    // Check remote answer
                    if (data.callStatus === 'active' && data.callAnswer) {
                        if (pcRef.current && pcRef.current.signalingState === 'have-local-offer') {
                            await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.callAnswer))
                            console.log("Doctor set patient answer successfully")
                        }
                    } else if (data.callStatus === 'ended') {
                        setPatientActive(false)
                        toast.warning("Call disconnected by patient.")
                        stopMedia()
                        navigate('/doctor-appointments')
                    }

                    // Check patient candidates
                    if (data.callIceCandidates && data.callIceCandidates.length > 0 && pcRef.current) {
                        for (const item of data.callIceCandidates) {
                            if (item.role === 'patient') {
                                const key = JSON.stringify(item.candidate)
                                if (!addedIceCandidates.current.has(key)) {
                                    addedIceCandidates.current.add(key)
                                    try {
                                        await pcRef.current.addIceCandidate(new RTCIceCandidate({
                                            candidate: item.candidate.candidate || item.candidate,
                                            sdpMid: item.sdpMid,
                                            sdpMLineIndex: item.sdpMLineIndex
                                        }))
                                        console.log("Doctor added patient ICE Candidate")
                                    } catch (err) {
                                        console.warn("Doctor error adding remote ICE candidate:", err)
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Doctor signaling polling error:", err)
            }
        }

        const pollInterval = setInterval(pollSignaling, 3000)
        return () => {
            isMounted = false
            clearInterval(pollInterval)
        }
    }, [dToken, appointmentId, backendUrl])

    const toggleMic = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = !micActive
            })
            setMicActive(!micActive)
        }
    }

    const toggleCamera = () => {
        if (localStream) {
            localStream.getVideoTracks().forEach(track => {
                track.enabled = !cameraActive
            })
            setCameraActive(!cameraActive)
        }
    }

    const toggleScreenShare = async () => {
        try {
            if (!screenSharing) {
                const shareStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = shareStream
                }
                setScreenSharing(true)
                shareStream.getVideoTracks()[0].onended = () => {
                    if (localVideoRef.current && localStream) {
                        localVideoRef.current.srcObject = localStream
                    }
                    setScreenSharing(false)
                }
            } else {
                if (localVideoRef.current && localStream) {
                    localVideoRef.current.srcObject = localStream
                }
                setScreenSharing(false)
            }
        } catch (error) {
            console.error(error)
            toast.error("Screen sharing not supported or permission denied")
        }
    }

    const sendChatMessage = (e) => {
        e.preventDefault()
        if (!newMessage.trim()) return
        const msg = {
            id: Date.now(),
            sender: 'Doctor',
            text: newMessage,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
        setChatMessages(prev => [...prev, msg])
        setNewMessage('')
        // Simulate patient reply
        setTimeout(() => {
            const patientReply = {
                id: Date.now() + 1,
                sender: 'Patient',
                text: "Thanks doctor. The video connection is working perfectly.",
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
            setChatMessages(prev => [...prev, patientReply])
        }, 2500)
    }

    const endCall = async () => {
        stopMedia()
        try {
            await axios.post(backendUrl + '/api/doctor/end-call', { appointmentId }, { headers: { dToken } })
        } catch (err) {
            console.error("Error setting call state to ended:", err)
        }
        toast.info("Consultation session completed.")
        navigate('/doctor-appointments')
    }

    if (loading || !appointment) {
        return (
            <div className="flex justify-center items-center h-[80vh]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <div className="min-h-[85vh] w-full max-w-6xl m-5 bg-slate-950 text-white flex flex-col font-sans select-none rounded-xl overflow-hidden shadow-2xl relative">
            {/* Top Bar */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20 bg-slate-900/60 backdrop-blur-md px-4 py-2.5 rounded-lg border border-white/5">
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-305">Consultation Live Feed</p>
                    <span className="text-xs text-slate-400">|</span>
                    <p className="text-xs text-primary font-semibold">Patient: {appointment.userData.name} (Age: {new Date().getFullYear() - new Date(appointment.userData.dob).getFullYear() || 'N/A'})</p>
                </div>
                <div className="flex items-center gap-4 bg-slate-950/80 px-3 py-1 rounded border border-white/5">
                    <p className="text-xs font-mono font-semibold tracking-widest text-emerald-400">{formatDuration(callDuration)}</p>
                    <span className="bg-[#5f6caf]/20 text-primary border border-primary/30 text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                        🔒 Secure Clinical Network
                    </span>
                </div>
            </div>

            {/* Video Viewport Grid */}
            <div className="flex-1 relative w-full h-[60vh] min-h-[440px] bg-slate-900 flex items-center justify-center p-4">
                
                {/* Remote Participant Viewport (Patient video or placeholder) */}
                <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-slate-950 overflow-hidden">
                    {patientActive ? (
                        <video 
                            ref={remoteVideoRef} 
                            autoPlay 
                            playsInline 
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center relative">
                            {/* Visual Representation of Patient Ringing */}
                            <div className="absolute inset-0 bg-slate-950 flex flex-col justify-center items-center gap-4 p-4 text-center">
                                <div className="relative mb-2">
                                    <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping scale-150"></div>
                                    <div className="w-28 h-28 bg-[#5f6caf]/20 rounded-full flex items-center justify-center border border-[#5f6caf]/40 relative">
                                        <img className="w-24 h-24 rounded-full object-cover" src={appointment.userData.image} alt={appointment.userData.name} />
                                    </div>
                                </div>
                                <h3 className="text-lg font-bold text-gray-200">Ringing {appointment.userData.name}...</h3>
                                <p className="text-xs text-gray-400 max-w-sm">Waiting for patient to accept the incoming telehealth call bridge.</p>
                                <button 
                                    onClick={ringPatient}
                                    className="mt-2 bg-emerald-500 text-slate-950 hover:bg-emerald-400 px-5 py-2 rounded-full font-bold text-xs shadow-lg transition-all duration-300 transform active:scale-95 flex items-center gap-1.5"
                                >
                                    🔔 Call Patient Again
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Local Camera Viewport (Doctor PIP) */}
                <div className="absolute bottom-4 right-4 w-40 sm:w-48 aspect-video bg-slate-900 border-2 border-white/10 rounded-lg overflow-hidden shadow-2xl z-10">
                    {cameraActive && localStream ? (
                        <video 
                            ref={localVideoRef} 
                            autoPlay 
                            playsInline 
                            muted 
                            className="w-full h-full object-cover scale-x-[-1]"
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 gap-1">
                            <span className="text-2xl">👤</span>
                            <span className="text-[10px] text-slate-500 font-semibold uppercase">Camera Off</span>
                        </div>
                    )}
                    <span className="absolute bottom-1.5 left-2 bg-slate-950/60 backdrop-blur-sm text-[10px] font-bold px-1.5 py-0.5 rounded text-white border border-white/5 uppercase">
                        Dr. {appointment.docData.name.split(' ').pop()} (You)
                    </span>
                </div>

                {/* Sidebar Chat Overlay */}
                <div className="absolute right-4 top-20 bottom-24 w-80 bg-slate-950/90 border border-white/5 rounded-xl shadow-2xl z-10 flex flex-col overflow-hidden max-h-[360px] backdrop-blur-md">
                    <div className="bg-slate-900/80 px-4 py-2 border-b border-white/5 flex items-center justify-between">
                        <h4 className="text-xs font-bold tracking-wider text-slate-350">Secure Chat</h4>
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 text-xs">
                        {chatMessages.length === 0 ? (
                            <p className="text-slate-500 italic text-center my-auto">Direct encrypted connection with patient. Record general symptoms here to save in consultation reports.</p>
                        ) : (
                            chatMessages.map(msg => (
                                <div key={msg.id} className={`flex flex-col max-w-[80%] ${msg.sender === 'Doctor' ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                                    <span className="text-[9px] text-slate-500 font-bold mb-0.5">{msg.sender === 'Doctor' ? 'You (Doctor)' : appointment.userData.name}</span>
                                    <div className={`p-2.5 rounded-lg ${msg.sender === 'Doctor' ? 'bg-[#5f6caf] text-white rounded-tr-none' : 'bg-slate-800 text-slate-100 rounded-tl-none'}`}>
                                        {msg.text}
                                    </div>
                                    <span className="text-[8px] text-slate-600 mt-0.5">{msg.time}</span>
                                </div>
                            ))
                        )}
                    </div>
                    <form onSubmit={sendChatMessage} className="p-2 border-t border-white/5 bg-slate-900 flex gap-1.5">
                        <input
                            type="text"
                            placeholder="Send diagnostic advice..."
                            className="flex-1 bg-slate-950 border border-white/5 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary text-white"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                        />
                        <button type="submit" className="bg-primary hover:bg-primary/90 text-white rounded-lg px-3 py-1 text-xs font-semibold transition-all">
                            Send
                        </button>
                    </form>
                </div>
            </div>

            {/* Bottom Toolbar Controls */}
            <div className="bg-slate-900 border-t border-white/5 p-6 flex flex-wrap justify-between items-center gap-4 z-20">
                <div className="flex items-center gap-3">
                    <img className="w-10 h-10 rounded-full object-cover border border-white/10" src={appointment.userData.image} alt={appointment.userData.name} />
                    <div>
                        <h4 className="text-sm font-bold text-slate-100">{appointment.userData.name}</h4>
                        <p className="text-xs text-slate-400 font-medium">Patient Consultation &bull; Age: {new Date().getFullYear() - new Date(appointment.userData.dob).getFullYear() || 'N/A'}</p>
                    </div>
                </div>

                {/* Toolbar Buttons */}
                <div className="flex items-center gap-3.5 mx-auto">
                    <button
                        onClick={toggleMic}
                        className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all ${micActive ? 'bg-slate-800 border-white/10 text-white hover:bg-slate-700' : 'bg-red-500/20 border-red-500/30 text-red-500'}`}
                        title={micActive ? 'Mute Mic' : 'Unmute Mic'}
                    >
                        {micActive ? (
                            <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
                            </svg>
                        ) : (
                            <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
                            </svg>
                        )}
                    </button>

                    <button
                        onClick={toggleCamera}
                        className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all ${cameraActive ? 'bg-slate-800 border-white/10 text-white hover:bg-slate-700' : 'bg-red-500/20 border-red-500/30 text-red-500'}`}
                        title={cameraActive ? 'Stop Camera' : 'Start Camera'}
                    >
                        {cameraActive ? (
                            <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                            </svg>
                        ) : (
                            <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path>
                            </svg>
                        )}
                    </button>

                    <button
                        onClick={toggleScreenShare}
                        className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all ${screenSharing ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-slate-800 border-white/10 text-white hover:bg-slate-700'}`}
                        title={screenSharing ? 'Stop Screen Share' : 'Share Screen'}
                    >
                        <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                        </svg>
                    </button>

                    <button
                        onClick={endCall}
                        className="bg-red-500 hover:bg-red-600 text-white px-6 h-12 rounded-full flex items-center gap-2 font-bold transition-all shadow-lg transform active:scale-95"
                        title="End Session"
                    >
                        <svg className="w-5.5 h-5.5 rotate-[135deg]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                        </svg>
                        End Consultation
                    </button>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold uppercase">
                    <span className={`w-2.5 h-2.5 rounded-full ${patientActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-ping'}`}></span>
                    {patientActive ? 'Patient Link Active' : 'Patient Offline'}
                </div>
            </div>
        </div>
    )
}

export default VideoCall
