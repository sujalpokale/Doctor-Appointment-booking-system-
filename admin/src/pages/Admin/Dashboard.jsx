import { useContext, useEffect } from 'react'
import { assets } from '../../assets/assets'
import { AdminContext } from '../../context/AdminContext'
import { AppContext } from '../../context/AppContext'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'

const Dashboard = () => {

  const { aToken, getDashData, cancelAppointment, dashData } = useContext(AdminContext)
  const { slotDateFormat } = useContext(AppContext)

  useEffect(() => {
    if (aToken) {
      getDashData()
    }
  }, [aToken])

  const getRevenueData = () => {
    if (!dashData || !dashData.latestAppointments) return [];
    const revenueMap = {};
    const apps = [...dashData.latestAppointments].reverse();
    
    apps.forEach(app => {
      if (app.isCompleted || app.payment) {
        const date = slotDateFormat(app.slotDate);
        revenueMap[date] = (revenueMap[date] || 0) + app.amount;
      }
    });

    const chartData = Object.keys(revenueMap).map(date => ({
      date,
      Revenue: revenueMap[date]
    }));

    return chartData.length > 0 ? chartData.slice(-7) : [{ date: 'No Data', Revenue: 0 }];
  }

  const getStatusData = () => {
    if (!dashData || !dashData.latestAppointments) return [];
    let completed = 0, cancelled = 0, upcoming = 0;
    dashData.latestAppointments.forEach(app => {
      if (app.cancelled) cancelled++;
      else if (app.isCompleted) completed++;
      else upcoming++;
    });
    return [
      { name: 'Upcoming', count: upcoming, color: '#5f6caf' },
      { name: 'Completed', count: completed, color: '#10b981' },
      { name: 'Cancelled', count: cancelled, color: '#ef4444' }
    ];
  }

  return dashData && (
    <div className='m-5'>

      <div className='flex flex-wrap gap-4'>
        <div className='flex items-center gap-4 bg-white p-6 min-w-60 rounded-xl border border-gray-100 shadow-sm transition-all hover:shadow-md'>
          <div className='p-3 bg-blue-50 rounded-lg'>
            <img className='w-10' src={assets.doctor_icon} alt="" />
          </div>
          <div>
            <p className='text-2xl font-bold text-gray-800'>{dashData.doctors}</p>
            <p className='text-sm text-gray-500 font-medium'>Total Doctors</p>
          </div>
        </div>
        <div className='flex items-center gap-4 bg-white p-6 min-w-60 rounded-xl border border-gray-100 shadow-sm transition-all hover:shadow-md'>
          <div className='p-3 bg-indigo-50 rounded-lg'>
            <img className='w-10' src={assets.appointments_icon} alt="" />
          </div>
          <div>
            <p className='text-2xl font-bold text-gray-800'>{dashData.appointments}</p>
            <p className='text-sm text-gray-500 font-medium'>Appointments</p>
          </div>
        </div>
        <div className='flex items-center gap-4 bg-white p-6 min-w-60 rounded-xl border border-gray-100 shadow-sm transition-all hover:shadow-md'>
          <div className='p-3 bg-emerald-50 rounded-lg'>
            <img className='w-10' src={assets.patients_icon} alt="" />
          </div>
          <div>
            <p className='text-2xl font-bold text-gray-800'>{dashData.patients}</p>
            <p className='text-sm text-gray-500 font-medium'>Total Patients</p>
          </div>
        </div>
      </div>

      {/* Advanced Recharts Dashboard Graphs */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8'>
        <div className='bg-white p-6 rounded-xl border border-gray-100 shadow-sm'>
          <h3 className='font-bold text-gray-800 mb-4 flex items-center gap-2'>
            <span className='w-2 h-5 bg-primary rounded-full inline-block'></span>
            Revenue Trends (₹)
          </h3>
          <div className='h-64 w-full'>
            <ResponsiveContainer width='100%' height='100%'>
              <AreaChart data={getRevenueData()}>
                <defs>
                  <linearGradient id='colorRevenue' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='5%' stopColor='#5f6caf' stopOpacity={0.4}/>
                    <stop offset='95%' stopColor='#5f6caf' stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray='3 3' stroke='#f1f5f9' />
                <XAxis dataKey='date' stroke='#94a3b8' fontSize={11} />
                <YAxis stroke='#94a3b8' fontSize={11} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                <Area type='monotone' dataKey='Revenue' stroke='#5f6caf' strokeWidth={2} fillOpacity={1} fill='url(#colorRevenue)' />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className='bg-white p-6 rounded-xl border border-gray-100 shadow-sm'>
          <h3 className='font-bold text-gray-800 mb-4 flex items-center gap-2'>
            <span className='w-2 h-5 bg-primary rounded-full inline-block'></span>
            Appointment Volume & Status
          </h3>
          <div className='h-64 w-full'>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={getStatusData()}>
                <CartesianGrid strokeDasharray='3 3' stroke='#f1f5f9' />
                <XAxis dataKey='name' stroke='#94a3b8' fontSize={11} />
                <YAxis stroke='#94a3b8' fontSize={11} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                <Bar dataKey='count' radius={[8, 8, 0, 0]}>
                  {getStatusData().map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className='flex flex-col lg:flex-row gap-6 mt-10'>
        {/* Latest Bookings */}
        <div className='bg-white flex-1 rounded-xl border border-gray-100 shadow-sm'>
          <div className='flex items-center gap-2.5 px-6 py-5 border-b'>
            <div className='p-2 bg-blue-50 rounded-lg'>
              <img className='w-5' src={assets.list_icon} alt="" />
            </div>
            <p className='font-bold text-gray-800'>Latest Bookings</p>
          </div>

          <div className='divide-y divide-gray-50'>
            {dashData.latestAppointments.slice(0, 5).map((item, index) => (
              <div className='flex items-center px-6 py-4 gap-4 hover:bg-gray-50 transition-colors' key={index}>
                <img className='rounded-full w-12 border-2 border-white shadow-sm' src={item.docData.image} alt="" />
                <div className='flex-1'>
                  <p className='text-gray-900 font-semibold'>{item.docData.name}</p>
                  <p className='text-gray-500 text-xs mt-0.5 font-medium'>Booking on {slotDateFormat(item.slotDate)}</p>
                </div>
                <div>
                  {item.cancelled ? (
                    <span className='px-3 py-1 bg-red-50 text-red-500 text-[10px] uppercase tracking-wider font-bold rounded-full'>Cancelled</span>
                  ) : item.isCompleted ? (
                    <span className='px-3 py-1 bg-emerald-50 text-emerald-500 text-[10px] uppercase tracking-wider font-bold rounded-full'>Completed</span>
                  ) : (
                    <div className='flex gap-2'>
                        <img onClick={() => cancelAppointment(item._id)} className='w-8 h-8 p-2 bg-red-50 hover:bg-red-100 rounded-full cursor-pointer transition-colors shadow-sm icon-red' src={assets.cancel_icon} alt="" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Rated Doctors */}
        <div className='bg-white flex-1 rounded-xl border border-gray-100 shadow-sm'>
          <div className='flex items-center gap-2.5 px-6 py-5 border-b'>
            <div className='p-2 bg-amber-50 rounded-lg'>
              <img className='w-5' src={assets.doctor_icon} alt="" />
            </div>
            <p className='font-bold text-gray-800'>Top Rated Doctors</p>
          </div>

          <div className='divide-y divide-gray-50'>
            {dashData.topRatedDoctors && dashData.topRatedDoctors.length > 0 ? (
              dashData.topRatedDoctors.map((item, index) => (
                <div className='flex items-center px-6 py-4 gap-4 hover:bg-gray-50 transition-colors' key={index}>
                  <div className='relative'>
                    <img className='rounded-full w-12 border-2 border-white shadow-sm bg-gray-50' src={item.image} alt="" />
                    <div className={`absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm ${index === 0 ? 'bg-amber-400' : index === 1 ? 'bg-slate-400' : index === 2 ? 'bg-orange-400' : 'bg-gray-400'}`}>
                      {index + 1}
                    </div>
                  </div>
                  <div className='flex-1'>
                    <p className='text-gray-900 font-semibold'>{item.name}</p>
                    <p className='text-gray-500 text-sm font-medium'>{item.speciality}</p>
                  </div>
                  <div className='flex flex-col items-end gap-1'>
                    <span className="text-xs bg-amber-50 text-amber-500 px-3 py-1 rounded-full flex items-center gap-1 font-bold border border-amber-100 shadow-sm transition-all hover:bg-amber-100 uppercase tracking-tighter">
                      ★ {item.averageRating}
                    </span>
                    <p className='text-[10px] text-gray-400 font-medium uppercase'>Elite Provider</p>
                  </div>
                </div>
              ))
            ) : (
              <div className='flex flex-col items-center justify-center py-12 px-6 text-center text-gray-400'>
                <div className='p-4 bg-gray-50 rounded-full mb-3'>
                  <img className='w-8 opacity-20' src={assets.doctor_icon} alt="" />
                </div>
                <p className='text-sm font-medium'>No top rated doctors found yet.</p>
                <p className='text-xs mt-1'>(Tip: Restart backend if code was just updated)</p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}

export default Dashboard