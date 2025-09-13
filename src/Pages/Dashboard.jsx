"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import { motion, AnimatePresence } from "framer-motion"
import toast, { Toaster } from "react-hot-toast"
import {
  FaDownload,
  FaEnvelope,
  FaEye,
  FaSpinner,
  FaFilter,
  FaUsers,
  FaGraduationCap,
  FaUserTie,
  FaCog,
  FaMoon,
  FaSun,
} from "react-icons/fa"

const API_BASE = "http://localhost:8000/api"

const Dashboard = () => {
  const [darkMode, setDarkMode] = useState(false)

  const [counts, setCounts] = useState({ Teaching: 0, "Non Teaching": 0, Admin: 0, total: 0 })
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [totalPages, setTotalPages] = useState(1)

  const [filters, setFilters] = useState({
    applyingFor: "",
    gender: "",
    maritalStatus: "",
    areaOfInterest: "",
    minExperience: "",
    maxExperience: "",
    nameOrEmail: "",
    educationSubject: "",
    educationExamType: "",
    educationMedium: "",
    startDate: "",
    endDate: "",
  })

  const [selectedApp, setSelectedApp] = useState(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailPayload, setEmailPayload] = useState({ to: "", subject: "", message: "", status: "Interview" })

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [darkMode])

  // ---------- fetch counts ----------
  const fetchCounts = async () => {
    try {
      const res = await axios.get(`${API_BASE}/get/count`)
      setCounts(res.data.data || counts)
    } catch (err) {
      console.error(err)
      toast.error("Failed to fetch counts")
    }
  }

  // ---------- fetch applications ----------
  const fetchApplications = async (opts = {}) => {
    setLoading(true)
    try {
      // Only send server-supported filters to backend
      const serverFilters = {
        page,
        limit,
        applyingFor: filters.applyingFor || undefined,
        gender: filters.gender || undefined,
        maritalStatus: filters.maritalStatus || undefined,
        areaOfInterest: filters.areaOfInterest || undefined,
        minExperience: filters.minExperience || undefined,
        maxExperience: filters.maxExperience || undefined,
        ...opts,
      }
      const params = new URLSearchParams(
        Object.fromEntries(Object.entries(serverFilters).filter(([k, v]) => v !== undefined && v !== "")),
      ).toString()
      const res = await axios.get(`${API_BASE}/getApplications?${params}`)
      setApplications(res.data.data || [])
      setTotalPages(res.data.totalPages || 1)
    } catch (err) {
      console.error(err)
      toast.error("Failed to load applications")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCounts()
  }, [])

  useEffect(() => {
    fetchApplications()
  }, [page, limit])

  // refetch when server-relevant filters change
  useEffect(() => {
    setPage(1)
    fetchApplications({ page: 1 })
  }, [
    filters.applyingFor,
    filters.gender,
    filters.maritalStatus,
    filters.areaOfInterest,
    filters.minExperience,
    filters.maxExperience,
  ])

  // ---------- handlers ----------
  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters((p) => ({ ...p, [name]: value }))
  }

  // Client-side filtering for fields not supported on server (education, name/email, date range)
  const applyClientFilters = (items) => {
    return items.filter((it) => {
      // name or email search
      if (filters.nameOrEmail) {
        const q = filters.nameOrEmail.toLowerCase()
        const found = (it.fullName || "").toLowerCase().includes(q) || (it.email || "").toLowerCase().includes(q)
        if (!found) return false
      }

      // education subject/examType/medium
      if (filters.educationSubject || filters.educationExamType || filters.educationMedium) {
        const edu = (it.educationQualifications || []).some((e) => {
          if (
            filters.educationSubject &&
            !(e.subject || "").toLowerCase().includes(filters.educationSubject.toLowerCase())
          )
            return false
          if (filters.educationExamType && (e.examType || "") !== filters.educationExamType) return false
          if (filters.educationMedium && (e.medium || "") !== filters.educationMedium) return false
          return true
        })
        if (!edu) return false
      }

      // date range
      if (filters.startDate) {
        const start = new Date(filters.startDate)
        const created = new Date(it.createdAt || it.dateOfBirth || null)
        if (isNaN(created) || created < start) return false
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate)
        const created = new Date(it.createdAt || it.dateOfBirth || null)
        if (isNaN(created) || created > end) return false
      }

      return true
    })
  }

  const handleApplyFilters = () => {
    setPage(1)
    fetchApplications({ page: 1 })
  }

  const openDetails = (app) => {
    setSelectedApp(app)
    setShowDetails(true)
  }

  const downloadPDF = async (id) => {
    try {
      setLoading(true)
      const res = await axios.get(`${API_BASE}/application/${id}`, { responseType: "blob" })
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }))
      const a = document.createElement("a")
      a.href = url
      a.download = `Application_${id}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      toast.success("PDF downloaded")
    } catch (err) {
      console.error(err)
      toast.error("Failed to download PDF")
    } finally {
      setLoading(false)
    }
  }

  const openEmailModal = (app) => {
    setSelectedApp(app)
    setEmailPayload({
      to: app.email || "",
      subject: `Application update - ${app.fullName || ""}`,
      message: "",
      status: "Interview",
    })
    setShowEmailModal(true)
  }

  const sendEmail = async () => {
    try {
      const payload = { applicationId: selectedApp._id, ...emailPayload }
      await axios.post(`${API_BASE}/send-email`, payload)
      toast.success("Email sent and logged")
      setShowEmailModal(false)
    } catch (err) {
      console.error(err)
      toast.error("Failed to send email")
    }
  }

  // ---------- UI pieces ----------
  const Header = () => (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between mb-8"
    >
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400 dark:from-gray-700 dark:via-gray-600 dark:to-gray-500 rounded-2xl flex items-center justify-center shadow-lg">
          <img src="/logo.png" alt="logo" className="h-8 w-8 object-contain" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">Hitkarini Sabha</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">HR Recruitment Dashboard</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-3 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-xl border border-gray-200 dark:border-gray-600 hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-600 dark:hover:to-gray-500 transition-all duration-300 cursor-pointer"
        >
          {darkMode ? <FaSun className="text-yellow-500 text-lg" /> : <FaMoon className="text-gray-600 text-lg" />}
        </button>
        <div className="px-4 py-2 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
          <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">Total Applications</span>
          <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{counts.total}</div>
        </div>
      </div>
    </motion.div>
  )

  const CountCard = ({ title, value, color = "gray", icon: Icon, delay = 0 }) => {
    const colorClasses = {
      gray: "from-gray-200 via-gray-300 to-gray-400 dark:from-gray-700 dark:via-gray-600 dark:to-gray-500",
      emerald:
        "from-emerald-200 via-emerald-300 to-emerald-400 dark:from-emerald-700 dark:via-emerald-600 dark:to-emerald-500",
      amber: "from-amber-200 via-amber-300 to-amber-400 dark:from-amber-700 dark:via-amber-600 dark:to-amber-500",
      violet:
        "from-violet-200 via-violet-300 to-violet-400 dark:from-violet-700 dark:via-violet-600 dark:to-violet-500",
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        whileHover={{ y: -2, scale: 1.02, transition: { duration: 0.2 } }}
        className="group relative overflow-hidden bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-gray-800 dark:via-gray-700 dark:to-gray-600 rounded-2xl border border-gray-200 dark:border-gray-600 p-6 hover:shadow-xl dark:hover:shadow-2xl transition-all duration-300 cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{title}</p>
            <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{value}</p>
          </div>
          <div
            className={`w-12 h-12 bg-gradient-to-br ${colorClasses[color]} rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}
          >
            <Icon className="text-lg" />
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
      </motion.div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
      <Toaster
        position="top-right"
        toastOptions={{
          className:
            "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100 shadow-lg",
          duration: 4000,
        }}
      />

      {/* Loading overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/20 dark:bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl border border-gray-200 dark:border-gray-600 max-w-sm mx-4"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-500 rounded-2xl flex items-center justify-center">
                <FaSpinner className="text-2xl text-white animate-spin" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-100 mb-1">Processing</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Please wait while we fetch your data</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-6 max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-4 space-y-8">
            <Header />

            {/* Count Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <CountCard
                title="Teaching Staff"
                value={counts.Teaching}
                color="emerald"
                icon={FaGraduationCap}
                delay={0.1}
              />
              <CountCard title="Non Teaching" value={counts["Non Teaching"]} color="amber" icon={FaUsers} delay={0.2} />
              <CountCard title="Admin Staff" value={counts.Admin} color="violet" icon={FaUserTie} delay={0.3} />
              <CountCard title="Total Applications" value={counts.total} color="gray" icon={FaCog} delay={0.4} />
            </div>

            {/* Applications Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl border border-gray-200 dark:border-gray-600 overflow-hidden shadow-sm"
            >
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-600 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Applications</h2>
              </div>

              <div className="w-full">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                        Candidate
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                        Contact
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                        Position
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                        Experience
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                        Applied
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-600">
                    {applyClientFilters(applications).length === 0 && !loading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-2xl flex items-center justify-center">
                              <FaUsers className="text-2xl text-gray-400 dark:text-gray-300" />
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-800 dark:text-gray-100">No applications found</h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Try adjusting your filters</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      applyClientFilters(applications).map((app, index) => (
                        <motion.tr
                          key={app._id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-700 dark:hover:to-gray-600 transition-all duration-200"
                        >
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-medium text-gray-800 dark:text-gray-100">{app.fullName}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{app.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-600 dark:text-gray-300">{app.mobileNumber}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-600 dark:to-gray-500 text-gray-700 dark:text-gray-200">
                              {app.applyingFor}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                              {app.totalWorkExperience || 0} years
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                              {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : "-"}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openDetails(app)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-gray-500 to-gray-600 dark:from-gray-600 dark:to-gray-500 text-white text-sm font-medium hover:from-gray-600 hover:to-gray-700 dark:hover:from-gray-500 dark:hover:to-gray-400 transition-all duration-200 cursor-pointer transform hover:scale-105"
                              >
                                <FaEye className="text-xs" />
                                View
                              </button>
                              <button
                                onClick={() => downloadPDF(app._id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-500 text-white text-sm font-medium hover:from-emerald-600 hover:to-emerald-700 dark:hover:from-emerald-500 dark:hover:to-emerald-400 transition-all duration-200 cursor-pointer transform hover:scale-105"
                              >
                                <FaDownload className="text-xs" />
                                PDF
                              </button>
                              <button
                                onClick={() => openEmailModal(app)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 dark:from-amber-500 dark:to-amber-400 text-white text-sm font-medium hover:from-amber-500 hover:to-amber-600 dark:hover:from-amber-400 dark:hover:to-amber-300 transition-all duration-200 cursor-pointer transform hover:scale-105"
                              >
                                <FaEnvelope className="text-xs" />
                                Email
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-600 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Page {page} of {totalPages}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-white to-gray-50 dark:from-gray-600 dark:to-gray-500 border border-gray-200 dark:border-gray-500 text-sm font-medium text-gray-700 dark:text-gray-200 hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-500 dark:hover:to-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= totalPages}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-white to-gray-50 dark:from-gray-600 dark:to-gray-500 border border-gray-200 dark:border-gray-500 text-sm font-medium text-gray-700 dark:text-gray-200 hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-500 dark:hover:to-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
                  >
                    Next
                  </button>
                  <select
                    value={limit}
                    onChange={(e) => setLimit(Number.parseInt(e.target.value))}
                    className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-500 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gradient-to-r from-white to-gray-50 dark:from-gray-600 dark:to-gray-500 hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-500 dark:hover:to-gray-400 transition-all duration-200 cursor-pointer"
                  >
                    <option value={5}>5 per page</option>
                    <option value={10}>10 per page</option>
                    <option value={20}>20 per page</option>
                  </select>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Sidebar Filters */}
          <motion.aside
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="lg:col-span-1"
          >
            <div className="sticky top-6 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl border border-gray-200 dark:border-gray-600 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-500 rounded-lg flex items-center justify-center">
                  <FaFilter className="text-white text-sm" />
                </div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-100">Filters</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Search</label>
                  <input
                    name="nameOrEmail"
                    value={filters.nameOrEmail}
                    onChange={handleFilterChange}
                    placeholder="Name or email"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Position</label>
                  <select
                    name="applyingFor"
                    value={filters.applyingFor}
                    onChange={handleFilterChange}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="">All positions</option>
                    <option value="Teaching">Teaching</option>
                    <option value="Non Teaching">Non Teaching</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Gender</label>
                  <select
                    name="gender"
                    value={filters.gender}
                    onChange={handleFilterChange}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="">All genders</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Marital Status
                  </label>
                  <select
                    name="maritalStatus"
                    value={filters.maritalStatus}
                    onChange={handleFilterChange}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="">Any status</option>
                    <option value="Unmarried">Unmarried</option>
                    <option value="Married">Married</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Area of Interest
                  </label>
                  <input
                    name="areaOfInterest"
                    value={filters.areaOfInterest}
                    onChange={handleFilterChange}
                    placeholder="Area of interest"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Experience Range
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      name="minExperience"
                      value={filters.minExperience}
                      onChange={handleFilterChange}
                      placeholder="Min years"
                      className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-transparent transition-all duration-200"
                    />
                    <input
                      name="maxExperience"
                      value={filters.maxExperience}
                      onChange={handleFilterChange}
                      placeholder="Max years"
                      className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">Education Filters</h4>
                  <div className="space-y-3">
                    <input
                      name="educationSubject"
                      value={filters.educationSubject}
                      onChange={handleFilterChange}
                      placeholder="Subject"
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-transparent transition-all duration-200"
                    />
                    <select
                      name="educationExamType"
                      value={filters.educationExamType}
                      onChange={handleFilterChange}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="">Exam type</option>
                      <option value="Regular">Regular</option>
                      <option value="Correspondence">Correspondence</option>
                      <option value="Private">Private</option>
                    </select>
                    <select
                      name="educationMedium"
                      value={filters.educationMedium}
                      onChange={handleFilterChange}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="">Medium</option>
                      <option value="English">English</option>
                      <option value="Hindi">Hindi</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">Date Range</h4>
                  <div className="space-y-3">
                    <input
                      name="startDate"
                      type="date"
                      value={filters.startDate}
                      onChange={handleFilterChange}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-transparent transition-all duration-200"
                    />
                    <input
                      name="endDate"
                      type="date"
                      value={filters.endDate}
                      onChange={handleFilterChange}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-600 pt-4 space-y-3">
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      onClick={() => {
                        setPage(1)
                        fetchApplications()
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 dark:from-gray-600 dark:to-gray-500 text-white rounded-lg text-sm font-medium hover:from-gray-600 hover:to-gray-700 dark:hover:from-gray-500 dark:hover:to-gray-400 transition-all duration-200 cursor-pointer transform hover:scale-105"
                    >
                      Apply Server
                    </button>
                    <button
                      onClick={() => setPage(1)}
                      className="px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-600 dark:to-gray-500 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-500 dark:hover:to-gray-400 transition-all duration-200 cursor-pointer transform hover:scale-105"
                    >
                      Apply Client
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setFilters({
                        applyingFor: "",
                        gender: "",
                        maritalStatus: "",
                        areaOfInterest: "",
                        minExperience: "",
                        maxExperience: "",
                        nameOrEmail: "",
                        educationSubject: "",
                        educationExamType: "",
                        educationMedium: "",
                        startDate: "",
                        endDate: "",
                      })
                      setPage(1)
                      fetchApplications()
                    }}
                    className="w-full px-4 py-2 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900 dark:to-red-800 text-red-600 dark:text-red-300 rounded-lg text-sm font-medium hover:from-red-100 hover:to-red-200 dark:hover:from-red-800 dark:hover:to-red-700 transition-all duration-200 cursor-pointer transform hover:scale-105"
                  >
                    Clear All Filters
                  </button>
                </div>
              </div>
            </div>
          </motion.aside>
        </div>

        {/* Details Modal */}
        <AnimatePresence>
          {showDetails && selectedApp && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-gray-900/50 dark:bg-black/50 backdrop-blur-sm flex items-start justify-center pt-10 p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden border border-gray-200 dark:border-gray-600"
              >
                <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-600 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{selectedApp.fullName}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Application Details</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => downloadPDF(selectedApp._id)}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-500 text-white rounded-lg text-sm font-medium hover:from-emerald-600 hover:to-emerald-700 dark:hover:from-emerald-500 dark:hover:to-emerald-400 transition-all duration-200 cursor-pointer transform hover:scale-105"
                    >
                      Download PDF
                    </button>
                    <button
                      onClick={() => setShowDetails(false)}
                      className="px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-600 dark:to-gray-500 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-500 dark:hover:to-gray-400 transition-all duration-200 cursor-pointer transform hover:scale-105"
                    >
                      Close
                    </button>
                  </div>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(85vh-120px)]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                          <div className="w-2 h-2 bg-gray-600 dark:bg-gray-300 rounded-full"></div>
                          Personal Information
                        </h4>
                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-4 space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-300">Position:</span>
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                              {selectedApp.applyingFor}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-300">Date of Birth:</span>
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                              {selectedApp.dateOfBirth ? new Date(selectedApp.dateOfBirth).toLocaleDateString() : "-"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-300">Gender:</span>
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                              {selectedApp.gender}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-300">Category:</span>
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                              {selectedApp.category}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-300">Area of Interest:</span>
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                              {selectedApp.areaOfInterest}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                          <div className="w-2 h-2 bg-emerald-600 dark:bg-emerald-300 rounded-full"></div>
                          Contact Information
                        </h4>
                        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-800 dark:to-emerald-700 rounded-xl p-4 space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-300">Email:</span>
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                              {selectedApp.email}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-300">Mobile:</span>
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                              {selectedApp.mobileNumber}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-300">Address:</span>
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-100 text-right max-w-xs">
                              {selectedApp.address}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                          <div className="w-2 h-2 bg-violet-600 dark:bg-violet-300 rounded-full"></div>
                          Education Qualifications
                        </h4>
                        <div className="space-y-3">
                          {(selectedApp.educationQualifications || []).map((e, i) => (
                            <div
                              key={i}
                              className="bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-800 dark:to-violet-700 rounded-xl p-4 border border-violet-100 dark:border-violet-700"
                            >
                              <div className="font-medium text-gray-800 dark:text-gray-100 mb-1">
                                {e.level} • {e.subject}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-300">{e.institutionName}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {e.boardOrUniversity} • {e.yearOfPassing}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                          <div className="w-2 h-2 bg-amber-600 dark:bg-amber-300 rounded-full"></div>
                          Work Experience
                        </h4>
                        <div className="space-y-3">
                          {(selectedApp.workExperience || []).map((w, i) => (
                            <div
                              key={i}
                              className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-800 dark:to-amber-700 rounded-xl p-4 border border-amber-100 dark:border-amber-700"
                            >
                              <div className="font-medium text-gray-800 dark:text-gray-100 mb-1">{w.designation}</div>
                              <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">{w.institutionName}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {w.startDate ? new Date(w.startDate).toLocaleDateString() : "-"} —{" "}
                                {w.endDate ? new Date(w.endDate).toLocaleDateString() : "Present"}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Email Modal */}
        <AnimatePresence>
          {showEmailModal && selectedApp && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-gray-900/50 dark:bg-black/50 backdrop-blur-sm flex items-start justify-center pt-10 p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-gray-600"
              >
                <div className="p-6 border-b border-gray-200 dark:border-gray-600 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Send Email to Candidate</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Compose and send an email to {selectedApp.fullName}
                  </p>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">To</label>
                    <input
                      value={emailPayload.to}
                      onChange={(e) => setEmailPayload((p) => ({ ...p, to: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Subject</label>
                    <input
                      value={emailPayload.subject}
                      onChange={(e) => setEmailPayload((p) => ({ ...p, subject: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Status</label>
                    <select
                      value={emailPayload.status}
                      onChange={(e) => setEmailPayload((p) => ({ ...p, status: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="Selected">Selected</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Interview">Interview</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Message</label>
                    <textarea
                      value={emailPayload.message}
                      onChange={(e) => setEmailPayload((p) => ({ ...p, message: e.target.value }))}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-transparent transition-all duration-200 resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      onClick={() => setShowEmailModal(false)}
                      className="px-6 py-2 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-600 dark:to-gray-500 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-500 dark:hover:to-gray-400 transition-all duration-200 cursor-pointer transform hover:scale-105"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={sendEmail}
                      className="px-6 py-2 bg-gradient-to-r from-amber-400 to-amber-500 dark:from-amber-500 dark:to-amber-400 text-white rounded-lg font-medium hover:from-amber-500 hover:to-amber-600 dark:hover:from-amber-400 dark:hover:to-amber-300 transition-all duration-200 cursor-pointer transform hover:scale-105"
                    >
                      Send Email
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default Dashboard
