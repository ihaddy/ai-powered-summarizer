import { useState, useCallback } from 'react';
import axios from 'axios';
import useUserStore from './userStore'; // Adjust the path as needed
import { BASE_URL, SECURE_TOKEN } from './buildvars'; // Adjust the path as needed

const useHttp = () => {
  const jwtToken = useUserStore(state => state.jwtToken); // Directly using jwtToken
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendRequest = useCallback(async ({ url, method = 'GET', body = null, headers = {} }) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios({
        method: method,
        url: `${BASE_URL}${url}`,
        data: body,
        headers: {
          'Content-Type': 'application/json',
          'securetoken': SECURE_TOKEN,
          'Authorization': jwtToken ? `Bearer ${jwtToken}` : '',
          ...headers
        }
      });

      setIsLoading(false);
      return response.data;
    } catch (err) {
      setError(err.message || 'Something went wrong!');
      setIsLoading(false);
      throw err;
    }
  }, [jwtToken]);

  return { isLoading, error, sendRequest };
};

export default useHttp;
