import axios from 'axios';

const API_URL = 'https://atomm-57b7d9183bae.herokuapp.com/api';

type GuestLoginResponse = {
  success: boolean;
  message: string;
  token: string;
  userId: string;
  username: string;
};

export async function loginAsGuest(): Promise<GuestLoginResponse> {
  try {
    const response = await fetch('https://atomm-57b7d9183bae.herokuapp.com/api/login-as-guest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    if (data.success) {
      return {
        success: true,
        message: data.message,
        token: data.token,
        userId: data.userId,
        username: data.username || 'Guest',
      };
    } else {
      return {
        success: false,
        message: data.message || 'Guest login failed',
        token: '',
        userId: '',
        username: '',
      };
    }
  } catch (error) {
    return {
      success: false,
      message: 'Guest login failed',
      token: '',
      userId: '',
      username: '',
    };
  }
}

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