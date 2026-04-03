import React, { useContext, useEffect, useState } from 'react'
import { AdminContext } from '../../context/AdminContext'

const DoctorsList = () => {

  const { doctors, changeAvailability , aToken , getAllDoctors} = useContext(AdminContext)

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
          <div className='border border-[#C9D8FF] rounded-xl max-w-56 overflow-hidden cursor-pointer group' key={index}>
            <img className='bg-[#EAEFFF] group-hover:bg-primary transition-all duration-500' src={item.image} alt="" />
            <div className='p-4'>
              <div className='flex items-center justify-between'>
                <p className='text-[#262626] text-lg font-medium'>{item.name}</p>
                {item.averageRating > 0 && (
                  <span className="text-xs bg-amber-50 text-amber-500 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold border border-amber-100">★ {item.averageRating}</span>
                )}
              </div>
              <p className='text-[#5C5C5C] text-sm'>{item.speciality}</p>
              <div className='mt-2 flex items-center gap-1 text-sm'>
                <input onChange={() => changeAvailability(item._id)} type="checkbox" checked={item.available} />
                <p>Available</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default DoctorsList