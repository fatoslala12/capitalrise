import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import axios from "axios";

export default function TodoList({ isAdminView = false }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  // Ngarko detyrat nga backend
  useEffect(() => {
    if (!user) return;
    axios
      .get(`https://capitalrise-cwcq.onrender.com/api/todos?user=${user.email}`, { headers })
      .then((res) => setTasks(res.data || []))
      .catch(() => setTasks([]));
  }, [user]);

  // Shto detyrë të re
  const handleAdd = async () => {
    if (!newTask.trim()) return;
    try {
      const res = await axios.post(
        "https://capitalrise-cwcq.onrender.com/api/todos",
        { user: user.email, text: newTask.trim() },
        { headers }
      );
      setTasks([...tasks, res.data]);
      setNewTask("");
    } catch {
      alert("Gabim gjatë shtimit të detyrës!");
    }
  };

  // Fshi detyrë
  const handleDelete = async (id) => {
    try {
      await axios.delete(`https://capitalrise-cwcq.onrender.com/api/todos/${id}`, { headers });
      setTasks(tasks.filter((t) => t._id !== id));
    } catch {
      alert("Gabim gjatë fshirjes së detyrës!");
    }
  };

  return (
    <div className="bg-white p-4 rounded shadow mt-6">
      <h3 className="text-xl font-bold mb-4">📋 Detyrat (To-Do)</h3>

      {isAdminView && (
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Shto detyrë të re..."
            className="border p-2 flex-1 rounded"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
          />
          <button
            onClick={handleAdd}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            ➕
          </button>
        </div>
      )}

      {tasks.length === 0 ? (
        <p className="text-gray-500 italic">Nuk ka detyra për tani.</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li
              key={task._id}
              className="flex justify-between items-center bg-gray-100 p-2 rounded"
            >
              <span>{task.text}</span>
              {isAdminView && (
                <button
                  onClick={() => handleDelete(task._id)}
                  className="text-red-500 hover:underline text-sm"
                >
                  Fshi
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
