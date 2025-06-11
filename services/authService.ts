import axios from 'axios';

const API_URL = 'https://atomm-57b7d9183bae.herokuapp.com/api';

type GuestLoginResponse = {
  success: boolean;
  message: string;
  token: string;
  userId: string;
  username: string;
};

export const loginAsGuest = async (): Promise<GuestLoginResponse> => {
  try {
    const response = await axios.post<GuestLoginResponse>(`${API_URL}/login-as-guest`);
    
    // Configure axios defaults with the token for future requests
    axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
    
    return response.data;
  } catch (error) {
    console.error('Guest login error:', error);
    throw error;
  }
};

// Add function to fetch dashboard data (to be implemented)
export const fetchDashboardData = async () => {
  try {
    const response = await axios.get(`${API_URL}/dashboard`);
    return response.data;
  } catch (error) {
    console.error('Dashboard data fetch error:', error);
    throw error;
  }
};