
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

const INITIAL_FORM = {
  name: '',
  issue: '',
  location: '',
  complainant_name: '',
  respondent_name: '',
  landlord_name: '',
  tenant_name: '',
  property_address: '',
  rent_amount: '',
  start_date: '',
  end_date: '',
  additional_details: '',
}

export default function DocumentGenerator() {
  const [documentType, setDocumentType] = useState('')
  const [formData, setFormData] = useState(INITIAL_FORM)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [downloadUrl, setDownloadUrl] = useState('')
  const [documentTypes, setDocumentTypes] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    fetchDocumentTypes()
  }, [])

  const fetchDocumentTypes = async () => {
    try {
      const res = await api.get('/documents/types')
      setDocumentTypes(res.data.types || [])
    } catch (err) {
      console.error('Failed to fetch document types:', err)
    }
  }

  const resetForm = () => {
    setFormData(INITIAL_FORM)
    setMessage('')
    setDownloadUrl('')
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleDocumentTypeSelect = (type) => {
    setDocumentType(type)
    resetForm()
  }

  const handleGenerateDocument = async (e) => {
    e.preventDefault()
    if (!documentType) return
    setLoading(true)
    setMessage('')
    setDownloadUrl('')

    try {
      const payload = {
        document_type: documentType,
        ...formData,
      }

      const res = await api.post('/documents/generate', payload)
      setMessage(`✅ ${res.data.message}`)
      setDownloadUrl(res.data.url ? `http://localhost:8000${res.data.url}` : '')

      setTimeout(() => {
        resetForm()
      }, 1000)
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.detail || 'Error generating document'}`)
    } finally {
      setLoading(false)
    }
  }

  const layout = {
    minHeight: '100vh',
    background: '#080808',
    color: '#f0ebe0',
    fontFamily: 'DM Sans, sans-serif',
    padding: 24,
  }

  const card = {
    maxWidth: 980,
    margin: '0 auto',
    background: '#0f0f0f',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 20,
    overflow: 'hidden',
  }

  return (
    <div style={layout}>
      <div style={card}>
        <div style={{ padding: 20, borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: 'Cormorant Garamond, serif', fontSize: 34 }}>⚖️ Legal Document Generator</h1>
            <p style={{ margin: '6px 0 0', color: '#b8b0a0' }}>Generate professional legal documents instantly</p>
          </div>
          <button onClick={() => navigate('/')} style={btnSecondary}>← Back to Chat</button>
        </div>

        <div style={{ padding: 20 }}>
          {!documentType ? (
            <>
              <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 28, marginTop: 0 }}>Select Document Type</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
                {documentTypes.map(type => (
                  <button
                    key={type.id}
                    onClick={() => handleDocumentTypeSelect(type.id)}
                    style={typeCard}
                  >
                    <div style={{ fontSize: 32 }}>{type.icon}</div>
                    <div style={{ fontWeight: 700, marginTop: 10 }}>{type.name}</div>
                    <div style={{ color: '#b8b0a0', fontSize: 13, marginTop: 6 }}>{type.description}</div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <button onClick={() => handleDocumentTypeSelect('')} style={btnSecondary}>← Change Document Type</button>
                <h2 style={{ margin: 0, fontFamily: 'Cormorant Garamond, serif', fontSize: 28 }}>
                  {documentTypes.find(t => t.id === documentType)?.name}
                </h2>
                <button onClick={() => navigate('/')} style={btnSecondary}>Use Chat Mode Instead</button>
              </div>

              {message && (
                <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: message.includes('✅') ? 'rgba(39,174,96,0.12)' : 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {message}
                  {downloadUrl && (
                    <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <a href={downloadUrl} target="_blank" rel="noreferrer" style={btnPrimaryLink}>Open PDF</a>
                      <a href={downloadUrl} download rel="noreferrer" style={btnSecondaryLink}>Download</a>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleGenerateDocument} style={{ marginTop: 18, display: 'grid', gap: 14 }}>
                {['fir', 'notice', 'affidavit'].includes(documentType) && (
                  <>
                    <Field label="Your Full Name *" name="name" value={formData.name} onChange={handleInputChange} placeholder="Enter your full name" />
                    <Field label="Location/City *" name="location" value={formData.location} onChange={handleInputChange} placeholder="Enter location" />
                    <Field label="Issue/Complaint Details *" name="issue" value={formData.issue} onChange={handleInputChange} placeholder="Describe the issue in detail" textarea rows={5} />
                  </>
                )}

                {documentType === 'fir' && (
                  <>
                    <Field label="Complainant Name (if different)" name="complainant_name" value={formData.complainant_name} onChange={handleInputChange} placeholder="Leave blank to use your name" />
                    <Field label="Accused/Respondent Name" name="respondent_name" value={formData.respondent_name} onChange={handleInputChange} placeholder="Name of the accused person" />
                  </>
                )}

                {documentType === 'notice' && (
                  <>
                    <Field label="Complainant Name" name="complainant_name" value={formData.complainant_name} onChange={handleInputChange} placeholder="Your name" />
                    <Field label="Recipient Name" name="respondent_name" value={formData.respondent_name} onChange={handleInputChange} placeholder="Name of the recipient" />
                    <Field label="Additional Details" name="additional_details" value={formData.additional_details} onChange={handleInputChange} placeholder="Any additional information" textarea rows={4} />
                  </>
                )}

                {documentType === 'rental' && (
                  <>
                    <Field label="Landlord Name *" name="landlord_name" value={formData.landlord_name} onChange={handleInputChange} placeholder="Owner's full name" />
                    <Field label="Tenant Name *" name="tenant_name" value={formData.tenant_name} onChange={handleInputChange} placeholder="Occupier's full name" />
                    <Field label="Property Address *" name="property_address" value={formData.property_address} onChange={handleInputChange} placeholder="Complete address of property" textarea rows={3} />
                    <Field label="Monthly Rent Amount *" name="rent_amount" value={formData.rent_amount} onChange={handleInputChange} placeholder="e.g., Rs. 10,000" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <Field label="Lease Start Date *" name="start_date" value={formData.start_date} onChange={handleInputChange} type="date" />
                      <Field label="Lease End Date *" name="end_date" value={formData.end_date} onChange={handleInputChange} type="date" />
                    </div>
                    <Field label="Additional Terms & Conditions" name="additional_details" value={formData.additional_details} onChange={handleInputChange} placeholder="Any special terms or conditions" textarea rows={4} />
                  </>
                )}

                {documentType === 'affidavit' && (
                  <Field label="Detailed Statement *" name="additional_details" value={formData.additional_details} onChange={handleInputChange} placeholder="Provide detailed facts and circumstances to be sworn" textarea rows={6} />
                )}

                <button type="submit" disabled={loading} style={btnPrimary}>
                  {loading ? '⏳ Generating...' : '📝 Generate Document'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, textarea, rows = 3, ...props }) {
  return (
    <label style={{ display: 'grid', gap: 8 }}>
      <span style={{ fontWeight: 600 }}>{label}</span>
      {textarea ? (
        <textarea
          {...props}
          rows={rows}
          style={inputStyle}
        />
      ) : (
        <input
          {...props}
          style={inputStyle}
        />
      )}
    </label>
  )
}

const inputStyle = {
  width: '100%',
  background: '#161616',
  color: '#f0ebe0',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  padding: '12px 14px',
  outline: 'none',
  fontFamily: 'DM Sans, sans-serif',
}

const btnPrimary = {
  background: '#c9a84c',
  color: '#080808',
  border: 'none',
  borderRadius: 12,
  padding: '12px 16px',
  cursor: 'pointer',
  fontWeight: 800,
}

const btnSecondary = {
  background: 'transparent',
  color: '#b8b0a0',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  padding: '10px 14px',
  cursor: 'pointer',
}

const btnPrimaryLink = {
  display: 'inline-block',
  background: '#c9a84c',
  color: '#080808',
  borderRadius: 10,
  padding: '10px 14px',
  textDecoration: 'none',
  fontWeight: 800,
}

const btnSecondaryLink = {
  display: 'inline-block',
  background: 'transparent',
  color: '#c9a84c',
  border: '1px solid rgba(201,168,76,0.35)',
  borderRadius: 10,
  padding: '10px 14px',
  textDecoration: 'none',
  fontWeight: 800,
}

const typeCard = {
  background: '#161616',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 16,
  padding: 18,
  cursor: 'pointer',
  color: '#f0ebe0',
  textAlign: 'left',
}
