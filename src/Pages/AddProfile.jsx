// src/components/ApplicationForm.jsx
import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import {
  FaUser,
  FaUsers,
  FaGraduationCap,
  FaBriefcase,
  FaIdCard,
  FaFileUpload,
  FaShareAlt,
  FaCheck,
  FaPlus,
  FaTrash,
  FaSpinner,
} from "react-icons/fa";

/**
 * Full application form matching the provided schema.
 * - Dynamic arrays: educationQualifications, workExperience, references
 * - socialMedia object
 * - files: photo, resume
 * - posts multipart/form-data to http://localhost:8000/api/addApplication
 */

const steps = [
  { label: "Personal", icon: <FaUser /> },
  { label: "Family", icon: <FaUsers /> },
  { label: "Education", icon: <FaGraduationCap /> },
  { label: "Work", icon: <FaBriefcase /> },
  { label: "References", icon: <FaIdCard /> },
  { label: "Uploads", icon: <FaFileUpload /> },
  { label: "Social", icon: <FaShareAlt /> },
  { label: "Review", icon: <FaCheck /> },
];

export default function ApplicationForm() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [toasts, setToasts] = useState([]);

  const pushToast = (type, message, ttl = 4000) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ttl);
  };
  const initialForm = {
    // Files kept as File objects
    photo: null,
    resume: null,

    // Basic fields
    applyingFor: "",
    subjectOrDepartment: "",

    fullName: "",
    fatherName: "",
    fatherOccupation: "",
    motherName: "",
    motherOccupation: "",

    dateOfBirth: "",
    gender: "", // "Male" | "Female"
    bloodGroup: "",

    category: "", // "General"|"OBC"|"SC"|"ST"
    religion: "",
    nationality: "",
    languagesKnown: [], // array

    physicalDisability: false,
    maritalStatus: "Unmarried", // "Married" | "Unmarried"
    spouseName: "",
    children: 0,

    address: "",
    addressPincode: "",
    permanentAddress: "",
    permanentAddressPincode: "",

    mobileNumber: "",
    emergencyMobileNumber: "",
    email: "",

    areaOfInterest: "",

    // Education (array)
    educationQualifications: [
      {
        level: "Graduation", // 10th/12th/Graduation/Post Graduation/PhD
        examType: "Regular", // Regular/Correspondence/Private
        medium: "English", // Hindi/English
        subject: "",
        boardOrUniversity: "",
        institutionName: "",
        yearOfPassing: "",
        percentageOrCGPA: "",
      },
    ],

    // Advanced education category selection (matches backend schema)
    educationCategory: {
      category: "Tier 1",
      categoryRemark: "",
      collegeType: "Education",
      collegeRemark: "",
      details: "Central Universities",
      detailsRemark: "",
    },

    // Expected salary
    expectedSalary: "",

    // Work
    totalWorkExperience: 0,
    workExperience: [
      {
        serialNo: 1,
        institutionName: "",
        designation: "",
        startDate: "",
        endDate: "",
        netMonthlySalary: "",
        reasonOfLeaving: "",
      },
    ],

    // Social
    socialMedia: {
      linkedin: "",
      facebook: "",
      instagram: "",
    },

    // References
    references: [
      {
        name: "",
        designation: "",
        contact: "",
      },
    ],
  };

  const [form, setForm] = useState(initialForm);
  const resumeRef = useRef(null);
  const photoRef = useRef(null);

  // Map collegeType -> allowed 'details' values (match backend enums)
  const DETAILS_OPTIONS = {
    Engineering: [
      "IITs",
      "IISc",
      "IIIT-H",
      "NITs (Top 10)",
      "NIRF Top 30",
      "Govt Regional Engineering Colleges",
      "NBA/NAAC A/A+",
      "NAAC Accredited Institutions",
      "Others (non-accredited or low-ranked)",
      "Other",
    ],
    Dental: [
      "AIIMS",
      "PGI",
      "NIRF Top 10 Dental Colleges",
      "Govt Dental Colleges",
      "NAAC A/A+",
      "Private Dental Colleges (NAAC B+ or above)",
      "Others (non-accredited or low-ranked)",
      "Other",
    ],
    Nursing: [
      "Nationally Prestigious Institutions",
      "Government & Accredited Institutions",
      "Private Colleges with Accreditation",
      "Others / Non-accredited Institutions",
      "Other",
    ],
    Law: [
      "National Law Universities (NLUs)",
      "NIRF Top 10 Law Colleges",
      "Govt Law Colleges",
      "Private Law Colleges (NAAC B+)",
      "Others (non-accredited or low-ranked)",
      "Other",
    ],
    Pharmacy: [
      "NIPERs",
      "State Govt Pharmacy Colleges",
      "PCI approved",
      "PCI recognized private universities (NAAC B+)",
      "Others / Non-accredited Institutions",
      "Other",
    ],
    Education: [
      "Central Universities",
      "NIRF Top 30",
      "NAAC A++",
      "State Universities",
      "NAAC A/A+",
      "Autonomous Colleges (NAAC B+)",
      "Others (non-accredited or low-ranked)",
      "Other",
    ],
    Commerce: [
      "Central Universities",
      "NIRF Top 30",
      "NAAC A++",
      "State Universities",
      "NAAC A/A+",
      "Autonomous Colleges (NAAC B+)",
      "Others (non-accredited or low-ranked)",
      "Other",
    ],
    Arts: [
      "Central Universities",
      "NIRF Top 30",
      "NAAC A++",
      "State Universities",
      "NAAC A/A+",
      "Autonomous Colleges (NAAC B+)",
      "Others (non-accredited or low-ranked)",
      "Other",
    ],
    Science: [
      "Central Universities",
      "NIRF Top 30",
      "NAAC A++",
      "State Universities",
      "NAAC A/A+",
      "Autonomous Colleges (NAAC B+)",
      "Others (non-accredited or low-ranked)",
      "Other",
    ],
    Management: [
      "Central Universities",
      "NIRF Top 30",
      "NAAC A++",
      "State Universities",
      "NAAC A/A+",
      "Autonomous Colleges (NAAC B+)",
      "Others (non-accredited or low-ranked)",
      "Other",
    ],
    Other: ["Other"],
  };

  // Tier-aware mapping: collegeType -> details per Tier.
  // For now we provide a stronger Tier 1 mapping (from user's attachment) and fall back to DETAILS_OPTIONS for other tiers.
  const DETAILS_BY_TIER = {
    "Tier 1": {
      Engineering: [
        "IITs",
        "IISc",
        "IIIT-H",
        "NITs (Top 10)",
        "NIRF Top 30",
      ],
      Dental: ["AIIMS", "PGI", "NIRF Top 10 Dental Colleges"],
      Nursing: ["Nationally Prestigious Institutions"],
      Law: ["National Law Universities (NLUs)", "NIRF Top 10 Law Colleges"],
      Pharmacy: ["NIPERs"],
      Education: ["Central Universities", "NIRF Top 30", "NAAC A++"],
      Commerce: ["Central Universities", "NIRF Top 30", "NAAC A++"],
      Arts: ["Central Universities", "NIRF Top 30", "NAAC A++"],
      Science: ["Central Universities", "NIRF Top 30", "NAAC A++"],
      Management: ["Central Universities", "NIRF Top 30", "NAAC A++"],
      Other: ["Other"],
    },

    "Tier 2": {
      Engineering: [
        "Govt Regional Engineering Colleges",
        "NBA/NAAC A/A+",
      ],
      Dental: ["Govt Dental Colleges", "NAAC A/A+"],
      Nursing: ["Government & Accredited Institutions"],
      Law: ["Govt Law Colleges", "NAAC A/A+"],
      Pharmacy: ["State Govt Pharmacy Colleges", "PCI approved"],
      Education: ["State Universities", "NAAC A/A+"],
      Commerce: ["State Universities", "NAAC A/A+"],
      Arts: ["State Universities", "NAAC A/A+"],
      Science: ["State Universities", "NAAC A/A+"],
      Management: ["State Universities", "NAAC A/A+"],
      Other: ["Other"],
    },

    "Tier 3": {
      Engineering: ["NAAC Accredited Institutions"],
      Dental: ["Private Dental Colleges (NAAC B+ or above)"],
      Nursing: ["Private Colleges with Accreditation"],
      Law: ["Private Law Colleges (NAAC B+)"] ,
      Pharmacy: ["PCI recognized private universities (NAAC B+)", "Others / Non-accredited Institutions"],
      Education: ["Autonomous Colleges (NAAC B+)", "NAAC A+"] ,
      Commerce: ["Autonomous Colleges (NAAC B+)", "NAAC A+"] ,
      Arts: ["Autonomous Colleges (NAAC B+)", "NAAC A+"] ,
      Science: ["Autonomous Colleges (NAAC B+)", "NAAC A+"] ,
      Management: ["Autonomous Colleges (NAAC B+)", "NAAC A+"] ,
      Other: ["Other"],
    },

    "Tier 4": {
      Engineering: ["Others (non-accredited or low-ranked)", "Other"],
      Dental: ["Others (non-accredited or low-ranked)", "Other"],
      Nursing: ["Others / Non-accredited Institutions", "Other"],
      Law: ["Others (non-accredited or low-ranked)", "Other"],
      Pharmacy: ["Others / Non-accredited Institutions", "Other"],
      Education: ["Others (non-accredited or low-ranked)", "Other"],
      Commerce: ["Others (non-accredited or low-ranked)", "Other"],
      Arts: ["Others (non-accredited or low-ranked)", "Other"],
      Science: ["Others (non-accredited or low-ranked)", "Other"],
      Management: ["Others (non-accredited or low-ranked)", "Other"],
      Other: ["Other"],
    },
  };

  const computeDetailsList = (tier, collegeType) => {
    // Try tier-specific mapping first
    if (tier && DETAILS_BY_TIER[tier] && DETAILS_BY_TIER[tier][collegeType]) {
      return DETAILS_BY_TIER[tier][collegeType];
    }
    // Fallback to generic mapping
    return DETAILS_OPTIONS[collegeType] || ["Other"];
  };

  // ---------- helper setters ----------
  const setField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setNestedArrayItem = (arrayKey, index, fieldKey, value) => {
    setForm((prev) => {
      const arr = [...prev[arrayKey]];
      arr[index] = { ...arr[index], [fieldKey]: value };
      return { ...prev, [arrayKey]: arr };
    });
  };

  const addArrayItem = (arrayKey, template) =>
    setForm((prev) => ({ ...prev, [arrayKey]: [...prev[arrayKey], template] }));

  const removeArrayItem = (arrayKey, index) =>
    setForm((prev) => {
      const arr = prev[arrayKey].filter((_, i) => i !== index);
      return { ...prev, [arrayKey]: arr.length ? arr : prev[arrayKey] };
    });

  // languages input helper (comma separated)
  const handleLanguagesChange = (text) => {
    const arr = text
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    setField("languagesKnown", arr);
  };

  // file handlers
  const handleFileChange = (key, file) => setField(key, file);

  // ---------- submit ----------
  const handleSubmit = async () => {
    try {
      setLoading(true);
      // Basic client validation
      if (!form.fullName || !form.email || !form.mobileNumber || !form.dateOfBirth) {
        pushToast("error", "Please fill required fields: Full Name, Email, Mobile, Date of Birth.");
        setStep(0);
        return;
      }
      if (!form.applyingFor) {
        pushToast("error", "Please choose 'Applying For' option.");
        setStep(0);
        return;
      }
      if (!form.gender || !form.category) {
        pushToast("error", "Please choose Gender and Category.");
        return;
      }

      // Validate educationCategory required keys to match backend schema
      if (!form.educationCategory || !form.educationCategory.category || !form.educationCategory.collegeType || !form.educationCategory.details) {
        pushToast("error", "Please complete the Education Category fields.");
        setStep(0);
        setLoading(false);
        return;
      }

      const fd = new FormData();

      // files
      if (form.photo) fd.append("photo", form.photo);
      if (form.resume) fd.append("resume", form.resume);

      // Append all other fields. Arrays/objects -> JSON.stringify
      const skip = ["photo", "resume"];
      Object.keys(form).forEach((key) => {
        if (skip.includes(key)) return;
        const value = form[key];
        if (value === null || value === undefined) {
          fd.append(key, "");
        } else if (Array.isArray(value) || typeof value === "object") {
          fd.append(key, JSON.stringify(value));
        } else {
          fd.append(key, value);
        }
      });

      // Post                   
      const res = await axios.post("https://whale-app-25bar.ondigitalocean.app/api/addApplication", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Reset form and file inputs
      setForm(initialForm);
      setStep(0);
      if (resumeRef.current) resumeRef.current.value = "";
      if (photoRef.current) photoRef.current.value = "";

      // Show full-screen success with confetti and hide the form
      setSubmitted(true);
      pushToast("success", "Submitted Successfully");
      console.log("Response:", res.data);
    } catch (err) {
      console.error("Submit error:", err?.response?.data || err.message || err);
  pushToast("error", "Submission failed. See console for details.");
    }
    finally {
      setLoading(false);
    }
  };

  // ---------- UI pieces ----------
  function StepHeader() {
    return (
      <div className="flex justify-center flex-wrap gap-6 mb-6 px-4">
        {steps.map((s, i) => (
          <div key={i} className="flex flex-col items-center">
            <div
              className={`w-12 h-12 flex items-center justify-center rounded-full text-white ${
                i <= step ? "bg-blue-600" : "bg-gray-300"
              }`}
            >
              {s.icon}
            </div>
            <p className={`mt-2 text-xs font-medium text-center ${i === step ? "text-blue-600" : "text-gray-500"}`}>
              {s.label}
            </p>
          </div>
        ))}
      </div>
    );
  }

  function Confetti() {
    // simple CSS confetti using absolute positioned spans
    const pieces = new Array(40).fill(0);
    return (
      <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
        {pieces.map((_, i) => (
          <span
            key={i}
            className={`block w-2 h-4 rounded-sm bg-[rgba(0,0,0,0.8)] absolute animate-fall`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${-10 - Math.random() * 20}vh`,
              background: `hsl(${Math.floor(Math.random() * 360)} 70% 60%)`,
              transform: `rotate(${Math.random() * 360}deg)`,
              animationDelay: `${Math.random() * 0.8}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>
    );
  }

  function Navigation() {
    return (
      <div className="flex justify-between mt-6">
        {step > 0 ? (
          <button disabled={loading} onClick={() => setStep((s) => s - 1)} className="px-6 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-50">
            Back
          </button>
        ) : (
          <div />
        )}

        {step < steps.length - 1 ? (
          <button disabled={loading} onClick={() => setStep((s) => Math.min(s + 1, steps.length - 1))} className="ml-auto px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
            Next
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={loading} className="ml-auto px-6 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 inline-flex items-center gap-2">
            {loading ? <FaSpinner className="animate-spin" /> : null}
            <span>{loading ? "Submitting..." : "Submit"}</span>
          </button>
        )}
      </div>
    );
  }

  // ---------- Render ----------
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center py-8 px-4">
      {/* confetti keyframes (scoped) */}
      <style>{`
        @keyframes fall { to { transform: translateY(110vh) rotate(360deg); opacity: 0.9 } }
        .animate-fall { animation-name: fall; animation-timing-function: linear; animation-fill-mode: both; }
      `}</style>

      {submitted ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-white/90 p-6">
          <Confetti />
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-lg">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold mb-2">Submitted Successfully</h2>
            <p className="text-gray-600 mb-6">Thank you — your application has been received. We'll contact you shortly.</p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => { setSubmitted(false); setForm(initialForm); setStep(0); if (resumeRef.current) resumeRef.current.value = ""; if (photoRef.current) photoRef.current.value = ""; }} className="px-6 py-2 rounded-lg bg-blue-600 text-white">Submit Another</button>
              <a href="/" className="px-6 py-2 rounded-lg border">Go Home</a>
            </div>
          </div>
        </div>
      ) : null}
  {/* Toasts */}
  <ToastContainer toasts={toasts} />

  {/* Fullscreen loader overlay */}
  {loading && <FullscreenLoader />}
      <div className="w-full max-w-5xl">
        {/* Header */}
        <header className="text-center mb-6">
          <img src="/logo.png" alt="Hitkarini Logo" className="h-16 mx-auto mb-3" />
          <h1 className="text-3xl font-bold text-gray-800">Hitkarini – Application Form</h1>
          <p className="text-gray-600">Empowering Education & Excellence</p>
        </header>

        <StepHeader />

        <motion.div key={step} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-xl p-8">
          {/* STEP 0: Personal */}
          {step === 0 && (
            <section>
              <h2 className="text-xl font-semibold mb-4">Personal Details</h2>
              {/* Education Category now at the start of Personal */}
              <div className="mt-0 mb-4 border rounded p-4 bg-gray-50 col-span-2">
                <h3 className="font-semibold mb-2">Education Category</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input as="select" label="Category" value={form.educationCategory.category} onChange={(v) => {
                      const detailsList = computeDetailsList(v, form.educationCategory.collegeType);
                      setField('educationCategory', { ...form.educationCategory, category: v, details: detailsList[0] });
                    }}>
                    <option value="Tier 1">Tier 1</option>
                    <option value="Tier 2">Tier 2</option>
                    <option value="Tier 3">Tier 3</option>
                    <option value="Tier 4">Tier 4</option>
                    <option value="Other">Other</option>
                  </Input>

                  {form.educationCategory.category === 'Other' && (
                    <Input label="Category Remark" value={form.educationCategory.categoryRemark} onChange={(v) => setField('educationCategory', { ...form.educationCategory, categoryRemark: v })} />
                  )}

                  <Input as="select" label="College Type" value={form.educationCategory.collegeType} onChange={(v) => {
                      const detailsList = computeDetailsList(form.educationCategory.category, v);
                      setField('educationCategory', { ...form.educationCategory, collegeType: v, details: detailsList[0] });
                    }}>
                    <option value="Engineering">Engineering</option>
                    <option value="Dental">Dental</option>
                    <option value="Nursing">Nursing</option>
                    <option value="Law">Law</option>
                    <option value="Pharmacy">Pharmacy</option>
                    <option value="Education">Education</option>
                    <option value="Commerce">Commerce</option>
                    <option value="Arts">Arts</option>
                    <option value="Science">Science</option>
                    <option value="Management">Management</option>
                    <option value="Other">Other</option>
                  </Input>

                  {form.educationCategory.collegeType === 'Other' && (
                    <Input label="College Remark" value={form.educationCategory.collegeRemark} onChange={(v) => setField('educationCategory', { ...form.educationCategory, collegeRemark: v })} />
                  )}

                  {(() => {
                    const list = computeDetailsList(form.educationCategory.category, form.educationCategory.collegeType);
                    return (
                      <Input as="select" label="Details" value={form.educationCategory.details} onChange={(v) => setField('educationCategory', { ...form.educationCategory, details: v })}>
                        {list.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </Input>
                    );
                  })()}

                  {form.educationCategory.details === 'Other' && (
                    <Input label="Details Remark" value={form.educationCategory.detailsRemark} onChange={(v) => setField('educationCategory', { ...form.educationCategory, detailsRemark: v })} />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Applying For" as="select" value={form.applyingFor} onChange={(v) => setField("applyingFor", v)}>
                  <option value="">Select</option>
                  <option value="Teaching">Teaching</option>
                  <option value="Non Teaching">Non Teaching</option>
                  <option value="Admin">Admin</option>
                </Input>

                <Input label="Subject / Department" value={form.subjectOrDepartment} onChange={(v) => setField("subjectOrDepartment", v)} />

                <Input label="Full Name *" value={form.fullName} onChange={(v) => setField("fullName", v)} />

                <Input label="Date of Birth *" type="date" value={form.dateOfBirth} onChange={(v) => setField("dateOfBirth", v)} />

                <Input label="Gender *" as="select" value={form.gender} onChange={(v) => setField("gender", v)}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </Input>

                <Input label="Blood Group" value={form.bloodGroup} onChange={(v) => setField("bloodGroup", v)} />

                <Input label="Category *" as="select" value={form.category} onChange={(v) => setField("category", v)}>
                  <option value="">Select</option>
                  <option value="General">General</option>
                  <option value="OBC">OBC</option>
                  <option value="SC">SC</option>
                  <option value="ST">ST</option>
                </Input>

                <Input label="Religion" value={form.religion} onChange={(v) => setField("religion", v)} />

                <Input label="Nationality" value={form.nationality} onChange={(v) => setField("nationality", v)} />

                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Languages Known (comma separated)</label>
                  <input
                    className="border border-gray-300 p-3 rounded-lg w-full"
                    placeholder="English, Hindi"
                    value={form.languagesKnown.join(", ")}
                    onChange={(e) => handleLanguagesChange(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="h-4 w-4" checked={form.physicalDisability} onChange={(e) => setField("physicalDisability", e.target.checked)} />
                    <span className="text-sm">Physical Disability</span>
                  </label>
                </div>

                <Input label="Marital Status" as="select" value={form.maritalStatus} onChange={(v) => setField("maritalStatus", v)}>
                  <option value="Unmarried">Unmarried</option>
                  <option value="Married">Married</option>
                </Input>

                <Input label="Spouse Name" value={form.spouseName} onChange={(v) => setField("spouseName", v)} />
                <Input label="Children (number)" type="number" value={form.children} onChange={(v) => setField("children", v)} />
                <Input label="Area Of Interest" value={form.areaOfInterest} onChange={(v) => setField("areaOfInterest", v)} />
              </div>
            </section>
          )}

          {/* STEP 1: Family */}
          {step === 1 && (
            <section>
              <h2 className="text-xl font-semibold mb-4">Family Details & Contact</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Father's Name" value={form.fatherName} onChange={(v) => setField("fatherName", v)} />
                <Input label="Father's Occupation" value={form.fatherOccupation} onChange={(v) => setField("fatherOccupation", v)} />
                <Input label="Mother's Name" value={form.motherName} onChange={(v) => setField("motherName", v)} />
                <Input label="Mother's Occupation" value={form.motherOccupation} onChange={(v) => setField("motherOccupation", v)} />

                <Input label="Address" value={form.address} onChange={(v) => setField("address", v)} />
                <Input label="Address Pincode" value={form.addressPincode} onChange={(v) => setField("addressPincode", v)} />

                <Input label="Permanent Address" value={form.permanentAddress} onChange={(v) => setField("permanentAddress", v)} />
                <Input label="Permanent Address Pincode" value={form.permanentAddressPincode} onChange={(v) => setField("permanentAddressPincode", v)} />

                <Input label="Mobile Number *" value={form.mobileNumber} onChange={(v) => setField("mobileNumber", v)} />
                <Input label="Emergency Mobile Number" value={form.emergencyMobileNumber} onChange={(v) => setField("emergencyMobileNumber", v)} />
                <Input label="Email *" type="email" value={form.email} onChange={(v) => setField("email", v)} />
              </div>
            </section>
          )}

          {/* STEP 2: Education */}
          {step === 2 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Education Qualifications</h2>
                <button
                  type="button"
                  onClick={() =>
                    addArrayItem("educationQualifications", {
                      level: "Graduation",
                      examType: "Regular",
                      medium: "English",
                      subject: "",
                      boardOrUniversity: "",
                      institutionName: "",
                      yearOfPassing: "",
                      percentageOrCGPA: "",
                    })
                  }
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  <FaPlus /> Add Education
                </button>
              </div>

              <div className="space-y-4">
                {form.educationQualifications.map((edu, idx) => (
                  <div key={idx} className="border rounded p-4">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium mb-2">Record #{idx + 1}</h3>
                      <button
                        type="button"
                        onClick={() => removeArrayItem("educationQualifications", idx)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <FaTrash />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input as="select" label="Level" value={edu.level} onChange={(v) => setNestedArrayItem("educationQualifications", idx, "level", v)}>
                        <option value="10th">10th</option>
                        <option value="12th">12th</option>
                        <option value="Graduation">Graduation</option>
                        <option value="Post Graduation">Post Graduation</option>
                        <option value="PhD">PhD</option>
                      </Input>

                      <Input as="select" label="Exam Type" value={edu.examType} onChange={(v) => setNestedArrayItem("educationQualifications", idx, "examType", v)}>
                        <option value="Regular">Regular</option>
                        <option value="Correspondence">Correspondence</option>
                        <option value="Private">Private</option>
                      </Input>

                      <Input as="select" label="Medium" value={edu.medium} onChange={(v) => setNestedArrayItem("educationQualifications", idx, "medium", v)}>
                        <option value="English">English</option>
                        <option value="Hindi">Hindi</option>
                      </Input>

                      <Input label="Subject" value={edu.subject} onChange={(v) => setNestedArrayItem("educationQualifications", idx, "subject", v)} />
                      <Input label="Board / University" value={edu.boardOrUniversity} onChange={(v) => setNestedArrayItem("educationQualifications", idx, "boardOrUniversity", v)} />
                      <Input label="Institution Name" value={edu.institutionName} onChange={(v) => setNestedArrayItem("educationQualifications", idx, "institutionName", v)} />
                      <Input label="Year of Passing" type="number" value={edu.yearOfPassing} onChange={(v) => setNestedArrayItem("educationQualifications", idx, "yearOfPassing", v)} />
                      <Input label="Percentage or CGPA" value={edu.percentageOrCGPA} onChange={(v) => setNestedArrayItem("educationQualifications", idx, "percentageOrCGPA", v)} />
                    </div>
                  </div>
                ))}
              </div>

              
            </section>
          )}

          {/* STEP 3: Work */}
          {step === 3 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Work Experience</h2>
                <button
                  type="button"
                  onClick={() =>
                    addArrayItem("workExperience", {
                      serialNo: form.workExperience.length + 1,
                      institutionName: "",
                      designation: "",
                      startDate: "",
                      endDate: "",
                      netMonthlySalary: "",
                      reasonOfLeaving: "",
                    })
                  }
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  <FaPlus /> Add Work
                </button>
              </div>

              <div className="space-y-4">
                {form.workExperience.map((job, idx) => (
                  <div key={idx} className="border rounded p-4">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium mb-2">Job #{idx + 1}</h3>
                      <button type="button" onClick={() => removeArrayItem("workExperience", idx)} className="text-red-600 hover:text-red-800">
                        <FaTrash />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input label="Institution Name" value={job.institutionName} onChange={(v) => setNestedArrayItem("workExperience", idx, "institutionName", v)} />
                      <Input label="Designation" value={job.designation} onChange={(v) => setNestedArrayItem("workExperience", idx, "designation", v)} />
                      <Input label="Start Date" type="date" value={job.startDate} onChange={(v) => setNestedArrayItem("workExperience", idx, "startDate", v)} />
                      <Input label="End Date" type="date" value={job.endDate} onChange={(v) => setNestedArrayItem("workExperience", idx, "endDate", v)} />
                      <Input label="Net Monthly Salary" type="number" value={job.netMonthlySalary} onChange={(v) => setNestedArrayItem("workExperience", idx, "netMonthlySalary", v)} />
                      <Input label="Reason Of Leaving" value={job.reasonOfLeaving} onChange={(v) => setNestedArrayItem("workExperience", idx, "reasonOfLeaving", v)} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Work Experience (years)</label>
                <input type="number" className="border p-2 rounded w-48" value={form.totalWorkExperience} onChange={(e) => setField("totalWorkExperience", e.target.value)} />
              </div>

              <div className="mt-4">
                <Input as="select" label="Expected Salary" value={form.expectedSalary} onChange={(v) => setField('expectedSalary', v)}>
                  <option value="">Select expected salary</option>
                  <option value="Up to 3 LPA">Up to 3 LPA</option>
                  <option value="4 - 7 LPA">4 - 7 LPA</option>
                  <option value="8 - 11 LPA">8 - 11 LPA</option>
                  <option value="12 - 15 LPA">12 - 15 LPA</option>
                  <option value="16 - 20 LPA">16 - 20 LPA</option>
                  <option value="21 - 25 LPA">21 - 25 LPA</option>
                  <option value="25 LPA Above">25 LPA Above</option>
                </Input>
              </div>
            </section>
          )}

          {/* STEP 4: References */}
          {step === 4 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">References</h2>
                <button
                  type="button"
                  onClick={() => addArrayItem("references", { name: "", designation: "", contact: "" })}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  <FaPlus /> Add Reference
                </button>
              </div>

              <div className="space-y-4">
                {form.references.map((ref, idx) => (
                  <div key={idx} className="border rounded p-4">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium mb-2">Reference #{idx + 1}</h3>
                      <button type="button" onClick={() => removeArrayItem("references", idx)} className="text-red-600 hover:text-red-800">
                        <FaTrash />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input label="Name" value={ref.name} onChange={(v) => setNestedArrayItem("references", idx, "name", v)} />
                      <Input label="Designation" value={ref.designation} onChange={(v) => setNestedArrayItem("references", idx, "designation", v)} />
                      <Input label="Contact" value={ref.contact} onChange={(v) => setNestedArrayItem("references", idx, "contact", v)} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* STEP 5: Uploads */}
          {step === 5 && (
            <section>
              <h2 className="text-xl font-semibold mb-4">Uploads</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Resume (pdf/doc/docx)</label>
                  <input ref={resumeRef} type="file" accept=".pdf,.doc,.docx" onChange={(e) => handleFileChange("resume", e.target.files?.[0])} className="border p-2 rounded w-full" />
                  {form.resume && <p className="text-sm mt-2 text-gray-600">{form.resume.name}</p>}
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Photograph (jpg/png)</label>
                  <input ref={photoRef} type="file" accept="image/*" onChange={(e) => handleFileChange("photo", e.target.files?.[0])} className="border p-2 rounded w-full" />
                  {form.photo && <p className="text-sm mt-2 text-gray-600">{form.photo.name}</p>}
                </div>
              </div>
            </section>
          )}

          {/* STEP 6: Social */}
          {step === 6 && (
            <section>
              <h2 className="text-xl font-semibold mb-4">Social Profiles</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="LinkedIn" value={form.socialMedia.linkedin} onChange={(v) => setField("socialMedia", { ...form.socialMedia, linkedin: v })} />
                <Input label="Facebook" value={form.socialMedia.facebook} onChange={(v) => setField("socialMedia", { ...form.socialMedia, facebook: v })} />
                <Input label="Instagram" value={form.socialMedia.instagram} onChange={(v) => setField("socialMedia", { ...form.socialMedia, instagram: v })} />
              </div>
            </section>
          )}

          {/* STEP 7: Review */}
          {step === 7 && (
            <section>
              <h2 className="text-xl font-semibold mb-4">Review & Submit</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <ReviewSection title="Personal">
                  <ReviewRow label="Applying For" value={form.applyingFor} />
                  <ReviewRow label="Subject / Dept" value={form.subjectOrDepartment} />
                  <ReviewRow label="Full Name" value={form.fullName} />
                  <ReviewRow label="Date of Birth" value={form.dateOfBirth} />
                  <ReviewRow label="Gender" value={form.gender} />
                  <ReviewRow label="Blood Group" value={form.bloodGroup} />
                    <div className="mt-3 text-right">
                      <button onClick={() => setStep(0)} className="text-sm text-blue-600 hover:underline">Edit</button>
                    </div>
                  </ReviewSection>

                  <ReviewSection title="Contact & Family">
                  <ReviewRow label="Father" value={`${form.fatherName} (${form.fatherOccupation || '-'})`} />
                  <ReviewRow label="Mother" value={`${form.motherName} (${form.motherOccupation || '-'})`} />
                  <ReviewRow label="Mobile" value={form.mobileNumber} />
                  <ReviewRow label="Emergency" value={form.emergencyMobileNumber} />
                  <ReviewRow label="Email" value={form.email} />
                  <ReviewRow label="Address" value={form.address} />
                    <div className="mt-3 text-right">
                      <button onClick={() => setStep(1)} className="text-sm text-blue-600 hover:underline">Edit</button>
                    </div>
                </ReviewSection>
                </div>

                <div className="space-y-4">
                  <ReviewSection title="Education">
                    {form.educationQualifications.map((e, i) => (
                      <div key={i} className="border rounded p-3">
                        <div className="font-medium">{e.level} — {e.boardOrUniversity || e.institutionName}</div>
                        <div className="text-sm text-gray-700">{e.subject || '-'} • {e.yearOfPassing || '-'} • {e.percentageOrCGPA || '-'}</div>
                      </div>
                    ))}
                    <div className="border rounded p-3 bg-gray-50 mt-2">
                      <div className="font-medium">Category: {form.educationCategory.category}</div>
                      <div className="text-sm text-gray-700">College Type: {form.educationCategory.collegeType} • Details: {form.educationCategory.details}</div>
                      {form.educationCategory.categoryRemark && <div className="text-sm text-gray-600">Remark: {form.educationCategory.categoryRemark}</div>}
                      {form.educationCategory.collegeRemark && <div className="text-sm text-gray-600">College Remark: {form.educationCategory.collegeRemark}</div>}
                      {form.educationCategory.detailsRemark && <div className="text-sm text-gray-600">Details Remark: {form.educationCategory.detailsRemark}</div>}
                    </div>
                    <div className="mt-3 text-right">
                      <button onClick={() => setStep(2)} className="text-sm text-blue-600 hover:underline">Edit</button>
                    </div>
                  </ReviewSection>

                  <ReviewSection title="Work Experience">
                    {form.workExperience.map((w, i) => (
                      <div key={i} className="border rounded p-3">
                        <div className="font-medium">{w.designation || '-'} @ {w.institutionName || '-'}</div>
                        <div className="text-sm text-gray-700">{w.startDate || '-'} → {w.endDate || 'Present'} • ₹{w.netMonthlySalary || '-'}</div>
                      </div>
                    ))}
                    <div className="mt-3 text-right">
                      <button onClick={() => setStep(3)} className="text-sm text-blue-600 hover:underline">Edit</button>
                    </div>
                  </ReviewSection>

                  <div className="p-3">
                    <ReviewRow label="Expected Salary" value={form.expectedSalary} />
                  </div>

                  <ReviewSection title="References">
                    {form.references.map((r, i) => (
                      <div key={i} className="p-2">
                        <div className="font-medium">{r.name || '-'}</div>
                        <div className="text-sm text-gray-700">{r.designation || '-'} • {r.contact || '-'}</div>
                      </div>
                    ))}
                    <div className="mt-3 text-right">
                      <button onClick={() => setStep(4)} className="text-sm text-blue-600 hover:underline">Edit</button>
                    </div>
                  </ReviewSection>

                  <ReviewSection title="Uploads & Social">
                    <div className="grid grid-cols-1 gap-2">
                      <ReviewRow label="Photo" value={form.photo ? form.photo.name : 'No file'} />
                      <ReviewRow label="Resume" value={form.resume ? form.resume.name : 'No file'} />
                      <ReviewRow label="LinkedIn" value={form.socialMedia.linkedin} />
                      <ReviewRow label="Facebook" value={form.socialMedia.facebook} />
                      <ReviewRow label="Instagram" value={form.socialMedia.instagram} />
                    </div>
                    <div className="mt-3 text-right">
                      <button onClick={() => setStep(5)} className="text-sm text-blue-600 hover:underline mr-3">Edit Uploads</button>
                      <button onClick={() => setStep(6)} className="text-sm text-blue-600 hover:underline">Edit Social</button>
                    </div>
                  </ReviewSection>
                </div>
              </div>

              <p className="text-sm text-gray-600 mt-3">If everything looks good click Submit.</p>
            </section>
          )}

          <Navigation />
        </motion.div>
      </div>
    </div>
  );
}

/* ------------------ Reusable UI components ------------------ */

function Input({ label, value, onChange, type = "text", as = "input", children }) {
  // onChange receives raw value (not event)
  const handle = (e) => {
    if (onChange) onChange(e.target ? e.target.value : e);
  };

  return (
    <div>
      <label className="block mb-1 text-sm font-medium text-gray-700">{label}</label>
      {as === "input" && (
        <input type={type} value={value || ""} onChange={handle} className="border border-gray-300 p-3 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400 w-full" />
      )}
      {as === "select" && (
        <select value={value || ""} onChange={handle} className="border border-gray-300 p-3 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400 w-full">
          {children}
        </select>
      )}
    </div>
  );
}

function ReviewSection({ title, children }) {
  return (
    <div className="bg-white border rounded p-4">
      <h3 className="text-md font-semibold mb-2">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <div className="text-gray-600">{label}</div>
      <div className="font-medium text-gray-800">{value || '-'}</div>
    </div>
  );
}

// Simple Toast UI
function ToastContainer({ toasts }) {
  return (
    <div className="fixed right-4 top-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className={`max-w-sm w-full px-4 py-2 rounded shadow-lg text-sm text-white ${t.type === 'success' ? 'bg-green-600' : t.type === 'error' ? 'bg-red-600' : 'bg-gray-800'}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

function FullscreenLoader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl px-8 py-6 flex flex-col items-center gap-4 w-80">
        <FaSpinner className="text-4xl text-blue-600 animate-spin" />
        <div className="text-lg font-semibold text-gray-800">Submitting Application</div>
        <div className="text-sm text-gray-600 text-center">Please wait while we securely upload your information. This may take a few moments.</div>
      </div>
    </div>
  );
}

