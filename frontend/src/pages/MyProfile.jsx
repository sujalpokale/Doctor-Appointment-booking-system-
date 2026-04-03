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