import React, { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import { FaDownload, FaEnvelope, FaEye, FaSpinner } from "react-icons/fa";

const API_BASE = "https://hitkarini-hr-backend.onrender.com/api";

const Dashboard = () => {
  const [counts, setCounts] = useState({ Teaching: 0, "Non Teaching": 0, Admin: 0, total: 0 });
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

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
  });

  const [selectedApp, setSelectedApp] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailPayload, setEmailPayload] = useState({ to: "", subject: "", message: "", status: "Interview" });

  // ---------- fetch counts ----------
  const fetchCounts = async () => {
    try {
      const res = await axios.get(`${API_BASE}/get/count`);
      setCounts(res.data.data || counts);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch counts");
    }
  };

  // ---------- fetch applications ----------
  const fetchApplications = async (opts = {}) => {
    setLoading(true);
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
      };
      const params = new URLSearchParams(Object.fromEntries(Object.entries(serverFilters).filter(([k, v]) => v !== undefined && v !== ""))).toString();
      const res = await axios.get(`${API_BASE}/getApplications?${params}`);
      setApplications(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounts();
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [page, limit]);

  // refetch when server-relevant filters change
  useEffect(() => {
    setPage(1);
    fetchApplications({ page: 1 });
  }, [filters.applyingFor, filters.gender, filters.maritalStatus, filters.areaOfInterest, filters.minExperience, filters.maxExperience]);

  // ---------- handlers ----------
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((p) => ({ ...p, [name]: value }));
  };

  // Client-side filtering for fields not supported on server (education, name/email, date range)
  const applyClientFilters = (items) => {
    return items.filter((it) => {
      // name or email search
      if (filters.nameOrEmail) {
        const q = filters.nameOrEmail.toLowerCase();
        const found = (it.fullName || "").toLowerCase().includes(q) || (it.email || "").toLowerCase().includes(q);
        if (!found) return false;
      }

      // education subject/examType/medium
      if (filters.educationSubject || filters.educationExamType || filters.educationMedium) {
        const edu = (it.educationQualifications || []).some((e) => {
          if (filters.educationSubject && !(e.subject || "").toLowerCase().includes(filters.educationSubject.toLowerCase())) return false;
          if (filters.educationExamType && (e.examType || "") !== filters.educationExamType) return false;
          if (filters.educationMedium && (e.medium || "") !== filters.educationMedium) return false;
          return true;
        });
        if (!edu) return false;
      }

      // date range
      if (filters.startDate) {
        const start = new Date(filters.startDate);
        const created = new Date(it.createdAt || it.dateOfBirth || null);
        if (isNaN(created) || created < start) return false;
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        const created = new Date(it.createdAt || it.dateOfBirth || null);
        if (isNaN(created) || created > end) return false;
      }

      return true;
    });
  };

  const handleApplyFilters = () => {
    setPage(1);
    fetchApplications({ page: 1 });
  };

  const openDetails = (app) => {
    setSelectedApp(app);
    setShowDetails(true);
  };

  const downloadPDF = async (id) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/application/${id}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `Application_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success("PDF downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to download PDF");
    } finally {
      setLoading(false);
    }
  };

  const openEmailModal = (app) => {
    setSelectedApp(app);
    setEmailPayload({ to: app.email || "", subject: `Application update - ${app.fullName || ''}`, message: '', status: 'Interview' });
    setShowEmailModal(true);
  };

  const sendEmail = async () => {
    try {
      const payload = { applicationId: selectedApp._id, ...emailPayload };
      await axios.post(`${API_BASE}/send-email`, payload);
      toast.success("Email sent and logged");
      setShowEmailModal(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to send email");
    }
  };

  // ---------- UI pieces ----------
  const Header = () => (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <img src="/logo.png" alt="logo" className="h-12 w-12 object-contain" />
        <div>
          <div className="text-xl font-bold">Hitkarini Sabha</div>
          <div className="text-sm text-gray-600">HR Recruitment Dashboard</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-sm text-gray-600">Total: <span className="font-semibold">{counts.total}</span></div>
      </div>
    </div>
  );

  const CountCard = ({ title, value, color = 'blue' }) => (
    <div className={`bg-white rounded-lg shadow p-4 border-l-4 border-${color}-500`}>
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-3 shadow-lg w-80">
            <FaSpinner className="text-4xl text-blue-600 animate-spin" />
            <div className="font-semibold text-lg">Working…</div>
            <div className="text-sm text-gray-600 text-center">Please wait while we fetch data.</div>
          </div>
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-3">
          <Header />

          {/* Counts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <CountCard title="Teaching" value={counts.Teaching} color="green" />
            <CountCard title="Non Teaching" value={counts['Non Teaching']} color="yellow" />
            <CountCard title="Admin" value={counts.Admin} color="purple" />
            <CountCard title="Total" value={counts.total} color="blue" />
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg shadow mt-6 overflow-x-auto">
            <table className="min-w-full divide-y">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Phone</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Position</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Experience</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Applied On</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y">
                {applyClientFilters(applications).length === 0 && !loading ? (
                  <tr><td colSpan={7} className="p-6 text-center text-gray-500">No applications found</td></tr>
                ) : (
                  applyClientFilters(applications).map((app) => (
                    <tr key={app._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{app.fullName}</td>
                      <td className="px-4 py-3">{app.email}</td>
                      <td className="px-4 py-3">{app.mobileNumber}</td>
                      <td className="px-4 py-3">{app.applyingFor}</td>
                      <td className="px-4 py-3">{app.totalWorkExperience || 0} yrs</td>
                      <td className="px-4 py-3">{app.createdAt ? new Date(app.createdAt).toLocaleDateString() : '-'}</td>
                      <td className="px-4 py-3 flex gap-2">
                        <button onClick={() => openDetails(app)} className="px-3 py-1 rounded bg-indigo-600 text-white text-sm flex items-center gap-2"><FaEye /> View</button>
                        <button onClick={() => downloadPDF(app._id)} className="px-3 py-1 rounded bg-blue-600 text-white text-sm flex items-center gap-2"><FaDownload /> PDF</button>
                        <button onClick={() => openEmailModal(app)} className="px-3 py-1 rounded bg-amber-500 text-white text-sm flex items-center gap-2"><FaEnvelope /> Email</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">Page {page} of {totalPages}</div>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1 rounded bg-gray-100">Prev</button>
              <button onClick={() => setPage((p) => p + 1)} className="px-3 py-1 rounded bg-gray-100">Next</button>
              <select value={limit} onChange={(e) => setLimit(parseInt(e.target.value))} className="p-1 border rounded">
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sidebar filters Bento */}
        <aside className="md:col-span-1">
          <div className="bg-white rounded-lg shadow p-4 sticky top-6">
            <h4 className="font-semibold mb-3">Filters</h4>
            <div className="space-y-2">
              <input name="nameOrEmail" value={filters.nameOrEmail} onChange={handleFilterChange} placeholder="Name or email" className="w-full p-2 border rounded" />
              <select name="applyingFor" value={filters.applyingFor} onChange={handleFilterChange} className="w-full p-2 border rounded">
                <option value="">Any position</option>
                <option value="Teaching">Teaching</option>
                <option value="Non Teaching">Non Teaching</option>
                <option value="Admin">Admin</option>
              </select>
              <select name="gender" value={filters.gender} onChange={handleFilterChange} className="w-full p-2 border rounded">
                <option value="">Any gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
              <select name="maritalStatus" value={filters.maritalStatus} onChange={handleFilterChange} className="w-full p-2 border rounded">
                <option value="">Any marital status</option>
                <option value="Unmarried">Unmarried</option>
                <option value="Married">Married</option>
              </select>
              <input name="areaOfInterest" value={filters.areaOfInterest} onChange={handleFilterChange} placeholder="Area of interest" className="w-full p-2 border rounded" />
              <div className="flex gap-2">
                <input name="minExperience" value={filters.minExperience} onChange={handleFilterChange} placeholder="Min yrs" className="w-1/2 p-2 border rounded" />
                <input name="maxExperience" value={filters.maxExperience} onChange={handleFilterChange} placeholder="Max yrs" className="w-1/2 p-2 border rounded" />
              </div>

              <hr className="my-2" />

              <div className="text-sm font-medium">Education filters</div>
              <input name="educationSubject" value={filters.educationSubject} onChange={handleFilterChange} placeholder="Subject" className="w-full p-2 border rounded" />
              <select name="educationExamType" value={filters.educationExamType} onChange={handleFilterChange} className="w-full p-2 border rounded">
                <option value="">Exam type</option>
                <option value="Regular">Regular</option>
                <option value="Correspondence">Correspondence</option>
                <option value="Private">Private</option>
              </select>
              <select name="educationMedium" value={filters.educationMedium} onChange={handleFilterChange} className="w-full p-2 border rounded">
                <option value="">Medium</option>
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
              </select>

              <hr className="my-2" />

              <div className="text-sm font-medium">Date range</div>
              <input name="startDate" type="date" value={filters.startDate} onChange={handleFilterChange} className="w-full p-2 border rounded" />
              <input name="endDate" type="date" value={filters.endDate} onChange={handleFilterChange} className="w-full p-2 border rounded" />

              <div className="flex gap-2 mt-3">
                <button onClick={() => { setPage(1); fetchApplications(); }} className="flex-1 bg-blue-600 text-white p-2 rounded">Apply (server)</button>
                <button onClick={() => setPage(1)} className="flex-1 bg-gray-100 p-2 rounded" onClickCapture={() => { /* client filters applied automatically in render */ }}>Apply (client)</button>
              </div>

              <button onClick={() => { setFilters({ applyingFor: '', gender: '', maritalStatus: '', areaOfInterest: '', minExperience: '', maxExperience: '', nameOrEmail: '', educationSubject: '', educationExamType: '', educationMedium: '', startDate: '', endDate: '' }); setPage(1); fetchApplications(); }} className="w-full mt-2 p-2 rounded bg-red-50 text-red-700">Clear</button>
            </div>
          </div>
        </aside>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-600">Page {page} of {totalPages}</div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1 rounded bg-gray-100">Prev</button>
            <button onClick={() => setPage((p) => p + 1)} className="px-3 py-1 rounded bg-gray-100">Next</button>
            <select value={limit} onChange={(e) => setLimit(parseInt(e.target.value))} className="p-1 border rounded">
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>
        </div>

        {/* Details Modal */}
        {showDetails && selectedApp && (
          <div className="fixed inset-0 z-50 bg-black/30 flex items-start justify-center pt-10">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-6 overflow-y-auto max-h-[85vh]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">{selectedApp.fullName}</h3>
                <div className="flex gap-2">
                  <button onClick={() => downloadPDF(selectedApp._id)} className="px-3 py-1 rounded bg-blue-600 text-white text-sm">Download PDF</button>
                  <button onClick={() => setShowDetails(false)} className="px-3 py-1 rounded bg-gray-100">Close</button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-600">Personal</h4>
                  <div className="mt-2 space-y-1 text-sm">
                    <div><span className="text-gray-500">Applying For:</span> {selectedApp.applyingFor}</div>
                    <div><span className="text-gray-500">DOB:</span> {selectedApp.dateOfBirth ? new Date(selectedApp.dateOfBirth).toLocaleDateString() : '-'}</div>
                    <div><span className="text-gray-500">Gender:</span> {selectedApp.gender}</div>
                    <div><span className="text-gray-500">Category:</span> {selectedApp.category}</div>
                    <div><span className="text-gray-500">Area:</span> {selectedApp.areaOfInterest}</div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-600">Contact</h4>
                  <div className="mt-2 space-y-1 text-sm">
                    <div><span className="text-gray-500">Email:</span> {selectedApp.email}</div>
                    <div><span className="text-gray-500">Mobile:</span> {selectedApp.mobileNumber}</div>
                    <div><span className="text-gray-500">Address:</span> {selectedApp.address}</div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <h4 className="text-sm font-semibold text-gray-600">Education</h4>
                  <div className="mt-2 text-sm space-y-2">
                    {(selectedApp.educationQualifications || []).map((e,i) => (
                      <div key={i} className="border rounded p-3 bg-gray-50">
                        <div className="font-medium">{e.level} • {e.subject}</div>
                        <div className="text-xs text-gray-600">{e.institutionName} — {e.boardOrUniversity} • {e.yearOfPassing}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <h4 className="text-sm font-semibold text-gray-600">Work Experience</h4>
                  <div className="mt-2 text-sm space-y-2">
                    {(selectedApp.workExperience || []).map((w,i) => (
                      <div key={i} className="border rounded p-3 bg-gray-50">
                        <div className="font-medium">{w.designation} @ {w.institutionName}</div>
                        <div className="text-xs text-gray-600">{w.startDate ? new Date(w.startDate).toLocaleDateString() : '-'} — {w.endDate ? new Date(w.endDate).toLocaleDateString() : 'Present'}</div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}

        {/* Email Modal */}
        {showEmailModal && selectedApp && (
          <div className="fixed inset-0 z-50 bg-black/30 flex items-start justify-center pt-10">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6">
              <h3 className="text-lg font-semibold mb-3">Send Email to Candidate</h3>
              <div className="space-y-2">
                <input value={emailPayload.to} onChange={(e) => setEmailPayload((p) => ({ ...p, to: e.target.value }))} className="p-2 border rounded w-full" />
                <input value={emailPayload.subject} onChange={(e) => setEmailPayload((p) => ({ ...p, subject: e.target.value }))} className="p-2 border rounded w-full" />
                <select value={emailPayload.status} onChange={(e) => setEmailPayload((p) => ({ ...p, status: e.target.value }))} className="p-2 border rounded w-full">
                  <option value="Selected">Selected</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Interview">Interview</option>
                </select>
                <textarea value={emailPayload.message} onChange={(e) => setEmailPayload((p) => ({ ...p, message: e.target.value }))} className="p-2 border rounded w-full h-36" />

                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowEmailModal(false)} className="px-4 py-2 rounded bg-gray-100">Cancel</button>
                  <button onClick={sendEmail} className="px-4 py-2 rounded bg-amber-500 text-white">Send</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

      </motion.div>
    </div>
  );
};

export default Dashboard;
