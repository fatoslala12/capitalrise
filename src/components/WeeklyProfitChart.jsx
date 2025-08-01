import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../api';

const WeeklyProfitChart = () => {
  // const { t } = useTranslation();
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChartData();
  }, []);

  const fetchChartData = async () => {
    try {
      const response = await api.get('/api/business-intelligence/weekly-profit');
      setChartData(response.data);
    } catch (error) {
      console.error('Error fetching weekly profit data:', error);
      toast.error('Gabim gjatë marrjes së të dhënave të fitimit javor');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Fitimi Javor</h3>
        <p className="text-gray-500">Nuk ka të dhëna të disponueshme</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Fitimi Javor</h3>
      
      <div className="space-y-4">
        {chartData.map((week, index) => (
          <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-500 rounded-full mr-3"></div>
              <div>
                <p className="font-medium text-gray-900">{week.week}</p>
                <p className="text-sm text-gray-600">{week.period}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900">£{week.profit?.toFixed(2) || '0.00'}</p>
              <p className={`text-sm ${week.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {week.change >= 0 ? '+' : ''}{week.change?.toFixed(1) || '0'}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeeklyProfitChart; 