import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../context/AppContext'
import { useNavigate, useParams } from 'react-router-dom'

const Doctors = () => {

  const { speciality } = useParams()

  const [filterDoc, setFilterDoc] = useState([])
  const [showFilter, setShowFilter] = useState(false)
  const navigate = useNavigate();

  const { doctors } = useContext(AppContext)

  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('default')
  const [highRatingOnly, setHighRatingOnly] = useState(false)
  const [availableOnly, setAvailableOnly] = useState(false)

  const applyFilter = () => {
    let list = [...doctors];

    // Filter by Speciality from URL
    if (speciality) {
      list = list.filter(doc => doc.speciality === speciality)
    }

    // Filter by Search query (Name, Speciality, Address)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(doc => 
        String(doc.name).toLowerCase().includes(q) ||
        String(doc.speciality).toLowerCase().includes(q) ||
        (doc.address && (
          String(doc.address.line1 || "").toLowerCase().includes(q) ||
          String(doc.address.line2 || "").toLowerCase().includes(q)
        ))
      );
    }

    // Filter by 4.5+ Rating
    if (highRatingOnly) {
      list = list.filter(doc => (doc.averageRating || 0) >= 4.5);
    }

    // Filter by Available status
    if (availableOnly) {
      list = list.filter(doc => doc.available === true);
    }

    // Apply Sorting
    if (sortBy === 'rating') {
      list.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
    } else if (sortBy === 'experience') {
      const parseExp = (str) => {
        const match = String(str).match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      };
      list.sort((a, b) => parseExp(b.experience) - parseExp(a.experience));
    } else if (sortBy === 'responseTime') {
      const parseTime = (str) => {
        const match = String(str).match(/\d+/);
        return match ? parseInt(match[0], 10) : 999;
      };
      list.sort((a, b) => parseTime(a.responseTime || "15 mins") - parseTime(b.responseTime || "15 mins"));
    } else if (sortBy === 'fees') {
      list.sort((a, b) => a.fees - b.fees);
    }

    setFilterDoc(list);
  }

  useEffect(() => {
    applyFilter()
  }, [doctors, speciality, searchQuery, sortBy, highRatingOnly, availableOnly])

  return (
    <div>
      <p className='text-gray-600 mb-4'>Browse through our verified specialist networks.</p>

      {/* Advanced Filter Control Bar */}
      <div className="bg-stone-50 border border-stone-150 rounded-2xl p-4 sm:p-5 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center text-xs">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            type="text"
            placeholder="Search doctor name, specialty, or clinic address..."
            className="w-full pl-9 pr-4 py-2.5 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-xs"
          />
          <span className="absolute left-3.5 top-3 text-gray-400">🔍</span>
        </div>

        {/* Filters and Sort */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Quick Badges */}
          <button
            onClick={() => setHighRatingOnly(!highRatingOnly)}
            className={`px-3 py-2 rounded-xl font-bold border transition-all ${highRatingOnly ? 'bg-amber-50 text-amber-600 border-amber-300 shadow-sm' : 'bg-white text-gray-650 border-stone-200 hover:border-gray-300'}`}
          >
            ★ 4.5+ Rating
          </button>
          <button
            onClick={() => setAvailableOnly(!availableOnly)}
            className={`px-3 py-2 rounded-xl font-bold border transition-all ${availableOnly ? 'bg-green-50 text-green-600 border-green-300 shadow-sm' : 'bg-white text-gray-650 border-stone-200 hover:border-gray-300'}`}
          >
            ● Available Today
          </button>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2.5 border border-stone-200 rounded-xl focus:outline-none focus:border-primary font-bold text-gray-650 bg-white"
          >
            <option value="default">Sort: Default</option>
            <option value="rating">Rating: High to Low</option>
            <option value="experience">Experience: High to Low</option>
            <option value="responseTime">Response Time: Fastest</option>
            <option value="fees">Fees: Low to High</option>
          </select>
        </div>
      </div>

      <div className='flex flex-col sm:flex-row items-start gap-5 mt-5'>
        <button onClick={() => setShowFilter(!showFilter)} className={`py-1 px-3 border rounded text-sm  transition-all sm:hidden ${showFilter ? 'bg-primary text-white' : ''}`}>Filters</button>
        <div className={`flex-col gap-4 text-sm text-gray-600 ${showFilter ? 'flex' : 'hidden sm:flex'}`}>
          <p onClick={() => speciality === 'General physician' ? navigate('/doctors') : navigate('/doctors/General physician')} className={`w-[94vw] sm:w-auto pl-3 py-1.5 pr-16 border border-gray-300 rounded transition-all cursor-pointer ${speciality === 'General physician' ? 'bg-[#E2E5FF] text-black ' : ''}`}>General physician</p>
          <p onClick={() => speciality === 'Gynecologist' ? navigate('/doctors') : navigate('/doctors/Gynecologist')} className={`w-[94vw] sm:w-auto pl-3 py-1.5 pr-16 border border-gray-300 rounded transition-all cursor-pointer ${speciality === 'Gynecologist' ? 'bg-[#E2E5FF] text-black ' : ''}`}>Gynecologist</p>
          <p onClick={() => speciality === 'Dermatologist' ? navigate('/doctors') : navigate('/doctors/Dermatologist')} className={`w-[94vw] sm:w-auto pl-3 py-1.5 pr-16 border border-gray-300 rounded transition-all cursor-pointer ${speciality === 'Dermatologist' ? 'bg-[#E2E5FF] text-black ' : ''}`}>Dermatologist</p>
          <p onClick={() => speciality === 'Pediatricians' ? navigate('/doctors') : navigate('/doctors/Pediatricians')} className={`w-[94vw] sm:w-auto pl-3 py-1.5 pr-16 border border-gray-300 rounded transition-all cursor-pointer ${speciality === 'Pediatricians' ? 'bg-[#E2E5FF] text-black ' : ''}`}>Pediatricians</p>
          <p onClick={() => speciality === 'Neurologist' ? navigate('/doctors') : navigate('/doctors/Neurologist')} className={`w-[94vw] sm:w-auto pl-3 py-1.5 pr-16 border border-gray-300 rounded transition-all cursor-pointer ${speciality === 'Neurologist' ? 'bg-[#E2E5FF] text-black ' : ''}`}>Neurologist</p>
          <p onClick={() => speciality === 'Gastroenterologist' ? navigate('/doctors') : navigate('/doctors/Gastroenterologist')} className={`w-[94vw] sm:w-auto pl-3 py-1.5 pr-16 border border-gray-300 rounded transition-all cursor-pointer ${speciality === 'Gastroenterologist' ? 'bg-[#E2E5FF] text-black ' : ''}`}>Gastroenterologist</p>
        </div>
        <div className='w-full grid grid-cols-auto gap-4 gap-y-6'>
          {filterDoc.map((item, index) => (
            <div onClick={() => { navigate(`/appointment/${item._id}`); scrollTo(0, 0) }} className='border border-[#C9D8FF] rounded-xl overflow-hidden cursor-pointer hover:translate-y-[-10px] transition-all duration-500 bg-white' key={index}>
              <img className='bg-[#EAEFFF] w-full object-cover' src={item.image} alt="" />
              <div className='p-4'>
                <div className={`flex items-center gap-2 text-sm text-center ${item.available ? 'text-green-500' : "text-gray-500"}`}>
                  <p className={`w-2 h-2 rounded-full ${item.available ? 'bg-green-500' : "bg-gray-500"}`}></p><p>{item.available ? 'Available' : "Not Available"}</p>
                </div>
                <div className='flex items-center justify-between mt-1'>
                  <p className='text-[#262626] text-base font-semibold'>{item.name}</p>
                  {item.averageRating > 0 && (
                    <span className="text-xs bg-amber-50 text-amber-500 px-2 py-0.5 rounded-full flex items-center gap-0.5 font-bold border border-amber-100">★ {item.averageRating}</span>
                  )}
                </div>
                <div className='flex items-center justify-between text-xs text-gray-500 mt-1'>
                  <p>{item.speciality}</p>
                  {item.reviews && item.reviews.length > 0 && <p className='text-[10px] text-gray-400'>({item.reviews.length} reviews)</p>}
                </div>
                <div className='flex items-center justify-between text-xs text-gray-400 mt-2.5 pt-2.5 border-t border-gray-50'>
                  <p>⏳ Response: <strong>{item.responseTime || "15 mins"}</strong></p>
                  <p className="text-gray-700 font-semibold">₹{item.fees}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Doctors