import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const Charts = ({ data, type }) => {
  const chartData = {
    labels: data?.map(item => item.label) || [],
    datasets: [{
      label: type,
      data: data?.map(item => item.value) || [],
      backgroundColor: [
        'rgba(255, 99, 132, 0.2)',
        'rgba(54, 162, 235, 0.2)',
        'rgba(255, 206, 86, 0.2)',
        'rgba(75, 192, 192, 0.2)',
        'rgba(153, 102, 255, 0.2)',
      ],
      borderColor: [
        'rgba(255, 99, 132, 1)',
        'rgba(54, 162, 235, 1)',
        'rgba(255, 206, 86, 1)',
        'rgba(75, 192, 192, 1)',
        'rgba(153, 102, 255, 1)',
      ],
      borderWidth: 1,
    }]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `${type} Chart`,
      },
    },
  };

  return (
    <div className="chart-container">
      <Bar data={chartData} options={options} />
    </div>
  );
};

export const BarChart = ({ data, labels, title }) => {
  const chartData = {
    labels: labels || [],
    datasets: [{
      label: title || 'Data',
      data: data || [],
      backgroundColor: 'rgba(54, 162, 235, 0.2)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1,
    }]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: title || 'Bar Chart',
      },
    },
  };

  return (
    <div className="bar-chart">
      <Bar data={chartData} options={options} />
    </div>
  );
};

export const LineChart = ({ data, labels, title, maxValue }) => {
  const chartData = {
    labels: labels || [],
    datasets: [{
      label: title || 'Growth Data',
      data: data || [],
      borderColor: 'rgba(75, 192, 192, 1)',
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
      tension: 0.1,
      fill: true,
    }]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: title || 'Growth Tracking',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ...(maxValue !== undefined ? { max: maxValue } : {}),
      },
    },
  };

  return (
    <div className="line-chart">
      <Line data={chartData} options={options} />
    </div>
  );
};

export const PieChart = ({ data, labels, title }) => {
  const chartData = {
    labels: labels || [],
    datasets: [{
      data: data || [],
      backgroundColor: [
        'rgba(255, 99, 132, 0.2)',
        'rgba(54, 162, 235, 0.2)',
        'rgba(255, 206, 86, 0.2)',
        'rgba(75, 192, 192, 0.2)',
        'rgba(153, 102, 255, 0.2)',
      ],
      borderColor: [
        'rgba(255, 99, 132, 1)',
        'rgba(54, 162, 235, 1)',
        'rgba(255, 206, 86, 1)',
        'rgba(75, 192, 192, 1)',
        'rgba(153, 102, 255, 1)',
      ],
      borderWidth: 1,
    }]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right',
      },
      title: {
        display: true,
        text: title || 'Distribution',
      },
    },
  };

  return (
    <div className="pie-chart">
      <Pie data={chartData} options={options} />
    </div>
  );
};

export default Charts;
