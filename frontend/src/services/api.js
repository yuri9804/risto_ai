/**
 * API Service - Centralized API calls for Risto AI
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.status = status
    this.data = data
    this.name = 'ApiError'
  }
}

// Get auth token from localStorage
function getAuthToken() {
  return localStorage.getItem('auth_token')
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`

  const token = getAuthToken()
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  }

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body)
  }

  try {
    const response = await fetch(url, config)
    const data = await response.json().catch(() => null)

    if (!response.ok) {
      // Handle 401 unauthorized - clear token and redirect
      if (response.status === 401) {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
        // Only redirect if not already on auth pages
        if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
          window.location.href = '/login'
        }
      }
      throw new ApiError(
        data?.detail || `HTTP error ${response.status}`,
        response.status,
        data
      )
    }

    return data
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(error.message, 0, null)
  }
}

// Auth API
export const authApi = {
  register: (data) =>
    request('/auth/register', {
      method: 'POST',
      body: data,
    }),

  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),

  logout: () =>
    request('/auth/logout', { method: 'POST' }),

  getProfile: () =>
    request('/auth/me'),

  updateProfile: (nome_ristorante) =>
    request(`/auth/me?nome_ristorante=${encodeURIComponent(nome_ristorante)}`, {
      method: 'PUT',
    }),
}

// Menu API
export const menuApi = {
  analyze: (startDate, endDate) =>
    request('/menu/analyze', {
      method: 'POST',
      body: { start_date: startDate, end_date: endDate },
    }),

  getMarketingRecommendations: (campaignType, maxItems = 3) =>
    request(`/menu/recommendations/marketing?campaign_type=${campaignType}&max_items=${maxItems}`),

  getEngineeringHistory: (menuItemId, limit = 30) => {
    const params = new URLSearchParams({ limit })
    if (menuItemId) params.append('menu_item_id', menuItemId)
    return request(`/menu/engineering/history?${params}`)
  },
}

// Customers API
export const customersApi = {
  getCustomer: (customerId) =>
    request(`/customers/${customerId}`),

  createCustomer: (data) =>
    request('/customers/', {
      method: 'POST',
      body: data,
    }),

  runSegmentation: () =>
    request('/customers/segmentation/run', { method: 'POST' }),

  getSegmentsSummary: () =>
    request('/customers/segments/summary'),

  getTargetableCustomers: (segmentTypes, excludeRecent = true, maxCustomers = 100) => {
    const params = new URLSearchParams({
      exclude_recent: excludeRecent,
      max_customers: maxCustomers,
    })
    if (segmentTypes) params.append('segment_types', segmentTypes)
    return request(`/customers/targetable?${params}`)
  },

  list: () =>
    request('/customers/targetable?max_customers=500'),
}

// Reservations API
export const reservationsApi = {
  checkAvailability: (date, partySize, preferredTime) => {
    const params = new URLSearchParams({
      date,
      party_size: partySize,
    })
    if (preferredTime) params.append('preferred_time', preferredTime)
    return request(`/reservations/availability?${params}`)
  },

  create: (data) =>
    request('/reservations/', {
      method: 'POST',
      body: data,
    }),

  getByCode: (confirmationCode) =>
    request(`/reservations/${confirmationCode}`),

  confirm: (confirmationCode) =>
    request(`/reservations/${confirmationCode}/confirm`, { method: 'POST' }),

  cancel: (confirmationCode, reason) =>
    request(`/reservations/${confirmationCode}/cancel?reason=${encodeURIComponent(reason || '')}`, {
      method: 'POST',
    }),

  checkIn: (confirmationCode) =>
    request(`/reservations/${confirmationCode}/check-in`, { method: 'POST' }),

  complete: (confirmationCode) =>
    request(`/reservations/${confirmationCode}/complete`, { method: 'POST' }),

  getByDate: (date, status) => {
    const params = new URLSearchParams()
    if (status) params.append('status', status)
    const query = params.toString() ? `?${params}` : ''
    return request(`/reservations/date/${date}${query}`)
  },

  getDailyCapacity: (date) =>
    request(`/reservations/capacity/${date}`),
}

// Marketing API
export const marketingApi = {
  generateCampaignPlan: (targetDate, dayClassification) =>
    request('/marketing/campaigns/plan', {
      method: 'POST',
      body: { target_date: targetDate, day_classification: dayClassification },
    }),

  createCampaign: (targetDate, name, dayClassification) =>
    request('/marketing/campaigns', {
      method: 'POST',
      body: { target_date: targetDate, name, day_classification: dayClassification },
    }),

  executeCampaign: (campaignId) =>
    request(`/marketing/campaigns/${campaignId}/execute`, { method: 'POST' }),

  getCampaignPerformance: (campaignId) =>
    request(`/marketing/campaigns/${campaignId}/performance`),

  listCampaigns: (status, limit = 20) => {
    const params = new URLSearchParams({ limit })
    if (status) params.append('status', status)
    return request(`/marketing/campaigns?${params}`)
  },

  getPendingDeliveries: (limit = 100) =>
    request(`/marketing/deliveries/pending?limit=${limit}`),

  updateDeliveryStatus: (deliveryId, status, externalId, errorMessage) =>
    request(`/marketing/deliveries/${deliveryId}/status?status=${status}`, {
      method: 'POST',
    }),

  recordConversion: (deliveryId, reservationId, orderId) =>
    request(`/marketing/deliveries/${deliveryId}/conversion`, {
      method: 'POST',
      body: { reservation_id: reservationId, order_id: orderId },
    }),
}

// Predictions API
export const predictionsApi = {
  generate: (startDate, days = 14, includeHourly = true) =>
    request('/predictions/generate', {
      method: 'POST',
      body: { start_date: startDate, days, include_hourly: includeHourly },
    }),

  getDayAnalysis: (targetDate) =>
    request(`/predictions/day/${targetDate}`),

  trainModel: (minHistoryDays = 90) =>
    request('/predictions/model/train', {
      method: 'POST',
      body: { min_history_days: minHistoryDays },
    }),

  updateActuals: (targetDate) =>
    request(`/predictions/actuals/${targetDate}`, { method: 'POST' }),

  getHistory: (startDate, endDate, limit = 30) => {
    const params = new URLSearchParams({ limit })
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    return request(`/predictions/history?${params}`)
  },

  getAccuracy: (days = 30) =>
    request(`/predictions/accuracy?days=${days}`),
}

// Staff API
export const staffApi = {
  list: (activeOnly = true, role) => {
    const params = new URLSearchParams({ active_only: activeOnly })
    if (role) params.append('role', role)
    return request(`/staff/?${params}`)
  },

  getRequirements: (targetDate) =>
    request(`/staff/requirements/${targetDate}`),

  getSuggestions: (targetDate, shiftId) => {
    const params = shiftId ? `?shift_id=${shiftId}` : ''
    return request(`/staff/suggestions/${targetDate}${params}`)
  },

  autoSchedule: (startDate, endDate) =>
    request('/staff/auto-schedule', {
      method: 'POST',
      body: { start_date: startDate, end_date: endDate },
    }),

  assignStaff: (staffId, shiftId, assignmentDate) =>
    request('/staff/assign', {
      method: 'POST',
      body: { staff_id: staffId, shift_id: shiftId, assignment_date: assignmentDate },
    }),

  getDailyRoster: (targetDate) =>
    request(`/staff/roster/${targetDate}`),

  getStaffSchedule: (staffId, startDate, endDate) => {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    return request(`/staff/${staffId}/schedule?${params}`)
  },

  updatePreference: (staffId, preference) =>
    request(`/staff/${staffId}/preferences`, {
      method: 'PUT',
      body: preference,
    }),

  clockIn: (assignmentId) =>
    request(`/staff/assignments/${assignmentId}/clock-in`, { method: 'POST' }),

  clockOut: (assignmentId) =>
    request(`/staff/assignments/${assignmentId}/clock-out`, { method: 'POST' }),
}

// Dashboard API (aggregated data)
export const dashboardApi = {
  async getOverview() {
    const today = new Date().toISOString().split('T')[0]

    try {
      const [
        todayReservations,
        dailyCapacity,
        predictions,
        segmentsSummary,
      ] = await Promise.allSettled([
        reservationsApi.getByDate(today),
        reservationsApi.getDailyCapacity(today),
        predictionsApi.generate(today, 7, true),
        customersApi.getSegmentsSummary(),
      ])

      return {
        reservations: todayReservations.status === 'fulfilled' ? todayReservations.value : [],
        capacity: dailyCapacity.status === 'fulfilled' ? dailyCapacity.value : null,
        predictions: predictions.status === 'fulfilled' ? predictions.value : [],
        segments: segmentsSummary.status === 'fulfilled' ? segmentsSummary.value : [],
      }
    } catch (error) {
      console.error('Dashboard overview error:', error)
      throw error
    }
  },
}

export { ApiError }
export default {
  auth: authApi,
  menu: menuApi,
  customers: customersApi,
  reservations: reservationsApi,
  marketing: marketingApi,
  predictions: predictionsApi,
  staff: staffApi,
  dashboard: dashboardApi,
}
