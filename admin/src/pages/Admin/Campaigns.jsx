import React, { useState, useContext } from 'react'
import { AdminContext } from '../../context/AdminContext'
import axios from 'axios'
import { toast } from 'react-toastify'

const Campaigns = () => {
    const { aToken, backendUrl } = useContext(AdminContext)
    const [subject, setSubject] = useState('')
    const [body, setBody] = useState('')
    const [target, setTarget] = useState('patients')
    const [loading, setLoading] = useState(false)

    const handleSendBroadcast = async (e) => {
        e.preventDefault()
        if (!subject.trim() || !body.trim()) {
            toast.warn("Please enter both Subject and Body.")
            return
        }

        try {
            setLoading(true)
            const { data } = await axios.post(
                backendUrl + '/api/admin/send-broadcast',
                { subject, body, target },
                { headers: { aToken } }
            )

            if (data.success) {
                toast.success(data.message, { autoClose: 5000 })
                // Clear fields on success
                setSubject('')
                setBody('')
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.error(error)
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-6 md:p-10 max-w-6xl mx-auto w-full">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">🚀 Transactional Campaigns & Broadcasts</h1>
            <p className="text-gray-500 text-sm mb-8">Draft and dispatch personalized, responsive HTML newsletter cards to all registered patients or healthcare practitioners instantly.</p>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Side: Campaign Form */}
                <div className="lg:col-span-6 bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
                    <h2 className="text-base font-bold text-gray-800 mb-5 pb-3 border-b border-gray-105">Draft Campaign</h2>
                    
                    <form onSubmit={handleSendBroadcast} className="space-y-5 text-xs text-gray-600">
                        {/* Target Select */}
                        <div className="flex flex-col gap-2">
                            <label className="font-semibold text-gray-700">Recipient Target Audience</label>
                            <select 
                                value={target} 
                                onChange={(e) => setTarget(e.target.value)}
                                className="border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-primary font-bold bg-white text-gray-700"
                            >
                                <option value="patients">All Registered Patients (Users)</option>
                                <option value="doctors">All Verified Doctors (Practitioners)</option>
                            </select>
                        </div>

                        {/* Subject */}
                        <div className="flex flex-col gap-2">
                            <label className="font-semibold text-gray-700">Email Subject Line</label>
                            <input 
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                type="text" 
                                placeholder="e.g. Important Clinic Schedule Upgrades & Vacation Advisories"
                                className="border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-primary text-xs"
                            />
                        </div>

                        {/* Body Text */}
                        <div className="flex flex-col gap-2">
                            <label className="font-semibold text-gray-700">Newsletter Body Message</label>
                            <textarea 
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                rows="8"
                                placeholder="Type your message here. You can use standard formatting. Personalization tags like recipient name will be injected automatically."
                                className="border border-stone-200 rounded-xl p-4 outline-none focus:border-primary text-xs leading-relaxed"
                            ></textarea>
                            <span className="text-[10px] text-gray-400">Note: Line breaks will automatically convert to clean responsive email paragraphs.</span>
                        </div>

                        {/* Submit Button */}
                        <button 
                            type="submit"
                            disabled={loading || !subject.trim() || !body.trim()}
                            className="w-full bg-gradient-to-r from-primary to-blue-600 text-white font-bold text-xs py-3.5 rounded-xl hover:opacity-95 transition-all shadow-md flex items-center justify-center gap-2 disabled:bg-stone-300 disabled:cursor-not-allowed disabled:shadow-none"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Broadcasting to recipients...
                                </>
                            ) : (
                                "Broadcast Newsletter 🚀"
                            )}
                        </button>
                    </form>
                </div>

                {/* Right Side: Glowing Mockup Email Live Preview */}
                <div className="lg:col-span-6 space-y-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Live Mockup Preview</h3>
                    
                    <div className="bg-stone-50 border border-stone-150 rounded-2xl p-5 shadow-inner">
                        <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm max-w-md mx-auto min-h-[350px] flex flex-col justify-between text-xs text-[#334155] leading-relaxed">
                            
                            <div>
                                {/* Gradient Header Card */}
                                <div className="bg-gradient-to-r from-[#5f6caf] to-[#38bdf8] text-white p-5 rounded-lg text-center mb-4">
                                    <h4 className="margin-0 font-bold text-base tracking-wide">Mediconsult Health Newsletter</h4>
                                    <p className="margin-0 opacity-90 text-[10px] mt-0.5">Your Premium Healthcare Partner</p>
                                </div>

                                {/* Dear greeting */}
                                <p className="text-gray-805">Dear <strong>[Recipient Name]</strong>,</p>

                                {/* Live text area */}
                                <div className="bg-[#f8fafc] border-l-4 border-primary/50 p-4 rounded text-gray-700 my-4 whitespace-pre-wrap min-h-[120px]">
                                    {body.trim() ? body : "Draft message on the left to see live previews in this container..."}
                                </div>

                                <p className="mt-4">Stay healthy,<br/><strong>Mediconsult Admin Team</strong></p>
                            </div>

                            <div>
                                <hr className="border-0 border-t border-gray-100 my-4" />
                                <p className="text-[9px] text-[#94a3b8] text-center">
                                    This is a transactional broadcast from Mediconsult. To manage your communication preferences, please visit your account dashboard.<br/>
                                    &copy; 2026 Mediconsult Inc. All rights reserved.
                                </p>
                            </div>

                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}

export default Campaigns
