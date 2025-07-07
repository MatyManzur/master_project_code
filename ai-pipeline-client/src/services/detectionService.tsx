import axios from 'axios'

const API_URL = 'http://localhost:8000'

const PREDICTION_ENDPOINT = `${API_URL}/prediction`

export const postDetectionPrediction = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  const res = await axios.post(PREDICTION_ENDPOINT, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export const pollDetectionPredictionResult = async (prediction_id: string) => {
  let status = 'pending'
  let result
  while (status === 'pending') {
    await new Promise((res) => setTimeout(res, 1000))
    const response = await axios.get(`${PREDICTION_ENDPOINT}/${prediction_id}`)
    result = response.data
    status = result.status
  }
  return result
}