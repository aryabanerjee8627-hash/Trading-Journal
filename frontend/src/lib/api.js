const API_BASE_URL = 'https://trading-journal-api-lgkz.onrender.com'

// We will pass the clerk session object to these methods
export const api = {
  async getAuthHeaders(getToken) {
    const token = await getToken()
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  },

  async get(endpoint, getToken) {
    const headers = await this.getAuthHeaders(getToken)
    const response = await fetch(`${API_BASE_URL}${endpoint}`, { headers })
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`)
    return response.json()
  },

  async post(endpoint, data, getToken) {
    const headers = await this.getAuthHeaders(getToken)
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`)
    return response.json()
  },

  async put(endpoint, data, getToken) {
    const headers = await this.getAuthHeaders(getToken)
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`)
    return response.json()
  },

  async delete(endpoint, getToken) {
    const headers = await this.getAuthHeaders(getToken)
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers
    })
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`)
    return response.json()
  }
}
