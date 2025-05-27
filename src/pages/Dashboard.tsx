import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Task } from '../types';
import supabase from '../config/supabaseClient';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function Dashboard() {
  const { currentUser } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      if (!currentUser) return;
      try {
        let query = supabase.from('tasks').select('*');
        if (currentUser.role !== 'admin') {
          query = query.eq('assigned_user_auth_id', currentUser.id);
        }
        const { data, error } = await query;
        if (error) throw new Error('Error al obtener tareas');
        setTasks(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching tasks');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, [currentUser]);

  if (!currentUser) {
    return <p className="p-8 text-center">Please log in.</p>;
  }

  if (isLoading) {
    return <div className="p-8 text-center">Loading dashboard data...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-600">Error: {error}</div>;
  }

  // Prepare data for non-admin users
  const prepareUserTasksData = () => {
    const statusCounts = {
      'Pending': 0,
      'In Progress': 0,
      'Completed': 0
    };

    tasks.forEach(task => {
      if (task.status) {
        statusCounts[task.status as keyof typeof statusCounts] = 
          (statusCounts[task.status as keyof typeof statusCounts] || 0) + 1;
      }
    });

    return {
      labels: Object.keys(statusCounts),
      datasets: [
        {
          label: 'Number of Tasks',
          data: Object.values(statusCounts),
          backgroundColor: [
            'rgba(255, 159, 64, 0.7)',  // Orange for Pending
            'rgba(54, 162, 235, 0.7)',   // Blue for In Progress
            'rgba(75, 192, 192, 0.7)',   // Teal for Completed
          ],
          borderColor: [
            'rgb(255, 159, 64)',
            'rgb(54, 162, 235)',
            'rgb(75, 192, 192)',
          ],
          borderWidth: 1,
        },
      ],
    };
  };

  // Prepare data for admin users
  const prepareAdminTasksData = () => {
    const storeStatusCounts: Record<string, Record<string, number>> = {};

    tasks.forEach(task => {
      if (!task.stores || !task.status) return;

      task.stores.forEach(store => {
        if (!storeStatusCounts[store]) {
          storeStatusCounts[store] = {
            'Pending': 0,
            'In Progress': 0,
            'Completed': 0
          };
        }

        storeStatusCounts[store][task.status] =
          (storeStatusCounts[store][task.status] || 0) + 1;
      });
    });

    const stores = Object.keys(storeStatusCounts);
    const statuses = ['Pending', 'In Progress', 'Completed'];

    return {
      labels: stores,
      datasets: statuses.map((status, index) => ({
        label: status,
        data: stores.map(store => storeStatusCounts[store][status]),
        backgroundColor: [
          'rgba(255, 159, 64, 0.7)',  // Orange for Pending
          'rgba(54, 162, 235, 0.7)',   // Blue for In Progress
          'rgba(75, 192, 192, 0.7)',   // Teal for Completed
        ][index],
        borderColor: [
          'rgb(255, 159, 64)',
          'rgb(54, 162, 235)',
          'rgb(75, 192, 192)',
        ][index],
        borderWidth: 1,
      })),
    };
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: currentUser.role === 'admin' ? 'Tasks by Store and Status' : 'Your Tasks by Status',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Welcome, {currentUser.name}</h1>
        <p className="text-gray-600">Store: {currentUser.store}</p>
        <p className="text-gray-500 text-sm">Role: {currentUser.role}</p>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
        <div className="w-full h-[400px]">
          <Bar 
            options={options} 
            data={currentUser.role === 'admin' ? prepareAdminTasksData() : prepareUserTasksData()} 
          />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Total Tasks</h3>
          <p className="text-3xl font-bold text-indigo-600">{tasks.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Pending Tasks</h3>
          <p className="text-3xl font-bold text-orange-500">
            {tasks.filter(t => t.status === 'Pending').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Completed Tasks</h3>
          <p className="text-3xl font-bold text-teal-500">
            {tasks.filter(t => t.status === 'Completed').length}
          </p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;