import { useEffect, useState } from 'react'
import './App.css'
import { AiFillDelete } from 'react-icons/ai'
import { FaFileUpload } from 'react-icons/fa'
import Placeholder from './assets/placeholder.jpeg'
import Loading from './components/Loading'
import { BlobServiceClient } from '@azure/storage-blob'

const App = () => {
  const [file, setFile] = useState(null)
  const [fileType, setFileType] = useState('')
  const [fileUrls, setFileUrls] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')

  const account = import.meta.env.VITE_STORAGE_ACCOUNT
  const sasToken = import.meta.env.VITE_STORAGE_SAS
  const containerName = import.meta.env.VITE_STORAGE_CONTAINER

  const blobServiceClient = new BlobServiceClient(`https://${account}.blob.core.windows.net/?${sasToken}`)
  const containerClient = blobServiceClient.getContainerClient(containerName)

  const fetchFiles = async () => {
    try {
      setLoading(true)
      const urls = []
      for await (const blob of containerClient.listBlobsFlat()) {
        const blobClient = containerClient.getBlockBlobClient(blob.name)
        urls.push({
          name: blob.name,
          url: blobClient.url,
          type: blob.properties.contentType || 'application/octet-stream',
        })
      }
      setFileUrls(urls)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file || !fileType) return alert('Please select a file type and file to upload')
    try {
      setLoading(true)
      const blobName = `${Date.now()}-${file.name}`
      const blobClient = containerClient.getBlockBlobClient(blobName)
      await blobClient.uploadData(file, {
        blobHTTPHeaders: { blobContentType: file.type }
      })
      await fetchFiles()
      setFile(null)
      setFileType('')
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (blobName) => {
    try {
      setLoading(true)
      const blobClient = containerClient.getBlockBlobClient(blobName)
      await blobClient.delete()
      await fetchFiles()
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [])

  const getFileType = (type) => {
    if (type.startsWith('image/')) return 'image'
    if (type.startsWith('video/')) return 'video'
    if (type.startsWith('audio/')) return 'audio'
    return 'other'
  }

  const getFileNameWithoutExtension = (filename) => {
    const dotIndex = filename.lastIndexOf('.')
    return dotIndex !== -1 ? filename.slice(0, dotIndex) : filename
  }

  const filteredFiles = filter === 'all' ? fileUrls : fileUrls.filter(f => getFileType(f.type) === filter)

  return (
    <div className="app-container">
      {loading && <Loading />}
      <header>
        <h1>🎨Akmal Cloud Upload and Preview Media Gallery🎶📹</h1>
        <p>Upload and preview images, videos, and audio stored on Azure</p>
        <div className="filter-controls">
          <label>Filter:</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
            <option value="audio">Audios</option>
          </select>
        </div>
      </header>

      <form className="upload-area" onSubmit={handleSubmit}>
        <div className="media-preview">
          {file && fileType === 'image' ? <img src={URL.createObjectURL(file)} />
            : file && fileType === 'video' ? <video src={URL.createObjectURL(file)} controls />
            : file && fileType === 'audio' ? <audio src={URL.createObjectURL(file)} controls />
            : <img src={Placeholder} alt="preview placeholder" />}
        </div>
        <div className="upload-buttons">
          <label htmlFor="imageInput"><FaFileUpload /> Image</label>
          <input id="imageInput" type="file" accept="image/*" style={{ display: 'none' }}
            onChange={(e) => { setFile(e.target.files[0]); setFileType('image') }} />

          <label htmlFor="videoInput"><FaFileUpload /> Video</label>
          <input id="videoInput" type="file" accept="video/*" style={{ display: 'none' }}
            onChange={(e) => { setFile(e.target.files[0]); setFileType('video') }} />

          <label htmlFor="audioInput"><FaFileUpload /> Audio</label>
          <input id="audioInput" type="file" accept="audio/*" style={{ display: 'none' }}
            onChange={(e) => { setFile(e.target.files[0]); setFileType('audio') }} />

          <button type="submit">🚀 Upload</button>
        </div>
      </form>

      <section className="media-gallery">
        {filteredFiles.length === 0 ? (
          <h3>No Files Found 😐</h3>
        ) : (
          filteredFiles.map((blobItem, index) => {
            const type = getFileType(blobItem.type)
            return (
              <div key={index} className="media-card">
                {type === 'image' && <img src={blobItem.url} alt="media" />}
                {type === 'video' && <video src={blobItem.url} controls />}
                {type === 'audio' && <audio src={blobItem.url} controls />}
                <p>{getFileNameWithoutExtension(blobItem.name)}</p>
                <div className="actions">
                  <a href={blobItem.url} download target="_blank" rel="noreferrer">Download</a>
                  <button onClick={() => handleDelete(blobItem.name)}><AiFillDelete /></button>
                </div>
              </div>
            )
          })
        )}
      </section>
    </div>
  )
}

export default App
