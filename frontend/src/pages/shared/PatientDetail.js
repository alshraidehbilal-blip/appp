import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { ArrowLeft, Upload, FileText, Calendar, DollarSign, Stethoscope, Image as ImageIcon, Trash2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PatientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [patient, setPatient] = useState(null);
  const [visits, setVisits] = useState([]);
  const [payments, setPayments] = useState([]);
  const [images, setImages] = useState([]);
  const [procedures, setProcedures] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imageDesc, setImageDesc] = useState('');
  const [imageType, setImageType] = useState('x-ray');
  const [visitFormData, setVisitFormData] = useState({
    doctor_id: '',
    status: 'in_progress',
    notes: '',
    selectedProcedures: []
  });

  useEffect(() => {
    loadPatientData();
  }, [id]);

  const loadPatientData = async () => {
    try {
      const [patientRes, visitsRes, paymentsRes, imagesRes, proceduresRes, doctorsRes] = await Promise.all([
        axios.get(`${API}/patients/${id}`, { withCredentials: true }),
        axios.get(`${API}/visits?patient_id=${id}`, { withCredentials: true }),
        axios.get(`${API}/payments?patient_id=${id}`, { withCredentials: true }),
        axios.get(`${API}/images/patient/${id}`, { withCredentials: true }),
        axios.get(`${API}/procedures`, { withCredentials: true }),
        axios.get(`${API}/doctors`, { withCredentials: true })
      ]);

      setPatient(patientRes.data);
      setVisits(visitsRes.data);
      setPayments(paymentsRes.data);
      setImages(imagesRes.data);
      setProcedures(proceduresRes.data);
      setDoctors(doctorsRes.data);
      
      if (user.role === 'doctor') {
        setVisitFormData(prev => ({ ...prev, doctor_id: user.id }));
      }
    } catch (error) {
      toast.error('Failed to load patient data');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVisit = async (e) => {
    e.preventDefault();
    try {
      const visitData = {
        patient_id: parseInt(id),
        doctor_id: visitFormData.doctor_id || user.id,
        status: visitFormData.status,
        notes: visitFormData.notes,
        procedures: visitFormData.selectedProcedures.map(p => ({
          procedure_id: p.id,
          quantity: p.quantity || 1
        }))
      };

      await axios.post(`${API}/visits`, visitData, { withCredentials: true });
      toast.success('Visit created successfully');
      setShowVisitModal(false);
      setVisitFormData({ doctor_id: user.role === 'doctor' ? user.id : '', status: 'in_progress', notes: '', selectedProcedures: [] });
      loadPatientData();
    } catch (error) {
      toast.error('Failed to create visit');
    }
  };

  const handleImageUpload = async (e) => {
    e.preventDefault();
    if (!imageFile) {
      toast.error('Please select an image');
      return;
    }

    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append('patient_id', id);
    formData.append('image_type', imageType);
    formData.append('description', imageDesc);

    try {
      await axios.post(`${API}/images/upload`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Image uploaded successfully');
      setShowImageModal(false);
      setImageFile(null);
      setImageDesc('');
      setImageType('x-ray');
      loadPatientData();
    } catch (error) {
      toast.error('Failed to upload image');
    }
  };

  const handleDeleteImage = async (imageId) => {
    if (!window.confirm('Delete this image?')) return;
    try {
      await axios.delete(`${API}/images/${imageId}`, { withCredentials: true });
      toast.success('Image deleted');
      loadPatientData();
    } catch (error) {
      toast.error('Failed to delete image');
    }
  };

  const addProcedureToVisit = (procedure) => {
    if (visitFormData.selectedProcedures.find(p => p.id === procedure.id)) {
      toast.error('Procedure already added');
      return;
    }
    setVisitFormData(prev => ({
      ...prev,
      selectedProcedures: [...prev.selectedProcedures, { ...procedure, quantity: 1 }]
    }));
  };

  const removeProcedureFromVisit = (procedureId) => {
    setVisitFormData(prev => ({
      ...prev,
      selectedProcedures: prev.selectedProcedures.filter(p => p.id !== procedureId)
    }));
  };

  const updateProcedureQuantity = (procedureId, quantity) => {
    setVisitFormData(prev => ({
      ...prev,
      selectedProcedures: prev.selectedProcedures.map(p => 
        p.id === procedureId ? { ...p, quantity: parseInt(quantity) || 1 } : p
      )
    }));
  };

  if (loading) {
    return (
      <DashboardLayout title="Patient Details">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-700"></div>
        </div>
      </DashboardLayout>
    );
  }

  const canEditMedical = user.role === 'doctor' || user.role === 'admin';
  const totalCost = visits.reduce((sum, v) => sum + v.total_cost_jod, 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount_jod, 0);

  return (
    <DashboardLayout title={patient.name}>
      <div className="space-y-6">
        {/* Header */}
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        {/* Patient Info Card */}
        <div className="card p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-slate-600">Name</p>
              <p className="text-lg font-semibold text-slate-900">{patient.name}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Phone</p>
              <p className="text-lg font-semibold text-slate-900">{patient.phone}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Email</p>
              <p className="text-lg font-semibold text-slate-900">{patient.email || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Date of Birth</p>
              <p className="text-lg font-semibold text-slate-900">{patient.date_of_birth || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Balance</p>
              <p className={`text-lg font-bold ${patient.balance_jod > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {patient.balance_jod.toFixed(2)} JOD
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Address</p>
              <p className="text-lg font-semibold text-slate-900">{patient.address || '-'}</p>
            </div>
          </div>
          
          {patient.medical_history && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <p className="text-sm text-slate-600 mb-2">Medical History</p>
              <p className="text-slate-900">{patient.medical_history}</p>
            </div>
          )}
          
          {patient.notes && (
            <div className="mt-4">
              <p className="text-sm text-slate-600 mb-2">Notes</p>
              <p className="text-slate-900">{patient.notes}</p>
            </div>
          )}
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Cost</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{totalCost.toFixed(2)} JOD</p>
              </div>
              <DollarSign className="w-10 h-10 text-blue-500" />
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Paid</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{totalPaid.toFixed(2)} JOD</p>
              </div>
              <DollarSign className="w-10 h-10 text-green-500" />
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Balance</p>
                <p className={`text-2xl font-bold mt-1 ${patient.balance_jod > 0 ? 'text-red-600' : 'text-teal-600'}`}>
                  {patient.balance_jod.toFixed(2)} JOD
                </p>
              </div>
              <DollarSign className="w-10 h-10 text-red-500" />
            </div>
          </div>
        </div>

        {/* Visits Section */}
        {canEditMedical && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Stethoscope className="w-6 h-6" />
                Visits & Procedures
              </h2>
              <button onClick={() => setShowVisitModal(true)} data-testid="add-visit-btn" className="btn-primary flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Add Visit
              </button>
            </div>
            <div className="space-y-4">
              {visits.length === 0 ? (
                <p className="text-slate-600 text-center py-8">No visits recorded yet</p>
              ) : (
                visits.map((visit) => (
                  <div key={visit.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-semibold text-slate-900">Dr. {visit.doctor_name}</p>
                        <p className="text-sm text-slate-600">{new Date(visit.visit_date).toLocaleString()}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${visit.status === 'completed' ? 'bg-green-100 text-green-700' : visit.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {visit.status}
                      </span>
                    </div>
                    {visit.procedures && visit.procedures.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-slate-700 mb-2">Procedures:</p>
                        <div className="space-y-1">
                          {visit.procedures.map((proc, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-slate-600">{proc.name} x{proc.quantity}</span>
                              <span className="font-medium text-slate-900">{(proc.price_jod * proc.quantity).toFixed(2)} JOD</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between">
                          <span className="font-semibold text-slate-700">Total:</span>
                          <span className="font-bold text-teal-700">{visit.total_cost_jod.toFixed(2)} JOD</span>
                        </div>
                      </div>
                    )}
                    {visit.notes && (
                      <div className="mt-2 p-3 bg-slate-50 rounded">
                        <p className="text-sm text-slate-700">{visit.notes}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Medical Images Section */}
        {canEditMedical && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <ImageIcon className="w-6 h-6" />
                Medical Images
              </h2>
              <button onClick={() => setShowImageModal(true)} data-testid="upload-image-btn" className="btn-primary flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Image
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.length === 0 ? (
                <p className="col-span-full text-slate-600 text-center py-8">No images uploaded yet</p>
              ) : (
                images.map((img) => (
                  <div key={img.id} className="relative group">
                    <img
                      src={`${API}/images/${img.id}`}
                      alt={img.description}
                      className="w-full h-48 object-cover rounded-lg border border-slate-200"
                    />
                    <div className="absolute inset-0 bg-slate-900/70 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col items-center justify-center p-2">
                      <p className="text-white text-xs text-center mb-2">{img.image_type}</p>
                      {img.description && <p className="text-white text-xs text-center mb-2">{img.description}</p>}
                      <button onClick={() => handleDeleteImage(img.id)} data-testid={`delete-image-${img.id}-btn`} className="text-red-400 hover:text-red-300">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Payments Section */}
        <div className="card p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <DollarSign className="w-6 h-6" />
            Payment History
          </h2>
          <div className="space-y-3">
            {payments.length === 0 ? (
              <p className="text-slate-600 text-center py-8">No payments recorded yet</p>
            ) : (
              payments.map((payment) => (
                <div key={payment.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900">{payment.amount_jod.toFixed(2)} JOD</p>
                    <p className="text-sm text-slate-600">{new Date(payment.payment_date).toLocaleString()}</p>
                    <p className="text-xs text-slate-500">Recorded by: {payment.recorded_by_name}</p>
                  </div>
                  {payment.notes && <p className="text-sm text-slate-600">{payment.notes}</p>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Visit Modal */}
      {showVisitModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">Create New Visit</h2>
            </div>
            <form onSubmit={handleCreateVisit} className="p-6 space-y-4">
              {user.role === 'admin' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Doctor *</label>
                  <select data-testid="visit-doctor-select" value={visitFormData.doctor_id} onChange={(e) => setVisitFormData({...visitFormData, doctor_id: parseInt(e.target.value)})} className="input-field" required>
                    <option value="">Select Doctor</option>
                    {doctors.map(doc => <option key={doc.id} value={doc.id}>{doc.full_name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                <select data-testid="visit-status-select" value={visitFormData.status} onChange={(e) => setVisitFormData({...visitFormData, status: e.target.value})} className="input-field">
                  <option value="in_progress">In Progress</option>
                  <option value="follow_up_scheduled">Follow-up Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                <textarea data-testid="visit-notes-input" value={visitFormData.notes} onChange={(e) => setVisitFormData({...visitFormData, notes: e.target.value})} className="input-field" rows="3" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">Procedures</label>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-slate-200 rounded">
                    {procedures.map(proc => (
                      <button key={proc.id} type="button" onClick={() => addProcedureToVisit(proc)} className="btn-secondary text-left p-2">
                        <div className="font-medium text-sm">{proc.name}</div>
                        <div className="text-xs text-slate-600">{proc.price_jod} JOD</div>
                      </button>
                    ))}
                  </div>
                  {visitFormData.selectedProcedures.length > 0 && (
                    <div className="border border-teal-200 bg-teal-50 rounded p-3">
                      <p className="text-sm font-medium text-slate-700 mb-2">Selected Procedures:</p>
                      {visitFormData.selectedProcedures.map(proc => (
                        <div key={proc.id} className="flex items-center justify-between mb-2">
                          <span className="text-sm">{proc.name}</span>
                          <div className="flex items-center gap-2">
                            <input type="number" min="1" value={proc.quantity} onChange={(e) => updateProcedureQuantity(proc.id, e.target.value)} className="w-16 px-2 py-1 border border-slate-300 rounded text-sm" />
                            <span className="text-sm font-medium">{(proc.price_jod * proc.quantity).toFixed(2)} JOD</span>
                            <button type="button" onClick={() => removeProcedureFromVisit(proc.id)} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      ))}
                      <div className="mt-3 pt-3 border-t border-teal-200">
                        <div className="flex justify-between font-bold text-slate-900">
                          <span>Total:</span>
                          <span>{visitFormData.selectedProcedures.reduce((sum, p) => sum + (p.price_jod * p.quantity), 0).toFixed(2)} JOD</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" data-testid="save-visit-btn" className="btn-primary flex-1">Create Visit</button>
                <button type="button" data-testid="cancel-visit-btn" onClick={() => { setShowVisitModal(false); setVisitFormData({ doctor_id: user.role === 'doctor' ? user.id : '', status: 'in_progress', notes: '', selectedProcedures: [] }); }} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Upload Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">Upload Medical Image</h2>
            </div>
            <form onSubmit={handleImageUpload} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Image Type</label>
                <select data-testid="image-type-select" value={imageType} onChange={(e) => setImageType(e.target.value)} className="input-field">
                  <option value="x-ray">X-Ray</option>
                  <option value="lab-result">Lab Result</option>
                  <option value="scan">Scan</option>
                  <option value="photo">Photo</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                <input type="text" data-testid="image-desc-input" value={imageDesc} onChange={(e) => setImageDesc(e.target.value)} className="input-field" placeholder="Optional description" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Select Image File *</label>
                <input type="file" data-testid="image-file-input" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} className="input-field" required />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" data-testid="upload-image-submit-btn" className="btn-primary flex-1">Upload</button>
                <button type="button" data-testid="cancel-image-btn" onClick={() => { setShowImageModal(false); setImageFile(null); setImageDesc(''); setImageType('x-ray'); }} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default PatientDetail;