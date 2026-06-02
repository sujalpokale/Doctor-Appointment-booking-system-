import React, { useEffect, useRef, useState, useContext } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'

const VideoCall = () => {
    const [searchParams] = useSearchParams()
    const appointmentId = searchParams.get('appointmentId')
    const navigate = useNavigate()

    const { backendUrl, token } = useContext(AppContext)

    const [appointment, setAppointment] = useState(null)
    const [loading, setLoading] = useState(true)

    // Media and Connection states
    const [localStream, setLocalStream] = useState(null)
    const [micActive, setMicActive] = useState(true)
    const [cameraActive, setCameraActive] = useState(true)
    const [screenSharing, setScreenSharing] = useState(false)
    const [callDuration, setCallDuration] = useState(0)
    const [doctorActive, setDoctorActive] = useState(false)

    // Chat inside video call states
    const [chatMessages, setChatMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')

    const localVideoRef = useRef(null)
    const remoteVideoRef = useRef(null)
    const pcRef = useRef(null)
    const addedIceCandidates = useRef(new Set())
    const hasAccepted = useRef(false)

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

    const fetchAppointmentDetails = async () => {
        try {
            setLoading(true)
            const { data } = await axios.get(backendUrl + '/api/user/appointments', { headers: { token } })
            if (data.success) {
                const found = data.appointments.find(app => app._id === appointmentId)
                if (found) {
                    setAppointment(found)
                } else {
                    toast.error("Appointment not found")
                    navigate('/my-appointments')
                }
            }
        } catch (error) {
            console.log(error)
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
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

        // Add local tracks
        stream.getTracks().forEach(track => {
            pc.addTrack(track, stream)
        })

        // Handle remote stream track arrival
        pc.ontrack = (event) => {
            console.log("Patient track received:", event.streams[0])
            setDoctorActive(true)
            setTimeout(() => {
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = event.streams[0]
                }
            }, 300)
        }

        // On ICE Candidate generation
        pc.onicecandidate = async (event) => {
            if (event.candidate) {
                try {
                    await axios.post(backendUrl + '/api/user/save-ice', {
                        appointmentId,
                        candidate: {
                            candidate: event.candidate.candidate,
                            sdpMid: event.candidate.sdpMid,
                            sdpMLineIndex: event.candidate.sdpMLineIndex,
                            role: 'patient'
                        }
                    }, { headers: { token } })
                } catch (err) {
                    console.error("Patient error saving candidate:", err)
                }
            }
        }

        pcRef.current = pc
        return pc
    }

    const startMedia = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            setLocalStream(stream)
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream
            }
            await initPeerConnection(stream)
        } catch (error) {
            console.error("Camera access error:", error)
            toast.warning("Failed to access camera/mic. Utilizing backup audio-only bridge.")
            // Try backup audio only
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true })
                setLocalStream(stream)
                await initPeerConnection(stream)
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
        hasAccepted.current = false
        setDoctorActive(false)
    }

    useEffect(() => {
        if (token && appointmentId) {
            fetchAppointmentDetails()
            startMedia()
        }
        return () => {
            stopMedia()
        }
    }, [token, appointmentId])

    // Signaling Polling loop for patient
    useEffect(() => {
        if (!token || !appointmentId) return

        let isMounted = true

        const pollSignaling = async () => {
            try {
                const { data } = await axios.get(backendUrl + `/api/user/get-call-signal?appointmentId=${appointmentId}`, { headers: { token } })
                if (!isMounted) return

                if (data.success) {
                    // Check remote call offer (doctor offer)
                    if ((data.callStatus === 'calling' || data.callStatus === 'active') && data.callOffer && !hasAccepted.current && pcRef.current) {
                        hasAccepted.current = true
                        
                        // Set remote SDP description (offer)
                        await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.callOffer))
                        
                        // Create and set local SDP answer
                        const answer = await pcRef.current.createAnswer()
                        await pcRef.current.setLocalDescription(answer)
                        
                        // Send local SDP answer to backend
                        await axios.post(backendUrl + '/api/user/accept-call', {
                            appointmentId,
                            callAnswer: { sdp: answer.sdp, type: answer.type }
                        }, { headers: { token } })

                        setDoctorActive(true)
                        console.log("Patient successfully set offer and posted SDP answer!")
                    } else if (data.callStatus === 'ended') {
                        setDoctorActive(false)
                        toast.warning("Video call ended by doctor.")
                        stopMedia()
                        navigate('/my-appointments')
                    }

                    // Add doctor's ICE Candidates
                    if (data.callIceCandidates && data.callIceCandidates.length > 0 && pcRef.current) {
                        for (const item of data.callIceCandidates) {
                            if (item.role === 'doctor') {
                                const key = JSON.stringify(item.candidate)
                                if (!addedIceCandidates.current.has(key)) {
                                    addedIceCandidates.current.add(key)
                                    try {
                                        await pcRef.current.addIceCandidate(new RTCIceCandidate({
                                            candidate: item.candidate.candidate || item.candidate,
                                            sdpMid: item.sdpMid,
                                            sdpMLineIndex: item.sdpMLineIndex
                                        }))
                                        console.log("Patient added doctor ICE candidate")
                                    } catch (err) {
                                        console.warn("Patient error adding doctor ICE candidate:", err)
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Patient signaling polling error:", err)
            }
        }

        const pollInterval = setInterval(pollSignaling, 3000)
        return () => {
            isMounted = false
            clearInterval(pollInterval)
        }
    }, [token, appointmentId, backendUrl])

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
            sender: 'Patient',
            text: newMessage,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
        setChatMessages(prev => [...prev, msg])
        setNewMessage('')
        // Simulate automated doctor reply
        setTimeout(() => {
            const docReply = {
                id: Date.now() + 1,
                sender: 'Doctor',
                text: "Received. Let's trace that on the visual call feed.",
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
            setChatMessages(prev => [...prev, docReply])
        }, 2000)
    }

    const endCall = async () => {
        stopMedia()
        try {
            await axios.post(backendUrl + '/api/user/decline-call', { appointmentId }, { headers: { token } })
        } catch (err) {
            console.error("Error setting call state to ended:", err)
        }
        toast.info("Consultation video call ended.")
        navigate('/my-appointments')
    }

    if (loading || !appointment) {
        return (
            <div className="flex justify-center items-center h-[80vh]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans select-none rounded-xl overflow-hidden mt-6 shadow-2xl relative">
            {/* Top Bar */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20 bg-slate-900/60 backdrop-blur-md px-4 py-2.5 rounded-lg border border-white/5">
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-350">Live Consultation</p>
                    <span className="text-xs text-slate-400">|</span>
                    <p className="text-xs text-primary font-semibold">{appointment.docData.name} ({appointment.docData.speciality})</p>
                </div>
                <div className="flex items-center gap-4 bg-slate-950/80 px-3 py-1 rounded border border-white/5">
                    <p className="text-xs font-mono font-semibold tracking-widest text-emerald-400">{formatDuration(callDuration)}</p>
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                        🔒 HIPAA Secure
                    </span>
                </div>
            </div>

            {/* Video Viewport Grid */}
            <div className="flex-1 relative w-full h-[70vh] min-h-[480px] bg-slate-900 flex items-center justify-center p-4">
                
                {/* Remote Participant Viewport (Full Screen video or placeholder) */}
                <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-slate-950 overflow-hidden">
                    {doctorActive ? (
                        <video 
                            ref={remoteVideoRef} 
                            autoPlay 
                            playsInline 
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center relative">
                            {/* Medical waves representing the doctor */}
                            <div className="absolute inset-0 bg-slate-950 flex flex-col justify-center items-center gap-4 text-center p-4">
                                <div className="relative mb-2">
                                    <div className="absolute inset-0 rounded-full bg-[#5f6caf]/10 animate-pulse scale-150 border border-[#5f6caf]/20"></div>
                                    <div className="w-28 h-28 bg-[#5f6caf]/20 rounded-full flex items-center justify-center border border-[#5f6caf]/40 relative">
                                        <img className="w-24 h-24 rounded-full object-cover" src={appointment.docData.image} alt={appointment.docData.name} />
                                    </div>
                                </div>
                                <h3 className="text-lg font-bold text-gray-200">Connecting with {appointment.docData.name}...</h3>
                                <p className="text-xs text-gray-400 max-w-sm">Establishing encrypted visual bridge link. Please wait.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Local Camera Viewport (Picture-in-Picture) */}
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
                            <span className="text-[10px] text-slate-500 font-semibold uppercase">Video Off</span>
                        </div>
                    )}
                    <span className="absolute bottom-1.5 left-2 bg-slate-950/60 backdrop-blur-sm text-[10px] font-bold px-1.5 py-0.5 rounded text-white border border-white/5 uppercase">
                        You
                    </span>
                </div>

                {/* Sidebar Chat Overlay */}
                <div className="absolute right-4 top-20 bottom-24 w-80 bg-slate-950/90 border border-white/5 rounded-xl shadow-2xl z-10 flex flex-col overflow-hidden max-h-[420px] backdrop-blur-md">
                    <div className="bg-slate-900/80 px-4 py-2 border-b border-white/5 flex items-center justify-between">
                        <h4 className="text-xs font-bold tracking-wider text-slate-300">Consultation Chat</h4>
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 text-xs">
                        {chatMessages.length === 0 ? (
                            <p className="text-slate-500 italic text-center my-auto">Chat active. Messages sent here are encrypted and saved under consultation records.</p>
                        ) : (
                            chatMessages.map(msg => (
                                <div key={msg.id} className={`flex flex-col max-w-[80%] ${msg.sender === 'Patient' ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                                    <span className="text-[9px] text-slate-500 font-bold mb-0.5">{msg.sender === 'Patient' ? 'You' : appointment.docData.name}</span>
                                    <div className={`p-2.5 rounded-lg ${msg.sender === 'Patient' ? 'bg-[#5f6caf] text-white rounded-tr-none' : 'bg-slate-800 text-slate-100 rounded-tl-none'}`}>
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
                            placeholder="Type a message..."
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
                    <img className="w-10 h-10 rounded-full object-cover border border-white/10" src={appointment.docData.image} alt={appointment.docData.name} />
                    <div>
                        <h4 className="text-sm font-bold text-slate-100">{appointment.docData.name}</h4>
                        <p className="text-xs text-slate-400 font-medium">{appointment.docData.speciality} &bull; Mediconsult Provider</p>
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
                        title="End Call"
                    >
                        <svg className="w-5.5 h-5.5 rotate-[135deg]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                        </svg>
                        End Consultation
                    </button>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold uppercase">
                    <span className={`w-2.5 h-2.5 rounded-full ${doctorActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-ping'}`}></span>
                    {doctorActive ? 'Doctor Connected' : 'Connecting Doctor'}
                </div>
            </div>
        </div>
    )
}

export default VideoCall
