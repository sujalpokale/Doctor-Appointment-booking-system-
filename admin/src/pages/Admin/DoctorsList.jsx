import React, { useContext, useEffect, useState } from 'react'
import { AdminContext } from '../../context/AdminContext'

const DoctorsList = () => {

  const { doctors, changeAvailability , aToken , getAllDoctors, toggleVerification} = useContext(AdminContext)

  const [sortByRating, setSortByRating] = useState(false);

  useEffect(() => {
    if (aToken) {
      getAllDoctors()
    }
  }, [aToken])

  const sortedDoctors = sortByRating 
    ? [...doctors].sort((a, b) => b.averageRating - a.averageRating)
    : doctors;

  return (
    <div className='m-5 max-h-[90vh] overflow-y-scroll'>
      <div className='flex items-center justify-between'>
        <h1 className='text-lg font-medium'>All Doctors</h1>
        <button 
          onClick={() => setSortByRating(!sortByRating)}
          className={`px-4 py-1.5 rounded-full text-sm border transition-all ${sortByRating ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
        >
          {sortByRating ? 'Sorted by Rating ★' : 'Sort by Rating'}
        </button>
      </div>
      <div className='w-full flex flex-wrap gap-4 pt-5 gap-y-6'>
        {sortedDoctors.map((item, index) => (
          <div className='border border-[#C9D8FF] rounded-xl max-w-56 overflow-hidden cursor-pointer bg-white shadow-sm hover:shadow-md transition-all duration-300 group' key={index}>
            <div className="relative">
              <img className='bg-[#EAEFFF] group-hover:bg-primary transition-all duration-500 w-full' src={item.image} alt="" />
              {item.isVerified && (
                <span className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-0.5">
                  Verified ✓
                </span>
              )}
            </div>
            <div className='p-4'>
              <div className='flex items-center justify-between'>
                <p className='text-[#262626] text-lg font-medium truncate max-w-[130px]'>{item.name}</p>
                {item.averageRating > 0 && (
                  <span className="text-xs bg-amber-50 text-amber-500 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold border border-amber-100">★ {item.averageRating}</span>
                )}
              </div>
              <p className='text-[#5C5C5C] text-sm'>{item.speciality}</p>
              
              <div className='mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600'>
                <div className='flex items-center gap-1'>
                  <input onChange={() => changeAvailability(item._id)} type="checkbox" checked={item.available} className="accent-primary" />
                  <p>Available</p>
                </div>
                <div className='flex items-center gap-1'>
                  <input onChange={() => toggleVerification(item._id)} type="checkbox" checked={item.isVerified} className="accent-green-500" />
                  <p className={item.isVerified ? 'text-green-600 font-semibold' : 'text-gray-400'}>Verified</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default DoctorsList