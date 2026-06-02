import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { assets } from '../assets/assets'

const MyProfile = () => {

    const [isEdit, setIsEdit] = useState(false)

    const [image, setImage] = useState(false)
    const [uploadingDoc, setUploadingDoc] = useState(false)

    const { token, backendUrl, userData, setUserData, loadUserProfileData } = useContext(AppContext)

    const handleDocumentUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const docName = prompt("Enter a name for this document:", file.name);
        if (!docName) {
            e.target.value = null;
            return;
        }

        setUploadingDoc(true);
        try {
            const formData = new FormData();
            formData.append('document', file);
            formData.append('name', docName);

            const { data } = await axios.post(backendUrl + '/api/user/upload-document', formData, { headers: { token } });

            if (data.success) {
                toast.success(data.message);
                await loadUserProfileData();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.log(error);
            toast.error(error.message);
        } finally {
            setUploadingDoc(false);
            e.target.value = null;
        }
    }

    const handleDeleteDocument = async (documentId) => {
        if (!window.confirm("Are you sure you want to delete this document?")) return;
        
        try {
            const { data } = await axios.post(backendUrl + '/api/user/delete-document', { documentId }, { headers: { token } });
            if (data.success) {
                toast.success(data.message);
                await loadUserProfileData();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.log(error);
            toast.error(error.message);
        }
    }

    // Family Member States
    const [newMemberName, setNewMemberName] = useState('')
    const [newMemberRelation, setNewMemberRelation] = useState('Child')
    const [newMemberGender, setNewMemberGender] = useState('Male')
    const [newMemberDob, setNewMemberDob] = useState('')
    const [addingMember, setAddingMember] = useState(false)

    const handleAddFamilyMember = async (e) => {
        e.preventDefault();
        if (!newMemberName || !newMemberRelation || !newMemberGender || !newMemberDob) {
            toast.warning("Please fill in all family member details");
            return;
        }
        try {
            const { data } = await axios.post(backendUrl + '/api/user/add-family-member', {
                name: newMemberName,
                relation: newMemberRelation,
                gender: newMemberGender,
                dob: newMemberDob
            }, { headers: { token } });
            
            if (data.success) {
                toast.success(data.message);
                await loadUserProfileData();
                setNewMemberName('');
                setNewMemberDob('');
                setAddingMember(false);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.log(error);
            toast.error(error.message);
        }
    }

    const handleDeleteFamilyMember = async (memberId) => {
        if (!window.confirm("Are you sure you want to remove this family dependable?")) return;
        try {
            const { data } = await axios.post(backendUrl + '/api/user/delete-family-member', { memberId }, { headers: { token } });
            if (data.success) {
                toast.success(data.message);
                await loadUserProfileData();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.log(error);
            toast.error(error.message);
        }
    }

    // 2FA States & Methods
    const [showOtpVerification, setShowOtpVerification] = useState(false)
    const [twoFactorOtpCode, setTwoFactorOtpCode] = useState('')

    const handleToggle2FA = async () => {
        if (userData.twoFactorEnabled) {
            if (!window.confirm("Are you sure you want to disable Two-Factor Authentication? Your account security will be lowered.")) return;
            try {
                const { data } = await axios.post(backendUrl + '/api/user/toggle-2fa', { enable: false }, { headers: { token } });
                if (data.success) {
                    toast.success(data.message);
                    await loadUserProfileData();
                } else {
                    toast.error(data.message);
                }
            } catch (error) {
                console.log(error);
                toast.error(error.message);
            }
        } else {
            try {
                const { data } = await axios.post(backendUrl + '/api/user/toggle-2fa', { enable: true }, { headers: { token } });
                if (data.success && data.otpSent) {
                    toast.info(data.message);
                    setShowOtpVerification(true);
                    setTwoFactorOtpCode('');
                } else {
                    toast.error(data.message);
                }
            } catch (error) {
                console.log(error);
                toast.error(error.message);
            }
        }
    }

    const submitEnable2FA = async () => {
        if (twoFactorOtpCode.length !== 6) {
            toast.warning("Please enter a valid 6-digit verification code");
            return;
        }
        try {
            const { data } = await axios.post(backendUrl + '/api/user/toggle-2fa', { enable: true, otp: twoFactorOtpCode }, { headers: { token } });
            if (data.success) {
                toast.success(data.message);
                setShowOtpVerification(false);
                setTwoFactorOtpCode('');
                await loadUserProfileData();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.log(error);
            toast.error(error.message);
        }
    }

    // Function to update user profile data using API
    const updateUserProfileData = async () => {

        try {

            const formData = new FormData();

            formData.append('name', userData.name)
            formData.append('phone', userData.phone)
            formData.append('address', JSON.stringify(userData.address))
            formData.append('gender', userData.gender)
            formData.append('dob', userData.dob)

            image && formData.append('image', image)

            const { data } = await axios.post(backendUrl + '/api/user/update-profile', formData, { headers: { token } })

            if (data.success) {
                toast.success(data.message)
                await loadUserProfileData()
                setIsEdit(false)
                setImage(false)
            } else {
                toast.error(data.message)
            }

        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }

    }

    return userData ? (
        <div className='max-w-lg flex flex-col gap-2 text-sm pt-5'>

            {isEdit
                ? <label htmlFor='image' >
                    <div className='inline-block relative cursor-pointer'>
                        <img className='w-36 rounded opacity-75' src={image ? URL.createObjectURL(image) : userData.image} alt="" />
                        <img className='w-10 absolute bottom-12 right-12' src={image ? '' : assets.upload_icon} alt="" />
                    </div>
                    <input onChange={(e) => setImage(e.target.files[0])} type="file" id="image" hidden />
                </label>
                : <img className='w-36 rounded' src={userData.image} alt="" />
            }

            {isEdit
                ? <input className='bg-gray-50 text-3xl font-medium max-w-60' type="text" onChange={(e) => setUserData(prev => ({ ...prev, name: e.target.value }))} value={userData.name} />
                : <p className='font-medium text-3xl text-[#262626] mt-4'>{userData.name}</p>
            }

            <hr className='bg-[#ADADAD] h-[1px] border-none' />

            <div>
                <p className='text-gray-600 underline mt-3'>CONTACT INFORMATION</p>
                <div className='grid grid-cols-[1fr_3fr] gap-y-2.5 mt-3 text-[#363636]'>
                    <p className='font-medium'>Email id:</p>
                    <p className='text-blue-500'>{userData.email}</p>
                    <p className='font-medium'>Phone:</p>

                    {isEdit
                        ? <input className='bg-gray-50 max-w-52' type="text" onChange={(e) => setUserData(prev => ({ ...prev, phone: e.target.value }))} value={userData.phone} />
                        : <p className='text-blue-500'>{userData.phone}</p>
                    }

                    <p className='font-medium'>Address:</p>

                    {isEdit
                        ? <p>
                            <input className='bg-gray-50' type="text" onChange={(e) => setUserData(prev => ({ ...prev, address: { ...prev.address, line1: e.target.value } }))} value={userData.address.line1} />
                            <br />
                            <input className='bg-gray-50' type="text" onChange={(e) => setUserData(prev => ({ ...prev, address: { ...prev.address, line2: e.target.value } }))} value={userData.address.line2} /></p>
                        : <p className='text-gray-500'>{userData.address.line1} <br /> {userData.address.line2}</p>
                    }

                </div>
            </div>
            <div>
                <p className='text-[#797979] underline mt-3'>BASIC INFORMATION</p>
                <div className='grid grid-cols-[1fr_3fr] gap-y-2.5 mt-3 text-gray-600'>
                    <p className='font-medium'>Gender:</p>

                    {isEdit
                        ? <select className='max-w-20 bg-gray-50' onChange={(e) => setUserData(prev => ({ ...prev, gender: e.target.value }))} value={userData.gender} >
                            <option value="Not Selected">Not Selected</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                        : <p className='text-gray-500'>{userData.gender}</p>
                    }

                    <p className='font-medium'>Birthday:</p>

                    {isEdit
                        ? <input className='max-w-28 bg-gray-50' type='date' onChange={(e) => setUserData(prev => ({ ...prev, dob: e.target.value }))} value={userData.dob} />
                        : <p className='text-gray-500'>{userData.dob}</p>
                    }

                </div>
            </div>

            <hr className='bg-[#ADADAD] h-[1px] border-none mt-5' />

            <div>
                <div className='flex justify-between items-center mt-3'>
                    <p className='text-[#797979] underline'>MEDICAL RECORDS VAULT</p>
                    <label className={`cursor-pointer text-sm font-medium border px-3 py-1 rounded transition-all ${uploadingDoc ? 'border-gray-400 text-gray-400' : 'border-primary text-primary hover:bg-primary hover:text-white'}`}>
                        {uploadingDoc ? "Uploading..." : "+ Upload Document"}
                        <input type="file" hidden onChange={handleDocumentUpload} disabled={uploadingDoc} accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" />
                    </label>
                </div>
                
                <div className='mt-4 flex flex-col gap-3'>
                    {userData.medicalDocuments && userData.medicalDocuments.length > 0 ? (
                        userData.medicalDocuments.map((doc, index) => (
                            <div key={doc.id || index} className='flex items-center justify-between bg-gray-50 p-3 rounded border border-gray-200'>
                                <div className='flex items-center gap-3'>
                                    <div className='bg-primary/10 text-primary w-10 h-10 rounded flex items-center justify-center font-bold'>
                                        📄
                                    </div>
                                    <div className='flex flex-col'>
                                        <a href={doc.url} target="_blank" rel="noreferrer" className='font-medium text-blue-600 hover:text-primary hover:underline'>
                                            {doc.name}
                                        </a>
                                        <span className='text-xs text-gray-500'>
                                            {new Date(doc.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <button onClick={() => handleDeleteDocument(doc.id)} className='text-red-400 hover:text-red-600 p-2 text-xl' title="Delete Document">
                                    🗑️
                                </button>
                            </div>
                        ))
                    ) : (
                        <p className='text-gray-500 text-sm italic'>No medical records uploaded yet.</p>
                    )}
                </div>
            </div>

            <hr className='bg-[#ADADAD] h-[1px] border-none mt-5' />

            <div className='mt-5'>
                <div className='flex justify-between items-center'>
                    <p className='text-[#797979] underline font-medium'>FAMILY MEMBERS & DEPENDENTS</p>
                    <button 
                        onClick={() => setAddingMember(!addingMember)}
                        className="text-xs font-semibold border border-primary text-primary px-3 py-1 rounded hover:bg-primary hover:text-white transition-all"
                    >
                        {addingMember ? "Cancel" : "+ Add Member"}
                    </button>
                </div>

                {addingMember && (
                    <form onSubmit={handleAddFamilyMember} className="bg-gray-50 border border-gray-200 rounded-lg p-4 my-3 flex flex-col gap-3">
                        <p className="font-bold text-gray-800 text-xs">Register Dependable Member</p>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                                <p className="mb-1 text-gray-600 font-medium">Full Name</p>
                                <input 
                                    type="text" 
                                    className="w-full border border-gray-250 rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-primary"
                                    value={newMemberName}
                                    onChange={(e) => setNewMemberName(e.target.value)}
                                    required 
                                />
                            </div>
                            <div>
                                <p className="mb-1 text-gray-600 font-medium">Relation</p>
                                <select 
                                    className="w-full border border-gray-250 rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-primary bg-white"
                                    value={newMemberRelation}
                                    onChange={(e) => setNewMemberRelation(e.target.value)}
                                >
                                    <option value="Child">Child</option>
                                    <option value="Spouse">Spouse</option>
                                    <option value="Parent">Parent</option>
                                    <option value="Sibling">Sibling</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <p className="mb-1 text-gray-600 font-medium">Gender</p>
                                <select 
                                    className="w-full border border-gray-250 rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-primary bg-white"
                                    value={newMemberGender}
                                    onChange={(e) => setNewMemberGender(e.target.value)}
                                >
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <p className="mb-1 text-gray-600 font-medium">Date of Birth</p>
                                <input 
                                    type="date" 
                                    className="w-full border border-gray-250 rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-primary"
                                    value={newMemberDob}
                                    onChange={(e) => setNewMemberDob(e.target.value)}
                                    required 
                                />
                            </div>
                        </div>
                        <button type="submit" className="bg-primary text-white text-xs font-bold py-1.5 rounded hover:bg-primary/95 transition-all shadow-sm">
                            Add Family Dependable
                        </button>
                    </form>
                )}

                <div className='mt-4 flex flex-col gap-2.5'>
                    {userData.familyMembers && userData.familyMembers.length > 0 ? (
                        userData.familyMembers.map((member, index) => (
                            <div key={member.id || index} className='flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 shadow-sm'>
                                <div className='flex items-center gap-3'>
                                    <div className='bg-[#5f6caf]/10 text-primary w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg'>
                                        👤
                                    </div>
                                    <div className='flex flex-col'>
                                        <div className='flex items-center gap-2'>
                                            <p className='font-bold text-gray-800 text-sm'>{member.name}</p>
                                            <span className="bg-blue-50 text-blue-600 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                                                {member.relation}
                                            </span>
                                        </div>
                                        <span className='text-xs text-gray-500'>
                                            {member.gender} | Born {new Date(member.dob).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <button onClick={() => handleDeleteFamilyMember(member.id)} className='text-red-400 hover:text-red-650 p-2 text-base' title="Remove dependable">
                                    🗑️
                                </button>
                            </div>
                        ))
                    ) : (
                        <p className='text-gray-500 text-sm italic'>No family members registered yet.</p>
                    )}
                </div>
            </div>

            {/* Two-Factor Authentication Section */}
            <div className='mt-8 bg-blue-50/20 border border-blue-100 rounded-xl p-4 shadow-sm'>
                <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
                    <div className='flex items-start gap-3'>
                        <div className='text-2xl mt-0.5'>🔒</div>
                        <div>
                            <p className='font-bold text-gray-800 text-sm flex flex-wrap items-center gap-1.5'>
                                Two-Factor Authentication (2FA)
                                {userData.twoFactorEnabled && (
                                    <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-200">
                                        ENABLED
                                    </span>
                                )}
                            </p>
                            <p className='text-xs text-gray-500 mt-0.5'>Secure your account using a one-time passcode sent to your registered email upon log-in attempts.</p>
                        </div>
                    </div>
                    <button
                        onClick={handleToggle2FA}
                        className={`text-xs font-semibold px-4 py-2 rounded-full border flex-shrink-0 transition-all ${userData.twoFactorEnabled ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100' : 'bg-primary border-primary text-white hover:bg-primary/90'}`}
                    >
                        {userData.twoFactorEnabled ? "Disable 2FA" : "Enable 2FA"}
                    </button>
                </div>

                {showOtpVerification && (
                    <div className='mt-4 p-3 border border-blue-200/50 bg-white rounded-lg flex flex-col sm:flex-row gap-3 items-center justify-between shadow-sm'>
                        <div className='flex flex-col gap-1 w-full sm:w-auto'>
                            <p className='text-xs font-bold text-gray-800'>Enter 6-Digit Verification Code</p>
                            <p className='text-[10px] text-gray-500'>A verification code has been dispatched to your email address: {userData.email}</p>
                        </div>
                        <div className='flex gap-2 w-full sm:w-auto justify-end items-center'>
                            <input
                                type='text'
                                maxLength='6'
                                placeholder='123456'
                                className='border border-gray-300 rounded px-3 py-1.5 text-center text-sm font-semibold tracking-widest w-28 outline-none focus:ring-1 focus:ring-primary'
                                value={twoFactorOtpCode}
                                onChange={(e) => setTwoFactorOtpCode(e.target.value.replace(/\D/g, ''))}
                            />
                            <button
                                onClick={submitEnable2FA}
                                className='bg-green-650 text-white text-xs font-semibold px-4 py-1.5 rounded hover:bg-green-700 transition-all'
                            >
                                Verify
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Referral & Rewards Hub Section */}
            <div className='mt-8 bg-purple-50/20 border border-purple-100 rounded-xl p-4 shadow-sm text-xs'>
                <div className='flex items-start gap-3'>
                    <div className='text-2xl mt-0.5'>✦</div>
                    <div className='flex-1'>
                        <p className='font-bold text-gray-800 text-sm flex items-center gap-1.5'>
                            Referral & Rewards Program
                        </p>
                        <p className='text-gray-500 mt-0.5'>Invite your friends to Mediconsult. When they register with your code, they get ₹50, and you earn ₹100 inside your credit balance!</p>
                        
                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4'>
                            {/* Code card */}
                            <div className='bg-white p-3 rounded-lg border border-purple-100 flex flex-col justify-between gap-1 shadow-sm'>
                                <span className='text-[10px] font-bold text-gray-400 uppercase'>Your Unique Referral Code</span>
                                <div className='flex items-center justify-between border border-dashed border-purple-250 p-2 rounded bg-purple-50/10 mt-1'>
                                    <span className='font-mono font-extrabold text-sm tracking-wide text-purple-650'>{userData.referralCode || "MED-XXXXXX"}</span>
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(userData.referralCode || "");
                                            toast.success("Referral code copied to clipboard!");
                                        }}
                                        className='bg-purple-600 hover:bg-purple-700 text-white font-bold px-2.5 py-1 rounded text-[10px]'
                                    >
                                        Copy Code
                                    </button>
                                </div>
                            </div>

                            {/* Balance card */}
                            <div className='bg-white p-3 rounded-lg border border-purple-100 flex flex-col justify-between gap-1 shadow-sm'>
                                <span className='text-[10px] font-bold text-gray-400 uppercase'>Available Discount Balance</span>
                                <div className='flex items-center gap-2 mt-1'>
                                    <span className='text-2xl font-black text-gray-900'>₹{userData.referralCredits || 0}.00</span>
                                    <span className='text-[10px] font-semibold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full'>
                                        100% Redeemable
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Stepper info */}
                        <div className='mt-4 pt-3 border-t border-purple-100/50 flex flex-col sm:flex-row gap-3 text-[10px] text-gray-450 font-medium justify-between'>
                            <span>1. Copy & Share Code</span>
                            <span className='hidden sm:inline'>➔</span>
                            <span>2. Friend Registers (They get ₹50)</span>
                            <span className='hidden sm:inline'>➔</span>
                            <span>3. You earn ₹100 on checkout</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className='mt-10'>

                {isEdit
                    ? <button onClick={updateUserProfileData} className='border border-primary px-8 py-2 rounded-full hover:bg-primary hover:text-white transition-all'>Save information</button>
                    : <button onClick={() => setIsEdit(true)} className='border border-primary px-8 py-2 rounded-full hover:bg-primary hover:text-white transition-all'>Edit</button>
                }

            </div>
        </div>
    ) : null
}

export default MyProfile