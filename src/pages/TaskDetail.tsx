// src/pages/TaskDetail.tsx
import { useParams } from 'react-router-dom';
import TaskDetailContent from '../components/TaskDetailContent';

function TaskDetail() {
  const { id } = useParams<{ id: string }>();

  if (!id) return <div className="p-8 text-center text-gray-700">ID de tarea no proporcionado.</div>;
  return <TaskDetailContent taskId={id} />;
}

export default TaskDetail;

