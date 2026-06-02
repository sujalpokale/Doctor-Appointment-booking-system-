import React, { useState, useContext, useEffect, useRef } from 'react'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'

const SymptomChecker = () => {
    const { backendUrl, token } = useContext(AppContext)
    const [messages, setMessages] = useState([
        {
            sender: 'ai',
            text: 'Hello! I am your AI Medical Assistant. ✦ Please select one of the common symptoms below or describe how you are feeling in detail to help me suggest the correct clinical specialist.'
        }
    ])
    const [inputValue, setInputValue] = useState('')
    const [loading, setLoading] = useState(false)
    const [analysisResult, setAnalysisResult] = useState(null)
    const navigate = useNavigate()
    const chatEndRef = useRef(null)

    const presetSymptoms = [
        "Persistent dry cough, mild fever, and weakness",
        "Dizziness and sharp headache for 3 days",
        "Stomach bloating, acidity, and nausea after meals",
        "Red itchy skin rash spreading on arms",
        "Pregnancy consultation & period cycle changes"
    ]

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages, loading])

    const handleSymptomSubmit = async (symptomText) => {
        if (!symptomText.trim()) return

        // 1. Add user message to chat log
        const userMsg = { sender: 'user', text: symptomText }
        setMessages(prev => [...prev, userMsg])
        setInputValue('')
        setLoading(true)
        setAnalysisResult(null)

        try {
            // 2. Fetch analysis from backend
            const { data } = await axios.post(
                backendUrl + '/api/user/ai-symptom-check', 
                { symptoms: symptomText },
                { headers: { token } }
            )

            if (data.success) {
                setAnalysisResult(data.analysis)
                // 3. Add AI response message
                const responseText = `I have completed a clinical heuristic analysis on your symptoms.\n\n` +
                    `✦ **Recommended Specialty**: ${data.analysis.recommendedSpeciality}\n` +
                    `✦ **Severity Level**: ${data.analysis.severity}\n\n` +
                    `${data.analysis.reason}\n\n` +
                    `Below are some important clinical questions you should consider asking your practitioner during your consultation.`;
                
                setMessages(prev => [...prev, { sender: 'ai', text: responseText }])
            } else {
                toast.error(data.message)
                setMessages(prev => [...prev, { sender: 'ai', text: `Sorry, I encountered an issue analyzing those details: ${data.message}` }])
            }
        } catch (error) {
            console.error(error)
            toast.error(error.message)
            setMessages(prev => [...prev, { sender: 'ai', text: 'Sorry, I failed to reach the server. Please check your network connection and try again.' }])
        } finally {
            setLoading(false)
        }
    }

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSymptomSubmit(inputValue)
        }
    }

    // Dynamic color class for severity levels
    const getSeverityBadgeColor = (severity) => {
        switch (severity?.toLowerCase()) {
            case 'high':
                return 'bg-red-50 text-red-650 border-red-250 animate-pulse font-bold'
            case 'medium':
                return 'bg-amber-50 text-amber-650 border-amber-250 font-bold'
            default:
                return 'bg-green-50 text-green-650 border-green-250 font-bold'
        }
    }

    return (
        <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto flex flex-col h-[82vh]">
            {/* Header section */}
            <div className="text-center mb-6 flex-shrink-0">
                <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent flex items-center justify-center gap-2">
                    ✦ Conversational AI Symptom Checker
                </h1>
                <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
                    Evaluate your symptoms in real-time, assess risk severity, and instantly connect with verified practitioners.
                </p>
            </div>

            {/* Chat viewport wrapper */}
            <div className="flex-1 min-h-0 bg-white rounded-2xl border border-stone-150 shadow-sm flex flex-col md:flex-row overflow-hidden">
                
                {/* Left Side: Conversational Chat Interface */}
                <div className="flex-1 flex flex-col min-w-0 border-b md:border-b-0 md:border-r border-gray-100">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm ${msg.sender === 'user' ? 'bg-primary text-white' : 'bg-stone-50 border border-stone-100 text-gray-800'}`}>
                                    <div className="flex items-center gap-1.5 font-bold mb-1">
                                        {msg.sender === 'user' ? '👤 You' : '✦ AI Medical Assistant'}
                                    </div>
                                    <p className="whitespace-pre-wrap">{msg.text}</p>
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-stone-50 border border-stone-100 rounded-2xl p-4 text-sm flex items-center gap-3">
                                    <div className="flex space-x-1">
                                        <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                    <span className="text-xs text-gray-400 font-semibold">Running diagnostic matching...</span>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Pre-made symptom pill options (Shown when idle) */}
                    {!loading && messages.length === 1 && (
                        <div className="p-4 border-t border-gray-50 bg-stone-50/50 flex-shrink-0">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Select a common symptom check:</p>
                            <div className="flex flex-wrap gap-2">
                                {presetSymptoms.map((symptom, i) => (
                                    <button 
                                        key={i} 
                                        onClick={() => handleSymptomSubmit(symptom)}
                                        className="text-xs text-gray-650 bg-white border border-stone-200 px-3 py-1.5 rounded-full hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                                    >
                                        💡 {symptom}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Input box */}
                    <div className="p-3 border-t border-gray-150 flex-shrink-0 flex gap-2">
                        <input 
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={handleKeyPress}
                            disabled={loading}
                            type="text" 
                            placeholder="Describe symptoms in your own words (e.g. fever, headache, stomachache)..."
                            className="flex-1 border border-stone-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-primary"
                        />
                        <button 
                            onClick={() => handleSymptomSubmit(inputValue)}
                            disabled={loading || !inputValue.trim()}
                            className="bg-primary text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-primary/95 transition-all flex items-center justify-center gap-1 flex-shrink-0 disabled:bg-stone-300 disabled:cursor-not-allowed"
                        >
                            Analyze
                        </button>
                    </div>
                </div>

                {/* Right Side: Glowing Analysis & Action Cards */}
                {analysisResult && (
                    <div className="w-full md:w-80 bg-stone-50/40 p-5 flex flex-col justify-between overflow-y-auto max-h-[40vh] md:max-h-none flex-shrink-0">
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">✦ Diagnostic Evaluation</h3>
                            
                            {/* Recommended Speciality */}
                            <div className="bg-white p-4 rounded-xl border border-stone-150 shadow-sm">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Recommended Specialty</span>
                                <h4 className="text-lg font-extrabold text-gray-900 mt-0.5">{analysisResult.recommendedSpeciality}</h4>
                            </div>

                            {/* Severity Level */}
                            <div className="bg-white p-4 rounded-xl border border-stone-150 shadow-sm flex items-center justify-between">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Assess Risk Severity</span>
                                <span className={`text-xs px-2.5 py-0.5 rounded-full border ${getSeverityBadgeColor(analysisResult.severity)}`}>
                                    {analysisResult.severity} Risk
                                </span>
                            </div>

                            {/* Clinician Questions Checklist */}
                            {analysisResult.questions && analysisResult.questions.length > 0 && (
                                <div className="bg-white p-4 rounded-xl border border-stone-150 shadow-sm">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Suggested Consultation Questions</span>
                                    <ul className="space-y-2">
                                        {analysisResult.questions.map((q, idx) => (
                                            <li key={idx} className="text-xs text-gray-650 flex gap-1.5 leading-relaxed">
                                                <span className="text-primary font-bold">•</span>
                                                <span>{q}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* Booking CTA Button */}
                        <div className="mt-6">
                            <button 
                                onClick={() => {
                                    navigate(`/doctors/${analysisResult.recommendedSpeciality}`)
                                    scrollTo(0, 0)
                                }}
                                className="w-full bg-gradient-to-r from-primary to-blue-600 text-white font-bold text-xs py-3 rounded-xl hover:opacity-95 transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-[0.98] duration-150"
                            >
                                Book consultation now 📅
                            </button>
                            <p className="text-[9px] text-gray-400 mt-2 text-center leading-normal">
                                Direct route to verified {analysisResult.recommendedSpeciality} specialists.
                            </p>
                        </div>
                    </div>
                )}

                {/* Empty State when no diagnostics active */}
                {!analysisResult && (
                    <div className="hidden md:flex w-80 bg-stone-50/40 p-5 items-center justify-center text-center flex-col gap-3">
                        <span className="text-4xl animate-pulse">✦</span>
                        <div>
                            <p className="text-xs font-bold text-gray-450 uppercase">Analysis Results</p>
                            <p className="text-[10px] text-gray-400 mt-1 max-w-[200px] leading-normal">Input or select your active symptoms to generate a real-time clinical specialist recommendation.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default SymptomChecker
